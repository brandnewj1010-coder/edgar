import type { FinancialChartData } from "../types";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { GitMerge, PieChart as PieIcon } from "lucide-react";

// ── 수치 포맷 ─────────────────────────────────────────────────────────────────
function fmtShort(v: number, unit: string): string {
  if (unit === "USD") {
    const abs = Math.abs(v);
    if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    return `$${v.toLocaleString()}`;
  }
  const n = Math.abs(v) > 10_000_000_000 ? v / 1_000_000 : v;
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}${(Math.abs(n) / 1_000_000).toFixed(1)}조`;
  if (abs >= 10_000)    return `${sign}${Math.round(Math.abs(n) / 10_000).toLocaleString()}억`;
  return `${sign}${Math.round(Math.abs(n)).toLocaleString()}백만`;
}

// ── SVG Sankey ────────────────────────────────────────────────────────────────

interface SankeyNode {
  id: string;
  label: string;
  value: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

function buildSankeyNodes(data: FinancialChartData): SankeyNode[] | null {
  const find = (aliases: string[]) =>
    data.metrics.find((m) => aliases.includes(m.label));

  const rev = find(["매출액", "Revenue"]);
  const op  = find(["영업이익", "Operating Income"]);
  const ni  = find(["당기순이익", "Net Income"]);

  const revV = rev?.current ?? null;
  const opV  = op?.current  ?? null;
  const niV  = ni?.current  ?? null;

  if (revV === null || opV === null) return null;

  const unit = rev?.unit ?? "백만원";
  const norm = (v: number) => Math.abs(v) > 10_000_000_000 ? v / 1_000_000 : v;

  const R  = Math.abs(norm(revV));
  const O  = norm(opV);
  const N  = niV !== null ? norm(niV) : null;
  const OC = R - Math.max(O, 0);         // 영업비용 (always positive)
  const TAX = N !== null ? Math.max(O, 0) - Math.max(N, 0) : null;

  const SVG_H = 240;
  const COL_W = 88;
  const GAP   = 64;
  const totalCols = TAX !== null ? 3 : 2;
  const SVG_W = totalCols * COL_W + (totalCols - 1) * GAP + 40;

  const TOP = 14;
  const scale = (v: number) => Math.max(6, (Math.abs(v) / R) * (SVG_H - TOP * 2));

  const nodes: SankeyNode[] = [];
  let curX = 20;

  // 매출 (col 0) — full bar
  nodes.push({ id: "rev", label: "매출액", value: R, x: curX, y: TOP, w: COL_W, h: scale(R), color: "#6366f1" });
  curX += COL_W + GAP;

  // 영업이익 + 영업비용 (col 1) — stacked, no gap
  const opH = scale(Math.max(O, 0));
  const ocH = scale(OC);
  const opY = TOP;
  const ocY = opY + opH;   // flush, no gap
  nodes.push({ id: "op", label: O >= 0 ? "영업이익" : "영업손실", value: O, x: curX, y: opY, w: COL_W, h: opH, color: O >= 0 ? "#10b981" : "#ef4444" });
  nodes.push({ id: "oc", label: "영업비용", value: OC, x: curX, y: ocY, w: COL_W, h: ocH, color: "#94a3b8" });
  curX += COL_W + GAP;

  // 순이익 + 세금 (col 2, optional) — stacked, no gap
  if (TAX !== null && N !== null) {
    const niH  = scale(Math.max(N, 0));
    const taxH = scale(Math.max(TAX, 0));
    const niY  = TOP;
    const txY  = niY + niH;  // flush, no gap
    nodes.push({ id: "ni",  label: N >= 0 ? "당기순이익" : "당기순손실", value: N,   x: curX, y: niY, w: COL_W, h: niH,  color: N >= 0 ? "#0ea5e9" : "#f43f5e" });
    nodes.push({ id: "tax", label: "세금·기타", value: TAX, x: curX, y: txY, w: COL_W, h: taxH, color: "#cbd5e1" });
  }

  void unit; // suppress unused warning
  return nodes;
}

function SankeyBar({ node, unit }: { node: SankeyNode; unit: string }) {
  return (
    <g>
      <rect x={node.x} y={node.y} width={node.w} height={Math.max(node.h, 1)} rx={3} fill={node.color} opacity={0.88} />
      <text x={node.x + node.w / 2} y={node.y - 4} textAnchor="middle" fontSize={9} fill="#64748b">
        {node.label}
      </text>
      {node.h > 18 && (
        <text x={node.x + node.w / 2} y={node.y + node.h / 2 + 4} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#fff">
          {fmtShort(node.value, unit)}
        </text>
      )}
    </g>
  );
}

function SankeyDiagram({ data }: { data: FinancialChartData }) {
  const nodes = buildSankeyNodes(data);
  if (!nodes || nodes.length === 0) return null;

  const unit = data.metrics.find((m) => ["매출액", "Revenue"].includes(m.label))?.unit ?? "백만원";
  const maxX  = Math.max(...nodes.map((n) => n.x + n.w)) + 20;
  const maxY  = Math.max(...nodes.map((n) => n.y + n.h)) + 20;

  const rev  = nodes.find((n) => n.id === "rev");
  const op   = nodes.find((n) => n.id === "op");
  const oc   = nodes.find((n) => n.id === "oc");
  const ni   = nodes.find((n) => n.id === "ni");
  const tax  = nodes.find((n) => n.id === "tax");

  function ribbon(x1: number, y1: number, h1: number, x2: number, y2: number, h2: number, color: string, opacity = 0.18) {
    const mx = (x1 + x2) / 2;
    return (
      <path
        d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}
           L${x2},${y2 + h2} C${mx},${y2 + h2} ${mx},${y1 + h1} ${x1},${y1 + h1} Z`}
        fill={color}
        opacity={opacity}
      />
    );
  }

  return (
    <svg viewBox={`0 0 ${maxX} ${maxY}`} className="w-full" style={{ maxHeight: 280 }}>
      {rev && op  && ribbon(rev.x + rev.w, op.y,  op.h,  op.x,  op.y,  op.h,  "#10b981", 0.16)}
      {rev && oc  && ribbon(rev.x + rev.w, oc.y,  oc.h,  oc.x,  oc.y,  oc.h,  "#94a3b8", 0.13)}
      {op  && ni  && ribbon(op.x  + op.w,  ni.y,  ni.h,  ni.x,  ni.y,  ni.h,  "#0ea5e9", 0.16)}
      {op  && tax && ribbon(op.x  + op.w,  tax.y, tax.h, tax.x, tax.y, tax.h, "#cbd5e1", 0.13)}
      {nodes.map((n) => <SankeyBar key={n.id} node={n} unit={unit} />)}
    </svg>
  );
}

// ── 카테고리별 파이차트 ───────────────────────────────────────────────────────

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#0ea5e9", "#f43f5e", "#8b5cf6", "#06b6d4", "#84cc16"];

function CategoryPie({ data }: { data: FinancialChartData }) {
  const find = (aliases: string[]) =>
    data.metrics.find((m) => aliases.includes(m.label));

  const rev = find(["매출액", "Revenue"]);
  const op  = find(["영업이익", "Operating Income"]);
  const ni  = find(["당기순이익", "Net Income"]);

  if (!rev?.current) return null;

  const unit = rev.unit ?? "백만원";
  const norm = (v: number | null) => {
    if (v === null) return null;
    return Math.abs(v) > 10_000_000_000 ? v / 1_000_000 : v;
  };

  const R  = Math.abs(norm(rev.current) ?? 0);
  const O  = norm(op?.current ?? null);
  const N  = norm(ni?.current ?? null);
  const OC = O !== null ? R - Math.abs(O) : null;
  const TAX = O !== null && N !== null ? Math.abs(O) - Math.abs(N) : null;

  const segments: Array<{ name: string; value: number }> = [];
  if (N !== null && N > 0)     segments.push({ name: "당기순이익", value: Math.abs(N) });
  if (TAX !== null && TAX > 0) segments.push({ name: "세금·기타",  value: TAX });
  if (OC  !== null && OC > 0)  segments.push({ name: "영업비용",   value: OC });

  if (segments.length < 2) return null;

  const total = segments.reduce((s, d) => s + d.value, 0);

  function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-lg text-xs">
        <p className="font-medium text-slate-800">{d.name}</p>
        <p className="text-slate-500">{fmtShort(d.value, unit)} ({((d.value / total) * 100).toFixed(1)}%)</p>
      </div>
    );
  }

  return (
    <div>
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        <PieIcon className="h-4 w-4 text-indigo-500" />
        매출 구성 비중 ({data.currentYear})
      </h4>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={segments} cx="50%" cy="50%" outerRadius={72} innerRadius={36} dataKey="value"
            label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false} fontSize={11}>
            {segments.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
export function SankeyFlow({ data }: { data: FinancialChartData }) {
  const hasRev = data.metrics.some((m) => ["매출액", "Revenue"].includes(m.label));
  if (!hasRev) return null;

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <GitMerge className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">손익 흐름도</h3>
          <p className="text-xs text-slate-400">{data.corp} · {data.currentYear}년 매출 → 비용 → 이익 분해</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <GitMerge className="h-4 w-4 text-indigo-400" />
            손익 Sankey
          </h4>
          <SankeyDiagram data={data} />
        </div>
        <CategoryPie data={data} />
      </div>

      <p className="text-[10px] text-slate-400">* 교육용 시각화. 영업비용·세금은 매출·영업이익·순이익으로부터 역산한 추정치입니다.</p>
    </div>
  );
}
