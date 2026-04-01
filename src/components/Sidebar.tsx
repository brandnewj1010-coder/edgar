import { BarChart3, Globe2, History, Loader2, Search } from "lucide-react";
import type { DisclosureSource } from "../types";
import type { RecentItem } from "../lib/recentHistory";

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
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900">
              InsightAnalyzer
            </h1>
            <p className="text-[11px] text-slate-500">교육형 공시 AI 분석</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
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
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-500/0 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading || !query.trim()}
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
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

        <div className="mt-2 flex-1 overflow-hidden">
          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
            <History className="h-3.5 w-3.5" />
            최근 분석
            {supabaseConnected ? (
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-normal text-emerald-700">
                Supabase
              </span>
            ) : null}
          </div>
          <ul className="max-h-48 space-y-1 overflow-y-auto pr-1 text-xs">
            {recent.length === 0 ? (
              <li className="text-slate-400">기록이 없습니다.</li>
            ) : (
              recent.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onPickRecent(r)}
                    className="w-full rounded-md px-2 py-1.5 text-left text-slate-700 hover:bg-indigo-50"
                  >
                    <span className="font-mono text-[10px] text-indigo-600">
                      {r.source.toUpperCase()}
                    </span>{" "}
                    {r.query}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
          {supabaseConnected ? (
            <>
              <span className="font-medium text-emerald-700">Supabase</span>에
              검색 기록이 저장됩니다.
            </>
          ) : (
            <>
              Supabase를 쓰려면{" "}
              <code className="rounded bg-slate-100 px-0.5">VITE_SUPABASE_URL</code>{" "}
              ·{" "}
              <code className="rounded bg-slate-100 px-0.5">
                VITE_SUPABASE_ANON_KEY
              </code>
              를 Vercel 환경 변수에 넣고 재배포하세요.
            </>
          )}
        </p>
      </div>
    </aside>
  );
}
