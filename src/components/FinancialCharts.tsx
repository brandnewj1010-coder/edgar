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
import { BarChart3, Users, TrendingUp } from "lucide-react";
import type { FinancialChartData } from "../types";

interface Props {
  chartData: FinancialChartData;
}

// ── 수치 포맷 헬퍼 ────────────────────────────────────────────────────────────
function fmtVal(v: number | null, unit: string): string {
  if (v === null || v === undefined) return "—";
  if (unit === "USD") {
    if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    return `$${v.toLocaleString()}`;
  }
  if (unit === "명") return `${v.toLocaleString()}명`;
  if (unit === "%") return `${v.toFixed(1)}%`;
  // 백만원 기준
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}조`;
  if (Math.abs(v) >= 10_000) return `${(v / 10_000).toFixed(0)}억`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}십억`;
  return `${v.toLocaleString()}백만`;
}

function formatYAxis(v: number, unit: string): string {
  if (unit === "USD") {
    if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(0)}B`;
    if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
    return `$${v}`;
  }
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}조`;
  if (Math.abs(v) >= 10_000) return `${(v / 10_000).toFixed(0)}억`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}십억`;
  return String(v);
}

const COLORS = {
  current: "#6366f1",  // indigo-500
  prior: "#a5b4fc",    // indigo-300
  priorPrior: "#e0e7ff", // indigo-100
  positive: "#10b981", // emerald-500
  negative: "#ef4444", // red-500
  hr: "#f59e0b",       // amber-500
  hrLight: "#fcd34d",  // amber-300
};

// ── 손익 차트 (매출·영업이익·당기순이익) ──────────────────────────────────────
function IncomeChart({ data }: { data: FinancialChartData }) {
  const labels = ["매출액", "영업이익", "당기순이익"];
  const incomeMetrics = data.metrics.filter((m) => labels.includes(m.label));
  if (incomeMetrics.length === 0) {
    labels2: for (const extra of ["Revenue", "Operating Income", "Net Income"]) {
      if (data.metrics.some((m) => m.label === extra)) { break labels2; }
    }
    const eng = data.metrics.filter((m) =>
      ["Revenue", "Operating Income", "Net Income", "Gross Profit"].includes(m.label),
    );
    if (eng.length === 0) return null;
    incomeMetrics.push(...eng);
  }

  const unit = incomeMetrics[0]?.unit ?? "백만원";
  const chartRows = incomeMetrics.map((m) => ({
    name: m.label,
    [data.currentYear]: m.current,
    [data.priorYear]: m.prior,
    [data.priorPriorYear]: m.priorPrior,
  }));

  const customTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number | null; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs">
        <p className="font-medium text-slate-800 mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {fmtVal(p.value, unit)}
          </p>
        ))}
      </div>
    );
  };

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
          <Tooltip content={customTooltip} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Bar dataKey={data.currentYear} fill={COLORS.current} radius={[3, 3, 0, 0]} />
          <Bar dataKey={data.priorYear} fill={COLORS.prior} radius={[3, 3, 0, 0]} />
          <Bar dataKey={data.priorPriorYear} fill={COLORS.priorPrior} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 영업이익률 추이 ────────────────────────────────────────────────────────────
function MarginChart({ data }: { data: FinancialChartData }) {
  const rev = data.metrics.find((m) => ["매출액", "Revenue"].includes(m.label));
  const op = data.metrics.find((m) => ["영업이익", "Operating Income"].includes(m.label));
  const ni = data.metrics.find((m) => ["당기순이익", "Net Income"].includes(m.label));
  if (!rev || !op) return null;

  const margin = (n: number | null, d: number | null) =>
    n !== null && d !== null && d !== 0 ? Math.round((n / d) * 1000) / 10 : null;

  const chartRows = [
    {
      name: data.priorPriorYear,
      "영업이익률": margin(op.priorPrior, rev.priorPrior),
      "순이익률": ni ? margin(ni.priorPrior, rev.priorPrior) : null,
    },
    {
      name: data.priorYear,
      "영업이익률": margin(op.prior, rev.prior),
      "순이익률": ni ? margin(ni.prior, rev.prior) : null,
    },
    {
      name: data.currentYear,
      "영업이익률": margin(op.current, rev.current),
      "순이익률": ni ? margin(ni.current, rev.current) : null,
    },
  ].filter((r) => r["영업이익률"] !== null);

  if (chartRows.length < 2) return null;

  const customTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number | null; color: string }>;
    label?: string;
  }) => {
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
  };

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
          <Tooltip content={customTooltip} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Line
            type="monotone"
            dataKey="영업이익률"
            stroke={COLORS.current}
            strokeWidth={2}
            dot={{ r: 4, fill: COLORS.current }}
          />
          {ni && (
            <Line
              type="monotone"
              dataKey="순이익률"
              stroke={COLORS.positive}
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={{ r: 4, fill: COLORS.positive }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── HR KPI 차트 ────────────────────────────────────────────────────────────────
function HrKpiCard({
  label,
  value,
  sub,
  color = "indigo",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "indigo" | "amber" | "emerald" | "rose";
}) {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
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
    hr.headcount ||
    hr.avgSalaryMillion ||
    hr.execMaxPayMillion ||
    hr.laborToRevenueRatio ||
    hr.opIncomePerEmployee ||
    hr.revenuePerEmployee ||
    hr.payRatio;

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
          <HrKpiCard
            label="임직원 수"
            value={`${hr.headcount.toLocaleString()}명`}
            color="indigo"
          />
        )}
        {hr.avgSalaryMillion != null && (
          <HrKpiCard
            label="1인 평균급여"
            value={
              unit === "USD"
                ? fmtVal(hr.avgSalaryMillion, "USD")
                : `${Math.round(hr.avgSalaryMillion).toLocaleString()}백만원`
            }
            sub="연간 기준"
            color="amber"
          />
        )}
        {hr.laborToRevenueRatio != null && (
          <HrKpiCard
            label="인건비율"
            value={`${hr.laborToRevenueRatio}%`}
            sub="인건비 / 매출액"
            color="emerald"
          />
        )}
        {hr.revenuePerEmployee != null && (
          <HrKpiCard
            label="인당 매출"
            value={
              unit === "USD"
                ? fmtVal(hr.revenuePerEmployee, "USD")
                : `${Math.round(hr.revenuePerEmployee).toLocaleString()}백만원`
            }
            sub="매출 / 직원수"
            color="indigo"
          />
        )}
        {hr.opIncomePerEmployee != null && (
          <HrKpiCard
            label="인당 영업이익"
            value={
              unit === "USD"
                ? fmtVal(hr.opIncomePerEmployee, "USD")
                : `${Math.round(hr.opIncomePerEmployee).toLocaleString()}백만원`
            }
            sub="영업이익 / 직원수"
            color="emerald"
          />
        )}
        {hr.execMaxPayMillion != null && (
          <HrKpiCard
            label="임원 최대 보수"
            value={
              unit === "USD"
                ? fmtVal(hr.execMaxPayMillion, "USD")
                : `${Math.round(hr.execMaxPayMillion).toLocaleString()}백만원`
            }
            sub="연간 1인 기준"
            color="rose"
          />
        )}
        {hr.payRatio != null && (
          <HrKpiCard
            label="Pay Ratio 추정"
            value={`${hr.payRatio}배`}
            sub="임원 최대 보수 / 직원 평균"
            color="rose"
          />
        )}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export function FinancialCharts({ chartData }: Props) {
  if (!chartData || chartData.metrics.length === 0) return null;

  return (
    <div className="mt-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            재무 데이터 시각화
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {chartData.corp} · {chartData.unitNote ?? `${chartData.priorPriorYear}~${chartData.currentYear}`}
          </p>
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700">
          {chartData.currentYear}년 기준
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <IncomeChart data={chartData} />
        <MarginChart data={chartData} />
      </div>

      <HrMetricsPanel data={chartData} />

      <p className="text-[10px] text-slate-400">
        * 교육용 시각화입니다. 수치는 공시 원문과 함께 확인하세요.
        {chartData.unitNote && ` (${chartData.unitNote})`}
      </p>
    </div>
  );
}
