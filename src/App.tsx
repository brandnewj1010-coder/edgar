import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FileText, Loader2, Sparkles, BookOpen, BarChart3 } from "lucide-react";
import { MarkdownReport } from "./components/MarkdownReport";
import { LearningSide } from "./components/LearningSide";
import { Sidebar } from "./components/Sidebar";
import { FinancialCharts } from "./components/FinancialCharts";
import { StudyPage } from "./components/StudyPage";
import { requestAnalyze } from "./lib/analyzeApi";
import {
  loadRecentList,
  loadReportById,
  saveReport,
  type RecentItem,
} from "./lib/analysisStorage";
import { isSupabaseConfigured } from "./lib/supabase";
import type { AnalyzeResponse, DisclosureSource, QuizItem } from "./types";
import { ReportDocument } from "./components/ReportDocument";
import { ReportActions } from "./components/ReportActions";

type PageView = "report" | "study";

function analyzeErrorExtraHint(error: string, isLocalhost: boolean): ReactNode {
  const e = error;
  if (/FUNCTION_INVOCATION_FAILED|FUNCTION_INVOCATION_TIMEOUT/i.test(e)) {
    return (
      <p>
        <strong className="text-rose-900">Vercel 서버 함수가 실행 중에 종료되었습니다.</strong>{" "}
        메모리·시간 초과·배포 오류일 수 있어요. Vercel → 해당 배포 →{" "}
        <strong>Functions / Runtime Logs</strong>를 확인하고, 최신 커밋이 배포됐는지도 봐 주세요.
      </p>
    );
  }
  if (/\b503\b|UNAVAILABLE|high demand|overloaded/i.test(e) && !/FUNCTION_INVOCATION/i.test(e)) {
    return (
      <p>
        <strong className="text-rose-900">AI 서비스 일시 과부하(503)일 수 있습니다.</strong>{" "}
        잠시 후 다시 시도해 보세요.
      </p>
    );
  }
  if (/429|RESOURCE_EXHAUSTED|quota|한도|rate limit/i.test(e)) {
    return (
      <p>
        <strong className="text-rose-900">API 호출 한도에 걸렸을 수 있습니다.</strong>{" "}
        시간을 두고 재시도하거나 OpenAI 대시보드에서 확인해 주세요.
      </p>
    );
  }
  if (isLocalhost) {
    return (
      <p>
        <strong className="text-rose-900">localhost입니다.</strong>{" "}
        <code className="rounded bg-white/90 px-1 font-mono text-[11px]">.env.local</code>에{" "}
        <code className="font-mono text-[11px]">OPENAI_API_KEY</code> 후{" "}
        <code className="rounded bg-white/90 px-1 font-mono text-[11px]">npm run dev:vercel</code>
        , 또는 데모 모드.
      </p>
    );
  }
  return (
    <p>
      <strong className="text-rose-900">배포에서만 실패할 때:</strong> Vercel 환경 변수{" "}
      <code className="font-mono text-[11px]">OPENAI_API_KEY</code> 확인 후{" "}
      <strong>Redeploy</strong>.
    </p>
  );
}

export default function App() {
  const [page, setPage] = useState<PageView>("report");
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
  // 스터디 페이지로 넘길 퀴즈
  const [pendingQuiz, setPendingQuiz] = useState<{
    source: DisclosureSource;
    query: string;
    questions: QuizItem[];
  } | null>(null);

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

      // 퀴즈가 있으면 스터디 페이지에 전달할 pending 저장
      if (data.quiz && data.quiz.length > 0) {
        setPendingQuiz({ source: data.source, query: data.query, questions: data.quiz });
      }
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }, [query, source, demoMode]);

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
        setPage("report");
      } else {
        setResult(null);
        setError("저장된 리포트를 불러오지 못했습니다.");
      }
    } finally {
      setRestoring(false);
    }
  }, []);

  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  return (
    <div className="flex min-h-screen flex-col bg-[#eceff5] md:flex-row">
      {/* 사이드바 (리포트 페이지에서만 표시) */}
      {page === "report" && (
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
      )}

      {/* 메인 영역 */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col border-slate-200 bg-gradient-to-b from-slate-50/80 to-white md:border-r">
        {/* 상단 헤더 */}
        <header className="no-print flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3.5 backdrop-blur-sm md:px-6">
          <div className="flex min-w-0 items-center gap-2.5 text-sm text-slate-600">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500">
                HR 재무공시 스터디 플랫폼
              </p>
              <p className="truncate text-sm text-slate-800">
                OpenAI · DART · EDGAR
                {result?.model && page === "report" ? (
                  <span className="ml-1.5 font-mono text-xs font-normal text-slate-400">
                    · {result.model}
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          {/* 페이지 탭 */}
          <nav className="no-print flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setPage("report")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                page === "report"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              리포트
            </button>
            <button
              onClick={() => setPage("study")}
              className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                page === "study"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              스터디
              {pendingQuiz && page !== "study" && (
                <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-indigo-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              )}
            </button>
          </nav>
        </header>

        {/* 콘텐츠 영역 */}
        {page === "study" ? (
          <StudyPage
            pendingQuiz={pendingQuiz}
            onClearPending={() => setPendingQuiz(null)}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
            {/* 에러 */}
            {error && (
              <div className="mx-auto mb-6 max-w-3xl rounded-2xl border border-rose-200/90 bg-rose-50/90 px-5 py-4 text-sm text-rose-800 shadow-sm">
                <p className="whitespace-pre-wrap font-medium">{error}</p>
                {!demoMode && (
                  <div className="mt-3 text-xs leading-relaxed text-rose-700/95">
                    {analyzeErrorExtraHint(error, isLocalhost)}
                  </div>
                )}
              </div>
            )}

            {/* 빈 화면 */}
            {!result && !loading && !error && (
              <div className="mx-auto flex max-w-lg flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/90 bg-white/60 px-8 py-16 text-center shadow-sm">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <FileText className="h-7 w-7 opacity-90" />
                </div>
                <p className="text-base font-medium text-slate-800">여기에 해설이 표시됩니다</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  <span className="font-medium text-slate-700">DART</span> 또는{" "}
                  <span className="font-medium text-slate-700">EDGAR</span>를 고르고 기업·티커를
                  넣은 뒤 검색하세요. 본문 속 용어에 마우스를 올리면 설명이 뜹니다.
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  EDGAR 예: AAPL, MSFT, TSLA | DART 예: 삼성전자, 005930
                </p>
              </div>
            )}

            {/* 로딩 */}
            {loading && (
              <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-5 py-20">
                <Loader2 className="h-11 w-11 animate-spin text-indigo-500" strokeWidth={2} />
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-800">
                    공시 데이터 분석 중이에요
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                    DART/EDGAR 데이터 수집 + AI 해설 + 퀴즈 생성까지 약 15~45초 소요됩니다.
                  </p>
                </div>
              </div>
            )}

            {/* 리포트 */}
            {result && !loading && (
              <div
                className={`mx-auto max-w-3xl transition-opacity duration-200 ${restoring ? "pointer-events-none opacity-60" : "opacity-100"}`}
              >
                {restoring && (
                  <p className="mb-3 text-center text-xs font-medium text-indigo-600">
                    불러오는 중…
                  </p>
                )}

                {/* 제목 영역 */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-800">
                        {result.source === "dart" ? "DART" : "EDGAR"}
                      </span>
                      {result.model === "demo" && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          데모
                        </span>
                      )}
                      {result.quiz && result.quiz.length > 0 && (
                        <button
                          onClick={() => setPage("study")}
                          className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-200"
                        >
                          <BookOpen className="h-3 w-3" />
                          퀴즈 {result.quiz.length}문제 생성됨 →
                        </button>
                      )}
                    </div>
                    <h2 className="truncate text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
                      {result.query}
                    </h2>
                  </div>
                </div>

                <ReportActions reportMarkdown={result.reportMarkdown} />

                {/* 차트 (chartData가 있을 때) */}
                {result.chartData && (
                  <FinancialCharts chartData={result.chartData} />
                )}

                {/* 리포트 본문 */}
                <div className="mt-6">
                  <ReportDocument>
                    <MarkdownReport markdown={result.reportMarkdown} />
                  </ReportDocument>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 학습 사이드바 (리포트 페이지에서만) */}
      {page === "report" && (
        <>
          <aside className="no-print hidden w-[min(100%,22rem)] shrink-0 overflow-hidden bg-ink-50 lg:block">
            <LearningSide
              reportMarkdown={result?.reportMarkdown ?? ""}
              sources={result?.sources ?? []}
              groundingQueries={result?.groundingQueries ?? []}
            />
          </aside>
          <div className="no-print border-t border-slate-200 bg-ink-50 lg:hidden">
            <LearningSide
              reportMarkdown={result?.reportMarkdown ?? ""}
              sources={result?.sources ?? []}
              groundingQueries={result?.groundingQueries ?? []}
            />
          </div>
        </>
      )}
    </div>
  );
}
