import { useCallback, useEffect, useState, type ReactNode } from "react";
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
import { ReportActions } from "./components/ReportActions";
import { SankeyViz } from "./components/SankeyViz";
import { KrwAssistView } from "./components/KrwAssistView";

/** 오류 종류에 맞는 안내 (503·한도는 Vercel 키 안내와 혼동되지 않게) */
function analyzeErrorExtraHint(error: string, isLocalhost: boolean): ReactNode {
  const e = error;
  if (/503|UNAVAILABLE|high demand/i.test(e)) {
    return (
      <p>
        <strong className="text-rose-900">Google AI 일시 과부하(503)입니다.</strong>{" "}
        키가 잘못된 것이 아니라, 요청이 몰릴 때 나는 메시지예요.{" "}
        <strong>잠시 후 다시 시도</strong>해 보세요.
      </p>
    );
  }
  if (/429|RESOURCE_EXHAUSTED|quota|한도/i.test(e)) {
    return (
      <p>
        <strong className="text-rose-900">API 호출 한도에 걸렸을 수 있습니다.</strong>{" "}
        시간을 두고 재시도하거나, AI Studio에서 할당량·결제를 확인해 주세요.
      </p>
    );
  }
  if (isLocalhost) {
    return (
      <p>
        <strong className="text-rose-900">지금 주소가 localhost예요.</strong>{" "}
        Vercel에 넣은 키는 <strong>배포된 사이트</strong>에만 적용됩니다.
        로컬에서 쓰려면 프로젝트 폴더의{" "}
        <code className="rounded bg-white/90 px-1 font-mono text-[11px]">
          .env.local
        </code>{" "}
        에 <code className="font-mono text-[11px]">GEMINI_API_KEY</code>를 넣고{" "}
        <code className="rounded bg-white/90 px-1 font-mono text-[11px]">
          npm run dev:vercel
        </code>{" "}
        로 실행하세요. (또는 왼쪽 데모 모드)
      </p>
    );
  }
  return (
    <p>
      <strong className="text-rose-900">배포 사이트에서만 안 될 때:</strong>{" "}
      Vercel → 해당 프로젝트 → Settings → Environment Variables 에
      <code className="mx-0.5 rounded bg-white/90 px-1 font-mono text-[11px]">
        GEMINI_API_KEY
      </code>
      가 있는지 확인한 뒤, 꼭{" "}
      <strong>Deployments → 최신 배포 → Redeploy</strong> 해 주세요.
      변수를 나중에 넣으면 예전 빌드에는 키가 없을 수 있어요.
    </p>
  );
}

export default function App() {
  const [source, setSource] = useState<DisclosureSource>("dart");
  const [query, setQuery] = useState("");
  const [compareWith, setCompareWith] = useState("");
  const [fiscalYears, setFiscalYears] = useState<number[]>([]);
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
      const data = await requestAnalyze(source, q, {
        demo: demoMode,
        compareWith: compareWith.trim() || undefined,
        fiscalYears: fiscalYears.length ? fiscalYears : undefined,
      });
      setResult(data);
      await saveReport(data);
      setRecent(await loadRecentList());
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }, [query, source, demoMode, compareWith, fiscalYears]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run]);

  const pickRecent = useCallback(async (r: RecentItem) => {
    setSource(r.source);
    setQuery(r.query);
    setError(null);
    setRestoring(true);
    try {
      const full = await loadReportById(r.id);
      if (full) {
        setResult(full);
        setCompareWith(full.compareWith ?? "");
        setFiscalYears(full.fiscalYears ?? []);
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
        compareWith={compareWith}
        onCompareWith={setCompareWith}
        fiscalYears={fiscalYears}
        onToggleFiscalYear={(y) => {
          setFiscalYears((prev) =>
            prev.includes(y)
              ? prev.filter((x) => x !== y)
              : [...prev, y].sort((a, b) => a - b),
          );
        }}
        onSubmit={run}
        loading={loading}
        recent={recent}
        onPickRecent={pickRecent}
        demoMode={demoMode}
        onDemoMode={setDemoMode}
        supabaseConnected={isSupabaseConfigured()}
      />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col border-slate-200 bg-gradient-to-b from-slate-50/80 to-white md:border-r">
        <header className="no-print flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3.5 backdrop-blur-sm md:px-6">
          <div className="flex min-w-0 items-center gap-2.5 text-sm text-slate-600">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500">
                AI 공시 분석 리포트
              </p>
              <p className="truncate text-sm text-slate-800">
                Gemini Flash · Search Grounding
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
              <p className="whitespace-pre-wrap font-medium">{error}</p>
              {!demoMode && (
                <div className="mt-3 space-y-2 text-xs leading-relaxed text-rose-700/95">
                  {analyzeErrorExtraHint(
                    error,
                    typeof window !== "undefined" &&
                      (window.location.hostname === "localhost" ||
                        window.location.hostname === "127.0.0.1"),
                  )}
                </div>
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
                  검색·리포트·퀴즈·차트까지 한 번에 처리합니다. 네트워크에 따라
                  다르지만,{" "}
                  <span className="font-medium text-slate-600">
                    목표는 약 30초 이내
                  </span>
                  입니다. (API·검색 지연 시 더 걸릴 수 있어요)
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
                    {result.compareWith ? (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-900">
                        기업 비교
                      </span>
                    ) : null}
                    {result.fiscalYears?.length ? (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-900">
                        연도 {result.fiscalYears.join("·")}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="truncate text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
                    {result.query}
                  </h2>
                </div>
              </div>

              <ReportActions reportMarkdown={result.reportMarkdown} />

              <KrwAssistView reportMarkdown={result.reportMarkdown} />

              {result.sankey ? (
                <section className="mb-8 rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm md:p-5">
                  <h3 className="mb-1 text-sm font-semibold text-slate-900">
                    {result.sankey.title ?? "재무 흐름 (샌키)"}
                  </h3>
                  {result.sankey.unit ? (
                    <p className="mb-3 text-[11px] text-slate-500">
                      단위: {result.sankey.unit}
                    </p>
                  ) : (
                    <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
                      리포트·검색으로 추정한 구조입니다. 공시 원문과 다를 수
                      있습니다.
                    </p>
                  )}
                  <SankeyViz data={result.sankey} />
                </section>
              ) : null}

              <ReportDocument>
                <MarkdownReport markdown={result.reportMarkdown} />
              </ReportDocument>
            </div>
          )}
        </div>
      </main>

      <aside className="no-print hidden w-[min(100%,22rem)] shrink-0 overflow-hidden bg-ink-50 lg:block">
        <LearningSide
          reportMarkdown={result?.reportMarkdown ?? ""}
          quiz={result?.quiz ?? []}
          reflectionPrompts={result?.reflectionPrompts ?? []}
          sources={result?.sources ?? []}
          groundingQueries={result?.groundingQueries ?? []}
        />
      </aside>

      {/* 모바일: 학습 패널을 하단 스택 */}
      <div className="no-print border-t border-slate-200 bg-ink-50 lg:hidden">
        <LearningSide
          reportMarkdown={result?.reportMarkdown ?? ""}
          quiz={result?.quiz ?? []}
          reflectionPrompts={result?.reflectionPrompts ?? []}
          sources={result?.sources ?? []}
          groundingQueries={result?.groundingQueries ?? []}
        />
      </div>
    </div>
  );
}
