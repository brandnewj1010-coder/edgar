import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { MarkdownReport } from "./components/MarkdownReport";
import { LearningSide } from "./components/LearningSide";
import { Sidebar } from "./components/Sidebar";
import { requestAnalyze } from "./lib/analyzeApi";
import {
  loadRecentList,
  loadReportById,
  saveReport,
  type RecentItem,
} from "./lib/analysisStorage";
import { isSupabaseConfigured } from "./lib/supabase";
import type { AnalyzeResponse, DisclosureSource } from "./types";
import { ReportDocument } from "./components/ReportDocument";

export default function App() {
  const [source, setSource] = useState<DisclosureSource>("dart");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [demoMode, setDemoMode] = useState(
    () => import.meta.env.VITE_USE_DEMO === "1",
  );

  useEffect(() => {
    void loadRecentList().then(setRecent);
  }, []);

  const run = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const data = await requestAnalyze(source, q, { demo: demoMode });
      setResult(data);
      await saveReport(data);
      setRecent(await loadRecentList());
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }, [query, source, demoMode]);

  const pickRecent = useCallback(async (r: RecentItem) => {
    setSource(r.source);
    setQuery(r.query);
    setError(null);
    setRestoring(true);
    try {
      const full = await loadReportById(r.id);
      if (full) {
        setResult(full);
      } else {
        setResult(null);
        setError("저장된 리포트를 불러오지 못했습니다.");
      }
    } finally {
      setRestoring(false);
    }
  }, []);

  return (
    <div className="flex min-h-screen min-h-[480px] flex-col bg-[#eceff5] md:flex-row">
      <Sidebar
        source={source}
        onSource={setSource}
        query={query}
        onQuery={setQuery}
        onSubmit={run}
        loading={loading}
        recent={recent}
        onPickRecent={pickRecent}
        demoMode={demoMode}
        onDemoMode={setDemoMode}
        supabaseConnected={isSupabaseConfigured()}
      />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col border-slate-200 bg-gradient-to-b from-slate-50/80 to-white md:border-r">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3.5 backdrop-blur-sm md:px-6">
          <div className="flex min-w-0 items-center gap-2.5 text-sm text-slate-600">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500">
                AI 공시 분석 리포트
              </p>
              <p className="truncate text-sm text-slate-800">
                Gemini 2.5 Flash · Search Grounding
                {result?.model ? (
                  <span className="ml-1.5 font-mono text-xs font-normal text-slate-400">
                    · {result.model}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          {error && (
            <div className="mx-auto mb-6 max-w-3xl rounded-2xl border border-rose-200/90 bg-rose-50/90 px-5 py-4 text-sm text-rose-800 shadow-sm">
              {error}
              {!demoMode && (
                <p className="mt-3 text-xs leading-relaxed text-rose-700/95">
                  로컬에서 API를 쓰려면{" "}
                  <code className="rounded-md bg-white/90 px-1.5 py-0.5 font-mono text-[11px]">
                    npx vercel dev
                  </code>{" "}
                  로 실행하거나, Vercel에 배포한 뒤 같은 도메인에서{" "}
                  <code className="rounded-md bg-white/90 px-1.5 py-0.5 font-mono text-[11px]">
                    /api/analyze
                  </code>
                  를 사용하세요.{" "}
                  <code className="rounded-md bg-white/90 px-1.5 py-0.5 font-mono text-[11px]">
                    GEMINI_API_KEY
                  </code>{" "}
                  환경 변수가 필요합니다.
                </p>
              )}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="mx-auto flex max-w-lg flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/90 bg-white/60 px-8 py-16 text-center shadow-sm">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <FileText className="h-7 w-7 opacity-90" />
              </div>
              <p className="text-base font-medium text-slate-800">
                분석 리포트가 여기에 표시됩니다
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                왼쪽에서 <span className="font-medium text-slate-700">DART</span>{" "}
                또는 <span className="font-medium text-slate-700">EDGAR</span>를
                고르고 검색어를 입력한 뒤 분석을 시작하세요. 본문 속 용어에 마우스를
                올리면 설명이 뜹니다.
              </p>
            </div>
          )}

          {loading && (
            <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-5 py-20">
              <Loader2
                className="h-11 w-11 animate-spin text-indigo-500"
                strokeWidth={2}
              />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-800">
                  리포트를 작성하는 중이에요
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  검색과 요약에 보통 30초~2분 정도 걸릴 수 있어요.
                </p>
              </div>
            </div>
          )}

          {result && !loading && (
            <div
              className={`mx-auto max-w-3xl transition-opacity duration-200 ${restoring ? "pointer-events-none opacity-60" : "opacity-100"}`}
            >
              {restoring ? (
                <p className="mb-3 text-center text-xs font-medium text-indigo-600">
                  저장된 리포트를 불러오는 중…
                </p>
              ) : null}
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-800">
                      {result.source === "dart" ? "DART" : "EDGAR"}
                    </span>
                    {result.model === "demo" ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                        데모
                      </span>
                    ) : null}
                  </div>
                  <h2 className="truncate text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
                    {result.query}
                  </h2>
                </div>
              </div>

              <ReportDocument>
                <MarkdownReport markdown={result.reportMarkdown} />
              </ReportDocument>
            </div>
          )}
        </div>
      </main>

      <aside className="hidden w-[min(100%,22rem)] shrink-0 overflow-hidden bg-ink-50 lg:block">
        <LearningSide
          reportMarkdown={result?.reportMarkdown ?? ""}
          quiz={result?.quiz ?? []}
          sources={result?.sources ?? []}
          groundingQueries={result?.groundingQueries ?? []}
        />
      </aside>

      {/* 모바일: 학습 패널을 하단 스택 */}
      <div className="border-t border-slate-200 bg-ink-50 lg:hidden">
        <LearningSide
          reportMarkdown={result?.reportMarkdown ?? ""}
          quiz={result?.quiz ?? []}
          sources={result?.sources ?? []}
          groundingQueries={result?.groundingQueries ?? []}
        />
      </div>
    </div>
  );
}
