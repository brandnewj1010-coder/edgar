import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { MarkdownReport } from "./components/MarkdownReport";
import { LearningSide } from "./components/LearningSide";
import { Sidebar } from "./components/Sidebar";
import { requestAnalyze } from "./lib/analyzeApi";
import type { RecentItem } from "./lib/recentHistory";
import { loadRecent, pushRecent } from "./lib/recentHistory";
import { isSupabaseConfigured } from "./lib/supabase";
import type { AnalyzeResponse, DisclosureSource } from "./types";

export default function App() {
  const [source, setSource] = useState<DisclosureSource>("dart");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [demoMode, setDemoMode] = useState(
    () => import.meta.env.VITE_USE_DEMO === "1",
  );

  useEffect(() => {
    void loadRecent().then(setRecent);
  }, []);

  const run = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const data = await requestAnalyze(source, q, { demo: demoMode });
      setResult(data);
      await pushRecent({ source, query: q });
      setRecent(await loadRecent());
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }, [query, source, demoMode]);

  const pickRecent = useCallback((r: { source: DisclosureSource; query: string }) => {
    setSource(r.source);
    setQuery(r.query);
  }, []);

  return (
    <div className="flex min-h-screen min-h-[480px] flex-col bg-ink-50 md:flex-row">
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

      <main className="flex min-h-0 min-w-0 flex-1 flex-col border-slate-200 bg-white md:border-r">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>
              Gemini 2.5 Flash · Google Search Grounding ·{" "}
              {result?.model ? (
                <span className="font-mono text-xs text-slate-500">
                  {result.model}
                </span>
              ) : (
                "분석 대기 중"
              )}
            </span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
              {!demoMode && (
                <p className="mt-2 text-xs text-rose-700">
                  로컬에서 API를 쓰려면{" "}
                  <code className="rounded bg-white/80 px-1">npx vercel dev</code>
                  로 실행하거나, Vercel에 배포한 뒤 같은 도메인에서{" "}
                  <code className="rounded bg-white/80 px-1">/api/analyze</code>를
                  사용하세요. <code className="rounded bg-white/80 px-1">
                    GEMINI_API_KEY
                  </code>{" "}
                  환경 변수가 필요합니다.
                </p>
              )}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
              <p className="max-w-md text-sm leading-relaxed">
                왼쪽에서 <strong className="text-slate-700">DART</strong> 또는{" "}
                <strong className="text-slate-700">EDGAR</strong>를 선택하고
                검색어를 입력한 뒤 분석을 시작하세요. 용어에 마우스를 올리면
                사전형 툴팁이 표시됩니다.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-16 text-sm text-slate-500">
              분석 중입니다… (검색·요약에 30초~2분 걸릴 수 있습니다)
            </div>
          )}

          {result && !loading && (
            <MarkdownReport markdown={result.reportMarkdown} />
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
