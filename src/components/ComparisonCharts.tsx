import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from "recharts";
import { GitCompare } from "lucide-react";
import type { FinancialChartData } from "../types";

interface Props {
  main: FinancialChartData;
  compare: FinancialChartData;
}

function normalizeToBaegmanwon(v: number): number {
  return Math.abs(v) > 10_000_000_000 ? v / 1_000_000 : v;
}

function fmtShort(v: number | null, unit: string): string {
  if (v === null || v === undefined) return "—";
  if (unit === "USD") {
    const abs = Math.abs(v);
    if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    return `$${v.toLocaleString()}`;
  }
  const n = normalizeToBaegmanwon(v);
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}${(Math.abs(n) / 1_000_000).toFixed(1)}조`;
  if (abs >= 10_000)    return `${sign}${Math.round(Math.abs(n) / 10_000).toLocaleString()}억`;
  return `${sign}${Math.round(Math.abs(n)).toLocaleString()}백만`;
}

function formatYAxis(v: number, unit: string): string {
  if (unit === "USD") {
    const abs = Math.abs(v);
    if (abs >= 1e9) return `$${(v / 1e9).toFixed(0)}B`;
    if (abs >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
    return `$${v}`;
  }
  const n = normalizeToBaegmanwon(v);
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}${(Math.abs(n) / 1_000_000).toFixed(0)}조`;
  if (abs >= 10_000)    return `${sign}${Math.round(Math.abs(n) / 10_000).toLocaleString()}억`;
  return `${sign}${Math.round(Math.abs(n)).toLocaleString()}백만`;
}

const MAIN_COLOR    = "#6366f1";
const COMPARE_COLOR = "#f59e0b";

// ── KPI 비교 카드 ─────────────────────────────────────────────────────────────
function KpiCompareCard({
  label,
  mainVal,
  cmpVal,
  unit,
  mainName,
  cmpName,
}: {
  label: string;
  mainVal: number | null;
  cmpVal: number | null;
  unit: string;
  mainName: string;
  cmpName: string;
}) {
  const both = mainVal !== null && cmpVal !== null;
  const ratio = both ? mainVal! / Math.abs(cmpVal!) : null;
  const mainBetter = ratio !== null && ratio > 1;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-3 flex items-end gap-3">
        <div className="flex-1">
          <p className="text-[10px] text-slate-500 truncate">{mainName}</p>
          <p className={`mt-0.5 text-lg font-bold tabular-nums ${mainBetter ? "text-indigo-700" : "text-slate-800"}`}>
            {fmtShort(mainVal, unit)}
          </p>
        </div>
        <div className="text-slate-300 text-sm">vs</div>
        <div className="flex-1 text-right">
          <p className="text-[10px] text-slate-500 truncate">{cmpName}</p>
          <p className={`mt-0.5 text-lg font-bold tabular-nums ${!mainBetter && both ? "text-amber-600" : "text-slate-800"}`}>
            {fmtShort(cmpVal, unit)}
          </p>
        </div>
      </div>
      {both && ratio !== null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
            style={{ width: `${Math.min((ratio / (ratio + 1)) * 100, 100).toFixed(1)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ── 그룹 바 차트 ──────────────────────────────────────────────────────────────
function GroupedBarChart({ main, compare }: Props) {
  const LABELS = [
    ["매출액", "Revenue"],
    ["영업이익", "Operating Income"],
    ["당기순이익", "Net Income"],
  ];

  const findMetric = (data: FinancialChartData, aliases: string[]) =>
    data.metrics.find((m) => aliases.includes(m.label));

  const unit = findMetric(main, LABELS[0])?.unit ?? findMetric(compare, LABELS[0])?.unit ?? "백만원";

  const rows = LABELS.map(([ko, en]) => {
    const mMetric = findMetric(main, [ko, en]);
    const cMetric = findMetric(compare, [ko, en]);
    const mVal = mMetric?.current ?? null;
    const cVal = cMetric?.current ?? null;
    if (mVal === null && cVal === null) return null;
    return {
      name: ko,
      [main.corp]: mVal !== null ? normalizeToBaegmanwon(mVal) : null,
      [compare.corp]: cVal !== null ? normalizeToBaegmanwon(cVal) : null,
    };
  }).filter(Boolean) as Array<Record<string, number | null | string>>;

  if (rows.length === 0) return null;

  function CustomTooltip({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number | null; color: string }>;
    label?: string;
  }) {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs">
        <p className="font-medium text-slate-800 mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {p.value !== null ? fmtShort(p.value, unit) : "—"}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold text-slate-700">핵심 손익 비교 ({main.currentYear})</h4>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => formatYAxis(v, unit)} tick={{ fontSize: 10 }} width={55} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey={main.corp}    fill={MAIN_COLOR}    radius={[3, 3, 0, 0]} />
          <Bar dataKey={compare.corp} fill={COMPARE_COLOR} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 레이더 차트 (정규화된 지표) ───────────────────────────────────────────────
function RadarCompare({ main, compare }: Props) {
  const rev_m   = main.metrics.find((m) => ["매출액", "Revenue"].includes(m.label));
  const op_m    = main.metrics.find((m) => ["영업이익", "Operating Income"].includes(m.label));
  const ni_m    = main.metrics.find((m) => ["당기순이익", "Net Income"].includes(m.label));
  const liab_m  = main.metrics.find((m) => ["총부채", "Total Liabilities"].includes(m.label));
  const eq_m    = main.metrics.find((m) => ["자본총계", "Stockholders Equity", "Total Equity"].includes(m.label));

  const rev_c   = compare.metrics.find((m) => ["매출액", "Revenue"].includes(m.label));
  const op_c    = compare.metrics.find((m) => ["영업이익", "Operating Income"].includes(m.label));
  const ni_c    = compare.metrics.find((m) => ["당기순이익", "Net Income"].includes(m.label));
  const liab_c  = compare.metrics.find((m) => ["총부채", "Total Liabilities"].includes(m.label));
  const eq_c    = compare.metrics.find((m) => ["자본총계", "Stockholders Equity", "Total Equity"].includes(m.label));

  const pct = (n: number | null, d: number | null) =>
    n !== null && d !== null && d !== 0 ? (n / Math.abs(d)) * 100 : null;
  const debtR = (l: typeof liab_m, e: typeof eq_m) => {
    const lv = l?.current ?? null;
    const ev = e?.current ?? null;
    if (lv === null || ev === null || ev === 0) return null;
    const r = (Math.abs(lv) / Math.abs(ev)) * 100;
    return Math.max(0, 100 - Math.min(r / 2, 100)); // 낮을수록 좋음 → 반전
  };
  const revGrowth = (m: typeof rev_m) => {
    if (!m || m.current === null || m.prior === null || m.prior === 0) return null;
    return Math.max(-50, Math.min(((m.current - m.prior) / Math.abs(m.prior)) * 100, 100));
  };

  const metrics = [
    { label: "영업이익률", main: pct(op_m?.current ?? null, rev_m?.current ?? null), cmp: pct(op_c?.current ?? null, rev_c?.current ?? null) },
    { label: "순이익률",   main: pct(ni_m?.current ?? null, rev_m?.current ?? null), cmp: pct(ni_c?.current ?? null, rev_c?.current ?? null) },
    { label: "안정성",     main: debtR(liab_m, eq_m),                                cmp: debtR(liab_c, eq_c) },
    { label: "매출성장",   main: revGrowth(rev_m),                                   cmp: revGrowth(rev_c) },
  ].filter((d) => d.main !== null || d.cmp !== null);

  if (metrics.length < 3) return null;

  // 정규화: 각 지표별 max 기준으로 0~100
  const normalize = (vals: (number | null)[], raw: number | null) => {
    if (raw === null) return 0;
    const max = Math.max(...vals.filter((v): v is number => v !== null).map(Math.abs), 1);
    return Math.max(0, Math.min((raw / max) * 100, 100));
  };

  const radarData = metrics.map((m) => ({
    subject: m.label,
    [main.corp]:    normalize([m.main, m.cmp], m.main),
    [compare.corp]: normalize([m.main, m.cmp], m.cmp),
  }));

  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold text-slate-700">지표 비교 레이더</h4>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#64748b" }} />
          <Radar name={main.corp}    dataKey={main.corp}    stroke={MAIN_COLOR}    fill={MAIN_COLOR}    fillOpacity={0.15} />
          <Radar name={compare.corp} dataKey={compare.corp} stroke={COMPARE_COLOR} fill={COMPARE_COLOR} fillOpacity={0.15} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => `${v.toFixed(1)}`} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
export function ComparisonCharts({ main, compare }: Props) {
  const LABELS = [
    { label: "매출액",    aliases: ["매출액", "Revenue"] },
    { label: "영업이익",  aliases: ["영업이익", "Operating Income"] },
    { label: "당기순이익",aliases: ["당기순이익", "Net Income"] },
  ];

  const unit = main.metrics.find((m) => m.category === "income")?.unit ??
               compare.metrics.find((m) => m.category === "income")?.unit ?? "백만원";

  return (
    <div className="mt-6 space-y-6 rounded-2xl border border-amber-200/60 bg-white p-5 shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
          <GitCompare className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">기업 비교</h3>
          <p className="text-xs text-slate-400">{main.corp} vs {compare.corp} · {main.currentYear}년 기준</p>
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {LABELS.map(({ label, aliases }) => {
          const mM = main.metrics.find((m) => aliases.includes(m.label));
          const cM = compare.metrics.find((m) => aliases.includes(m.label));
          return (
            <KpiCompareCard
              key={label}
              label={label}
              mainVal={mM?.current ?? null}
              cmpVal={cM?.current ?? null}
              unit={unit}
              mainName={main.corp}
              cmpName={compare.corp}
            />
          );
        })}
      </div>

      {/* 차트 2종 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <GroupedBarChart main={main} compare={compare} />
        <RadarCompare   main={main} compare={compare} />
      </div>

      <p className="text-[10px] text-slate-400">
        * 교육용 비교입니다. 회계기준·회계연도가 다를 수 있어요.
      </p>
    </div>
  );
}
