import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { BarChart3, Users, TrendingUp, Landmark, Droplets, Percent } from "lucide-react";
import type { FinancialChartData, FinancialMetric } from "../types";

interface Props {
  chartData: FinancialChartData;
}

// ── 수치 포맷 헬퍼 ────────────────────────────────────────────────────────────

function normalizeToBaegmanwon(v: number): number {
  return Math.abs(v) > 10_000_000_000 ? v / 1_000_000 : v;
}

function fmtVal(v: number | null, unit: string): string {
  if (v === null || v === undefined) return "—";
  if (unit === "USD") {
    const abs = Math.abs(v);
    if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    return `$${v.toLocaleString()}`;
  }
  if (unit === "명") return `${Math.round(v).toLocaleString()}명`;
  if (unit === "%") return `${v.toFixed(1)}%`;

  const n = normalizeToBaegmanwon(v);
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}${(Math.abs(n) / 1_000_000).toFixed(1)}조`;
  if (abs >= 10_000)    return `${sign}${Math.round(Math.abs(n) / 10_000).toLocaleString()}억`;
  if (abs >= 1)         return `${sign}${Math.round(Math.abs(n)).toLocaleString()}백만`;
  return `${n.toLocaleString()}백만`;
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

const COLORS = {
  current:    "#6366f1",  // indigo-500
  prior:      "#a5b4fc",  // indigo-300
  priorPrior: "#e0e7ff",  // indigo-100
  positive:   "#10b981",  // emerald-500
  negative:   "#ef4444",  // red-500
  amber:      "#f59e0b",  // amber-500
  amberLight: "#fcd34d",  // amber-300
  rose:       "#f43f5e",  // rose-500
  roseLight:  "#fda4af",  // rose-300
  sky:        "#0ea5e9",  // sky-500
  skyLight:   "#7dd3fc",  // sky-300
};

// ── 공통 Tooltip ──────────────────────────────────────────────────────────────
function makeTooltip(unit: string, suffix = "") {
  return function CustomTooltip({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number | null; color: string }>;
    label?: string;
  }) {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs">
        <p className="font-medium text-slate-800 mb-1">{label}{suffix}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {p.value !== null ? fmtVal(p.value, unit) : "—"}
          </p>
        ))}
      </div>
    );
  };
}

// ── 손익 차트 ────────────────────────────────────────────────────────────────
function IncomeChart({ data }: { data: FinancialChartData }) {
  const labels = ["매출액", "영업이익", "당기순이익"];
  const engLabels = ["Revenue", "Operating Income", "Net Income", "Gross Profit"];
  let incomeMetrics = data.metrics.filter((m) => labels.includes(m.label));
  if (incomeMetrics.length === 0) {
    incomeMetrics = data.metrics.filter((m) => engLabels.includes(m.label));
  }
  if (incomeMetrics.length === 0) return null;

  const unit = incomeMetrics[0]?.unit ?? "백만원";
  const chartRows = incomeMetrics.map((m) => ({
    name: m.label,
    [data.currentYear]: m.current,
    [data.priorYear]: m.prior,
    [data.priorPriorYear]: m.priorPrior,
  }));

  const CustomTooltip = makeTooltip(unit);

  return (
    <div>
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        <BarChart3 className="h-4 w-4 text-indigo-500" />
        손익 추이 ({data.priorPriorYear}~{data.currentYear})
      </h4>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartRows} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => formatYAxis(v, unit)} tick={{ fontSize: 10 }} width={55} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Bar dataKey={data.currentYear}    fill={COLORS.current}    radius={[3, 3, 0, 0]} />
          <Bar dataKey={data.priorYear}      fill={COLORS.prior}      radius={[3, 3, 0, 0]} />
          <Bar dataKey={data.priorPriorYear} fill={COLORS.priorPrior} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 이익률 추이 ──────────────────────────────────────────────────────────────
function MarginChart({ data }: { data: FinancialChartData }) {
  const rev = data.metrics.find((m) => ["매출액", "Revenue"].includes(m.label));
  const op  = data.metrics.find((m) => ["영업이익", "Operating Income"].includes(m.label));
  const ni  = data.metrics.find((m) => ["당기순이익", "Net Income"].includes(m.label));
  if (!rev || !op) return null;

  const pct = (n: number | null, d: number | null) =>
    n !== null && d !== null && d !== 0 ? Math.round((n / d) * 1000) / 10 : null;

  const chartRows = [
    {
      name: data.priorPriorYear,
      "영업이익률": pct(op.priorPrior, rev.priorPrior),
      "순이익률":   ni ? pct(ni.priorPrior, rev.priorPrior) : null,
    },
    {
      name: data.priorYear,
      "영업이익률": pct(op.prior, rev.prior),
      "순이익률":   ni ? pct(ni.prior, rev.prior) : null,
    },
    {
      name: data.currentYear,
      "영업이익률": pct(op.current, rev.current),
      "순이익률":   ni ? pct(ni.current, rev.current) : null,
    },
  ].filter((r) => r["영업이익률"] !== null);

  if (chartRows.length < 2) return null;

  function CustomTooltip({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number | null; color: string }>;
    label?: string;
  }) {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs">
        <p className="font-medium text-slate-800 mb-1">{label}년</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {p.value !== null ? `${p.value}%` : "—"}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div>
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        <TrendingUp className="h-4 w-4 text-emerald-500" />
        이익률 추이 (%)
      </h4>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartRows} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} width={40} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Line type="monotone" dataKey="영업이익률" stroke={COLORS.current}   strokeWidth={2} dot={{ r: 4, fill: COLORS.current }} />
          {ni && (
            <Line type="monotone" dataKey="순이익률" stroke={COLORS.positive} strokeWidth={2} strokeDasharray="4 2" dot={{ r: 4, fill: COLORS.positive }} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 재무상태표 차트 ──────────────────────────────────────────────────────────
function BalanceChart({ data }: { data: FinancialChartData }) {
  const totalAssets = data.metrics.find((m) => ["총자산", "Total Assets"].includes(m.label));
  const totalLiab   = data.metrics.find((m) => ["총부채", "Total Liabilities"].includes(m.label));
  const equity      = data.metrics.find((m) => ["자본총계", "Stockholders Equity"].includes(m.label));
  if (!totalAssets && !totalLiab && !equity) return null;

  const unit = totalAssets?.unit ?? totalLiab?.unit ?? "백만원";

  const years = [data.priorPriorYear, data.priorYear, data.currentYear];
  const getVal = (m: FinancialMetric | undefined, idx: number) =>
    idx === 0 ? m?.priorPrior ?? null : idx === 1 ? m?.prior ?? null : m?.current ?? null;

  const chartRows = years.map((yr, i) => ({
    name: yr,
    ...(totalAssets ? { "총자산":  getVal(totalAssets, i) } : {}),
    ...(totalLiab   ? { "총부채":  getVal(totalLiab, i) }   : {}),
    ...(equity      ? { "자본총계": getVal(equity, i) }      : {}),
  })).filter((r) => Object.values(r).some((v, i) => i > 0 && v !== null));

  if (chartRows.length < 2) return null;

  const CustomTooltip = makeTooltip(unit, "년");

  return (
    <div>
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        <Landmark className="h-4 w-4 text-sky-500" />
        재무상태표 추이
      </h4>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartRows} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => formatYAxis(v, unit)} tick={{ fontSize: 10 }} width={55} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="총자산"   fill={COLORS.sky}       radius={[3, 3, 0, 0]} />
          <Bar dataKey="총부채"   fill={COLORS.rose}      radius={[3, 3, 0, 0]} />
          <Bar dataKey="자본총계" fill={COLORS.positive}  radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 현금흐름 차트 ────────────────────────────────────────────────────────────
function CashFlowChart({ data }: { data: FinancialChartData }) {
  const opCF  = data.metrics.find((m) => ["영업활동현금흐름", "Operating Cash Flow"].includes(m.label));
  const invCF = data.metrics.find((m) => ["투자활동현금흐름", "Investing Cash Flow"].includes(m.label));
  const finCF = data.metrics.find((m) => ["재무활동현금흐름", "Financing Cash Flow"].includes(m.label));
  if (!opCF && !invCF && !finCF) return null;

  const unit = opCF?.unit ?? invCF?.unit ?? "백만원";
  const years = [data.priorPriorYear, data.priorYear, data.currentYear];
  const getVal = (m: FinancialMetric | undefined, idx: number) =>
    idx === 0 ? m?.priorPrior ?? null : idx === 1 ? m?.prior ?? null : m?.current ?? null;

  const cfLabelOp  = opCF  ? (opCF.label  === "영업활동현금흐름" ? "영업" : "영업CF") : null;
  const cfLabelInv = invCF ? (invCF.label === "투자활동현금흐름" ? "투자" : "투자CF") : null;
  const cfLabelFin = finCF ? (finCF.label === "재무활동현금흐름" ? "재무" : "재무CF") : null;

  const chartRows = years.map((yr, i) => ({
    name: yr,
    ...(opCF  && cfLabelOp  ? { [cfLabelOp]:  getVal(opCF,  i) } : {}),
    ...(invCF && cfLabelInv ? { [cfLabelInv]: getVal(invCF, i) } : {}),
    ...(finCF && cfLabelFin ? { [cfLabelFin]: getVal(finCF, i) } : {}),
  })).filter((r) => Object.values(r).some((v, i) => i > 0 && v !== null));

  if (chartRows.length < 2) return null;

  const CustomTooltip = makeTooltip(unit, "년");

  return (
    <div>
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        <Droplets className="h-4 w-4 text-cyan-500" />
        현금흐름 추이
      </h4>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartRows} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => formatYAxis(v, unit)} tick={{ fontSize: 10 }} width={55} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke="#94a3b8" />
          {cfLabelOp  && <Bar dataKey={cfLabelOp}  fill={COLORS.current}  radius={[3, 3, 0, 0]} />}
          {cfLabelInv && <Bar dataKey={cfLabelInv} fill={COLORS.amber}    radius={[3, 3, 0, 0]} />}
          {cfLabelFin && <Bar dataKey={cfLabelFin} fill={COLORS.rose}     radius={[3, 3, 0, 0]} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 수익성 비율 (ROE / ROA / 부채비율) ──────────────────────────────────────
function SolvencyRatioChart({ data }: { data: FinancialChartData }) {
  const ni     = data.metrics.find((m) => ["당기순이익", "Net Income"].includes(m.label));
  const assets = data.metrics.find((m) => ["총자산", "Total Assets"].includes(m.label));
  const eq     = data.metrics.find((m) => ["자본총계", "Stockholders Equity"].includes(m.label));
  const liab   = data.metrics.find((m) => ["총부채", "Total Liabilities"].includes(m.label));

  if (!ni && !assets && !eq) return null;

  const pct = (n: number | null, d: number | null) =>
    n !== null && d !== null && d !== 0 ? Math.round((n / d) * 1000) / 10 : null;

  const getY = (m: FinancialMetric | undefined, idx: number) =>
    idx === 0 ? m?.priorPrior ?? null : idx === 1 ? m?.prior ?? null : m?.current ?? null;

  const years = [data.priorPriorYear, data.priorYear, data.currentYear];

  const chartRows = years.map((yr, i) => {
    const niV = getY(ni, i);
    const asV = getY(assets, i);
    const eqV = getY(eq, i);
    const lbV = getY(liab, i);
    return {
      name: yr,
      ...(ni && eq    ? { "ROE(%)": pct(niV, eqV) }       : {}),
      ...(ni && assets ? { "ROA(%)": pct(niV, asV) }       : {}),
      ...(liab && eq   ? { "부채비율(%)": pct(lbV, eqV) }  : {}),
    };
  }).filter((r) => Object.values(r).some((v, i) => i > 0 && v !== null));

  if (chartRows.length < 2) return null;

  function CustomTooltip({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number | null; color: string }>;
    label?: string;
  }) {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs">
        <p className="font-medium text-slate-800 mb-1">{label}년</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {p.value !== null ? `${p.value}%` : "—"}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div>
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        <Percent className="h-4 w-4 text-rose-500" />
        수익성·안정성 비율 (%)
      </h4>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartRows} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} width={45} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke="#94a3b8" />
          {ni && eq    && <Line type="monotone" dataKey="ROE(%)"     stroke={COLORS.current}  strokeWidth={2} dot={{ r: 4 }} />}
          {ni && assets && <Line type="monotone" dataKey="ROA(%)"     stroke={COLORS.positive} strokeWidth={2} strokeDasharray="4 2" dot={{ r: 4 }} />}
          {liab && eq   && <Line type="monotone" dataKey="부채비율(%)" stroke={COLORS.rose}    strokeWidth={2} strokeDasharray="2 2" dot={{ r: 4 }} />}
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[10px] text-slate-400">
        ROE = 순이익/자본 · ROA = 순이익/자산 · 부채비율 = 부채/자본
      </p>
    </div>
  );
}

// ── HR KPI 카드 ──────────────────────────────────────────────────────────────
function HrKpiCard({
  label, value, sub, color = "indigo",
}: {
  label: string; value: string; sub?: string;
  color?: "indigo" | "amber" | "emerald" | "rose";
}) {
  const colorMap = {
    indigo:  "bg-indigo-50 text-indigo-700 border-indigo-200",
    amber:   "bg-amber-50 text-amber-700 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rose:    "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${colorMap[color]}`}>
      <p className="text-[11px] font-medium opacity-70">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] opacity-60">{sub}</p>}
    </div>
  );
}

function HrMetricsPanel({ data }: { data: FinancialChartData }) {
  const hr = data.hrMetrics;
  if (!hr) return null;

  const hasAny =
    hr.headcount || hr.avgSalaryMillion || hr.execMaxPayMillion ||
    hr.laborToRevenueRatio || hr.opIncomePerEmployee || hr.revenuePerEmployee || hr.payRatio;
  if (!hasAny) return null;

  const unit = data.metrics[0]?.unit === "USD" ? "USD" : "백만원";

  return (
    <div>
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        <Users className="h-4 w-4 text-amber-500" />
        HR KPI 지표 ({data.currentYear}년 기준)
      </h4>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {hr.headcount != null && (
          <HrKpiCard label="임직원 수" value={`${hr.headcount.toLocaleString()}명`} color="indigo" />
        )}
        {hr.avgSalaryMillion != null && (
          <HrKpiCard
            label="1인 평균급여"
            value={unit === "USD" ? fmtVal(hr.avgSalaryMillion, "USD") : `${Math.round(hr.avgSalaryMillion).toLocaleString()}백만원`}
            sub="연간 기준" color="amber"
          />
        )}
        {hr.laborToRevenueRatio != null && (
          <HrKpiCard label="인건비율" value={`${hr.laborToRevenueRatio}%`} sub="인건비 / 매출액" color="emerald" />
        )}
        {hr.revenuePerEmployee != null && (
          <HrKpiCard
            label="인당 매출"
            value={unit === "USD" ? fmtVal(hr.revenuePerEmployee, "USD") : `${Math.round(hr.revenuePerEmployee).toLocaleString()}백만원`}
            sub="매출 / 직원수" color="indigo"
          />
        )}
        {hr.opIncomePerEmployee != null && (
          <HrKpiCard
            label="인당 영업이익"
            value={unit === "USD" ? fmtVal(hr.opIncomePerEmployee, "USD") : `${Math.round(hr.opIncomePerEmployee).toLocaleString()}백만원`}
            sub="영업이익 / 직원수" color="emerald"
          />
        )}
        {hr.execMaxPayMillion != null && (
          <HrKpiCard
            label="임원 평균 보수"
            value={unit === "USD" ? fmtVal(hr.execMaxPayMillion, "USD") : `${Math.round(hr.execMaxPayMillion).toLocaleString()}백만원`}
            sub="연간 1인 기준" color="rose"
          />
        )}
        {hr.payRatio != null && (
          <HrKpiCard label="Pay Ratio 추정" value={`${hr.payRatio}배`} sub="임원 평균 / 직원 평균" color="rose" />
        )}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export function FinancialCharts({ chartData }: Props) {
  if (!chartData || chartData.metrics.length === 0) return null;

  return (
    <div className="mt-6 space-y-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">재무 데이터 시각화</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {chartData.corp} · {chartData.unitNote ?? `${chartData.priorPriorYear}~${chartData.currentYear}`}
          </p>
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700">
          {chartData.currentYear}년 기준
        </span>
      </div>

      {/* 손익 + 이익률 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <IncomeChart data={chartData} />
        <MarginChart data={chartData} />
      </div>

      {/* 재무상태표 + 현금흐름 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BalanceChart data={chartData} />
        <CashFlowChart data={chartData} />
      </div>

      {/* 수익성·안정성 비율 */}
      <SolvencyRatioChart data={chartData} />

      {/* HR KPI */}
      <HrMetricsPanel data={chartData} />

      <p className="text-[10px] text-slate-400">
        * 교육용 시각화입니다. 수치는 공시 원문과 함께 확인하세요.
        {chartData.unitNote && ` (${chartData.unitNote})`}
      </p>
    </div>
  );
}
