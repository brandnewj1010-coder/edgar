import { BarChart3, Globe2, History, Loader2, Search } from "lucide-react";
import type { DisclosureSource } from "../types";
import type { RecentItem } from "../lib/analysisStorage";

export function Sidebar({
  source,
  onSource,
  query,
  onQuery,
  onSubmit,
  loading,
  recent,
  onPickRecent,
  demoMode,
  onDemoMode,
  supabaseConnected,
}: {
  source: DisclosureSource;
  onSource: (s: DisclosureSource) => void;
  query: string;
  onQuery: (q: string) => void;
  onSubmit: () => void;
  loading: boolean;
  recent: RecentItem[];
  onPickRecent: (r: RecentItem) => void;
  demoMode: boolean;
  onDemoMode: (v: boolean) => void;
  /** VITE_SUPABASE_* 설정 시 true — 최근 기록이 클라우드와 동기화됩니다 */
  supabaseConnected: boolean;
}) {
  return (
    <aside className="flex h-full w-[min(100vw,20rem)] shrink-0 flex-col border-r border-slate-200/90 bg-white shadow-[4px_0_24px_-8px_rgba(15,23,42,0.08)] sm:w-80">
      <div className="border-b border-slate-100/90 bg-gradient-to-br from-white to-slate-50/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-md shadow-indigo-500/25">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              InsightAnalyzer
            </h1>
            <p className="text-[11px] text-slate-500">교육형 공시 AI 분석</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            공시 소스
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSource("dart")}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition ${
                source === "dart"
                  ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              DART
            </button>
            <button
              type="button"
              onClick={() => onSource("edgar")}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition ${
                source === "edgar"
                  ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <Globe2 className="h-3.5 w-3.5" />
              EDGAR
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="q"
            className="mb-1.5 block text-xs font-medium text-slate-600"
          >
            {source === "dart" ? "기업명 또는 6자리 종목코드" : "티커 (예: AAPL)"}
          </label>
          <div className="flex gap-2">
            <input
              id="q"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              placeholder={source === "dart" ? "예: 삼성전자, 005930" : "예: MSFT"}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/15"
            />
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading || !query.trim()}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 px-3.5 py-2.5 text-white shadow-md shadow-indigo-500/20 transition hover:from-indigo-500 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={demoMode}
            onChange={(e) => onDemoMode(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          데모 모드 (API 없이 UI만)
        </label>

        <div className="mt-1 flex-1 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/40 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <History className="h-3.5 w-3.5 text-indigo-500" />
            저장된 리포트
            {supabaseConnected ? (
              <span className="rounded-md bg-emerald-100/90 px-1.5 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-emerald-800">
                클라우드
              </span>
            ) : (
              <span className="rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-slate-600">
                이 기기
              </span>
            )}
          </div>
          <ul className="max-h-52 space-y-1.5 overflow-y-auto pr-0.5 text-[12px]">
            {recent.length === 0 ? (
              <li className="py-2 text-center text-[11px] leading-relaxed text-slate-400">
                분석을 한 번 돌리면
                <br />
                본문·퀴즈까지 여기 쌓여요.
              </li>
            ) : (
              recent.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onPickRecent(r)}
                    className="w-full rounded-xl border border-transparent bg-white px-2.5 py-2 text-left shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-semibold text-indigo-600">
                        {r.source.toUpperCase()}
                      </span>
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {new Date(r.at).toLocaleDateString("ko-KR", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-[12px] font-medium text-slate-800">
                      {r.query}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <p className="text-[10px] leading-relaxed text-slate-400">
          {supabaseConnected ? (
            <>
              <span className="font-medium text-emerald-700">Supabase</span>에
              리포트 전체가 저장됩니다.
            </>
          ) : (
            <>
              지금은 이 브라우저에만 리포트가 저장돼요. 여러 기기에서 보려면{" "}
              <code className="rounded bg-slate-100 px-0.5">VITE_SUPABASE_*</code>{" "}
              를 Vercel에 넣고 SQL 마이그레이션을 실행하세요.
            </>
          )}
        </p>
      </div>
    </aside>
  );
}
