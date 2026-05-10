import { sankey as createSankey, sankeyLinkHorizontal } from "d3-sankey";
import type { SankeyNode, SankeyLink } from "d3-sankey";
import type { FinancialChartData } from "../types";
import { GitMerge } from "lucide-react";

// ── 포맷 ────────────────────────────────────────────────────────────────────

function fmtShort(v: number, unit: string): string {
  if (unit === "USD") {
    const abs = Math.abs(v);
    if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    return `$${v.toLocaleString()}`;
  }
  const n = Math.abs(v) > 1_000_000_000 ? v / 1_000_000 : v;
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}${(Math.abs(n) / 1_000_000).toFixed(1)}조`;
  if (abs >= 100)       return `${sign}${Math.round(Math.abs(n) / 100).toLocaleString()}억`;
  return `${sign}${Math.round(Math.abs(n)).toLocaleString()}백만`;
}

function norm(v: number | null | undefined, unit = "백만원"): number | null {
  if (v == null) return null;
  if (unit === "USD") return v;
  return Math.abs(v) > 1_000_000_000 ? v / 1_000_000 : v;
}

// ── d3-sankey 타입 ───────────────────────────────────────────────────────────

type RawNode = { nodeId: string; label: string; color: string };
type RawLink = Record<string, never>;
type LNode = SankeyNode<RawNode, RawLink> & RawNode;
type LLink = SankeyLink<RawNode, RawLink>;

const COLORS = {
  rev:      "#6366f1",
  cogs:     "#94a3b8",
  gross:    "#10b981",
  sga:      "#f59e0b",
  labor:    "#f59e0b",
  othersga: "#fbbf24",
  op:       "#0ea5e9",
  interest: "#f43f5e",
  tax:      "#cbd5e1",
  ni:       "#22c55e",
  opcost:   "#94a3b8",
  netloss:  "#ef4444",
};

// ── 그래프 빌더 ──────────────────────────────────────────────────────────────

function buildGraph(data: FinancialChartData) {
  const unit = data.metrics.find((m) =>
    ["매출액", "Revenue"].includes(m.label),
  )?.unit ?? "백만원";

  const find = (labels: string[]): number | null => {
    for (const label of labels) {
      const m = data.metrics.find((x) => x.label === label);
      if (m?.current != null) return norm(m.current, unit);
    }
    return null;
  };

  const rev      = find(["매출액", "Revenue"]);
  const gross    = find(["매출총이익", "Gross Profit"]);
  const op       = find(["영업이익", "Operating Income"]);
  const ni       = find(["당기순이익", "Net Income"]);
  const interest = find(["이자비용", "Interest Expense", "Labor & Related Expense"]);

  if (rev == null || rev <= 0) return null;

  const rawNodes: RawNode[] = [];
  const rawLinks: { source: string; target: string; value: number }[] = [];

  // addNode는 nodeId(문자열)를 반환 — d3-sankey의 nodeId accessor와 일치해야 함
  const addNode = (nodeId: string, label: string, color: string): string => {
    rawNodes.push({ nodeId, label, color });
    return nodeId;
  };
  const addLink = (src: string, tgt: string, value: number) => {
    if (value > 0.001) rawLinks.push({ source: src, target: tgt, value });
  };

  // ── 매출액 (루트) ─────────────────────────────────────────────────────────
  const nRev = addNode("rev", `매출액\n${fmtShort(rev, unit)}`, COLORS.rev);

  // ── 매출원가 / 매출총이익 분기 ───────────────────────────────────────────
  if (gross != null && gross > 0 && gross < rev) {
    const cogs = rev - gross;
    const nCogs  = addNode("cogs",  `매출원가\n${fmtShort(cogs, unit)}`,   COLORS.cogs);
    const nGross = addNode("gross", `매출총이익\n${fmtShort(gross, unit)}`, COLORS.gross);
    addLink(nRev, nCogs,  cogs);
    addLink(nRev, nGross, gross);

    // ── 매출총이익 → 판관비 + 영업이익 ─────────────────────────────────
    if (op != null && op >= 0 && op < gross) {
      const sgaTotal = gross - op;

      const hrC = data.hrMetrics;
      const laborAmt = hrC?.avgSalaryMillion != null && hrC?.headcount != null
        ? hrC.avgSalaryMillion * hrC.headcount : null;

      if (laborAmt != null && laborAmt > 0 && laborAmt < sgaTotal) {
        addLink(nGross, addNode("labor",    `인건비\n${fmtShort(laborAmt, unit)}`,              COLORS.labor),    laborAmt);
        addLink(nGross, addNode("othersga", `기타판관비\n${fmtShort(sgaTotal - laborAmt, unit)}`, COLORS.othersga), sgaTotal - laborAmt);
      } else if (sgaTotal > 0) {
        addLink(nGross, addNode("sga", `판관비\n${fmtShort(sgaTotal, unit)}`, COLORS.sga), sgaTotal);
      }

      const nOp = addNode("op", `영업이익\n${fmtShort(op, unit)}`, COLORS.op);
      addLink(nGross, nOp, op);

      // ── 영업이익 분해 (순이익이 영업이익 이하일 때만) ────────────────
      if (ni != null && ni > 0 && ni < op) {
        const intAmt = interest != null && interest > 0 ? Math.min(interest, op - ni) : 0;
        const taxAmt = Math.max(0, op - ni - intAmt);
        if (intAmt > 0) addLink(nOp, addNode("interest", `이자비용\n${fmtShort(intAmt, unit)}`, COLORS.interest), intAmt);
        if (taxAmt > 0) addLink(nOp, addNode("tax", `법인세·기타\n${fmtShort(taxAmt, unit)}`, COLORS.tax), taxAmt);
        addLink(nOp, addNode("ni", `순이익\n${fmtShort(ni, unit)}`, COLORS.ni), ni);
      }
      // ni >= op (비영업이익·세금환급 등)이면 영업이익을 leaf로 표시 (추가 분기 없음)
    } else if (op != null && op < 0) {
      addLink(nGross, addNode("opcost", `영업비용\n${fmtShort(gross, unit)}`, COLORS.opcost), gross);
    }
  } else if (op != null && op >= 0) {
    // 매출총이익 없음: 매출 → 영업비용 + 영업이익
    const opcost = rev - op;
    if (opcost > 0) addLink(nRev, addNode("opcost", `영업비용\n${fmtShort(opcost, unit)}`, COLORS.opcost), opcost);
    const nOp = addNode("op", `영업이익\n${fmtShort(op, unit)}`, COLORS.op);
    addLink(nRev, nOp, op);

    if (ni != null && ni > 0 && ni < op) {
      const taxAmt = op - ni;
      if (taxAmt > 0) addLink(nOp, addNode("tax", `법인세·기타\n${fmtShort(taxAmt, unit)}`, COLORS.tax), taxAmt);
      addLink(nOp, addNode("ni", `순이익\n${fmtShort(ni, unit)}`, COLORS.ni), ni);
    }
  } else {
    return null;
  }

  if (rawNodes.length < 2 || rawLinks.length === 0) return null;
  return { nodes: rawNodes, links: rawLinks, unit };
}

// ── SVG Sankey 컴포넌트 ──────────────────────────────────────────────────────

const SVG_W = 800;
const SVG_H = 320;
const NODE_WIDTH = 14;
const NODE_PAD   = 16;

function SankeyDiagram({ data }: { data: FinancialChartData }) {
  const graph = buildGraph(data);
  if (!graph) return (
    <div className="flex items-center justify-center py-10 text-sm text-slate-400">
      재무 데이터가 충분하지 않아 Sankey를 그릴 수 없습니다.
    </div>
  );

  const { nodes: rawNodes, links: rawLinks, unit } = graph;

  let nodes: LNode[], links: LLink[];
  try {
    const layout = createSankey<RawNode, RawLink>()
      .nodeId((d) => (d as RawNode).nodeId)
      .nodeWidth(NODE_WIDTH)
      .nodePadding(NODE_PAD)
      .extent([[6, 10], [SVG_W - 6, SVG_H - 10]]);
    const result = layout({
      nodes: rawNodes.map((d) => ({ ...d })),
      links: rawLinks.map((d) => ({ ...d })),
    });
    nodes = result.nodes as LNode[];
    links = result.links as LLink[];
  } catch {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-slate-400">
        Sankey 레이아웃 계산 중 오류가 발생했습니다.
      </div>
    );
  }

  const linkPath = sankeyLinkHorizontal<RawNode, RawLink>();

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full"
      style={{ maxHeight: 340 }}
    >
      <defs>
        {links.map((link, i) => {
          const src = link.source as LNode;
          const tgt = link.target as LNode;
          return (
            <linearGradient key={i} id={`sg-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor={src.color} stopOpacity={0.55} />
              <stop offset="100%" stopColor={tgt.color} stopOpacity={0.40} />
            </linearGradient>
          );
        })}
      </defs>

      {/* 링크 (베지어 리본) */}
      {links.map((link, i) => (
        <path
          key={i}
          d={linkPath(link as LLink) ?? ""}
          fill="none"
          stroke={`url(#sg-${i})`}
          strokeWidth={Math.max(1.5, (link as LLink).width ?? 1)}
          opacity={0.75}
        />
      ))}

      {/* 노드 */}
      {(nodes as LNode[]).map((node, i) => {
        const x0 = node.x0 ?? 0;
        const x1 = node.x1 ?? 0;
        const y0 = node.y0 ?? 0;
        const y1 = node.y1 ?? 0;
        const h  = Math.max(2, y1 - y0);
        const cy = (y0 + y1) / 2;

        const isLeft = x0 < SVG_W / 2;
        const lx = isLeft ? x1 + 5 : x0 - 5;
        const anchor = isLeft ? "start" : "end";

        // label / value from node.label (multiline stored as \n)
        const [labelText, valueText] = node.label.split("\n");

        return (
          <g key={i}>
            <rect
              x={x0} y={y0}
              width={x1 - x0}
              height={h}
              fill={node.color}
              rx={3}
            />
            <text
              x={lx}
              y={cy - (valueText ? 5 : 0)}
              textAnchor={anchor}
              fontSize={9.5}
              fontWeight="600"
              fill="#334155"
              style={{ userSelect: "none" }}
            >
              {labelText}
            </text>
            {valueText && (
              <text
                x={lx}
                y={cy + 7}
                textAnchor={anchor}
                fontSize={8.5}
                fill="#64748b"
                style={{ userSelect: "none" }}
              >
                {valueText}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── 카테고리 파이차트 ────────────────────────────────────────────────────────

const PIE_COLORS = ["#94a3b8", "#22c55e", "#f59e0b", "#0ea5e9", "#f43f5e", "#8b5cf6"];

function CategoryPie({ data }: { data: FinancialChartData }) {
  const find = (labels: string[]) => {
    for (const label of labels) {
      const m = data.metrics.find((x) => x.label === label);
      if (m?.current != null) return norm(m.current);
    }
    return null;
  };

  const rev   = find(["매출액", "Revenue"]);
  const gross = find(["매출총이익", "Gross Profit"]);
  const op    = find(["영업이익", "Operating Income"]);
  const ni    = find(["당기순이익", "Net Income"]);
  const unit  = data.metrics.find((m) => ["매출액", "Revenue"].includes(m.label))?.unit ?? "백만원";

  if (!rev || rev <= 0) return null;

  const R    = Math.abs(rev);
  const segments: Array<{ name: string; value: number }> = [];

  if (gross != null && gross > 0) {
    const cogs = R - Math.abs(gross);
    if (cogs > 0)   segments.push({ name: "매출원가", value: cogs });
    if (op != null && op >= 0) {
      const sga = Math.abs(gross) - op;
      if (sga > 0)  segments.push({ name: "판관비", value: sga });
      if (ni != null && ni >= 0) {
        const tax = op - Math.abs(ni);
        if (tax > 0) segments.push({ name: "법인세·기타", value: tax });
        if (ni > 0)  segments.push({ name: "당기순이익", value: Math.abs(ni) });
      } else {
        if (op > 0)  segments.push({ name: "영업이익", value: op });
      }
    }
  } else if (op != null && op >= 0) {
    const opcost = R - op;
    if (opcost > 0) segments.push({ name: "영업비용", value: opcost });
    if (op > 0)     segments.push({ name: "영업이익", value: op });
  }

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
          <Pie
            data={segments}
            cx="50%" cy="50%"
            outerRadius={72} innerRadius={36}
            dataKey="value"
            label={({ name, percent }: { name: string; percent: number }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
            labelLine={false}
            fontSize={11}
          >
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
  const hasRev = data.metrics.some((m) => ["매출액", "Revenue"].includes(m.label) && m.current != null);
  if (!hasRev) return null;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <GitMerge className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">자금 흐름 Sankey</h3>
          <p className="text-xs text-slate-400">
            {data.corp} · {data.currentYear}년 · 노드 두께 = 금액 비례
          </p>
        </div>
      </div>

      <SankeyDiagram data={data} />

      <p className="text-[10px] text-slate-400">
        {data.metrics.some((m) => m.unit === "USD")
          ? "* 단위: USD (SEC EDGAR XBRL 기준, in millions 단위로 보고된 경우 숫자 단위는 백만 달러) · 매출원가·세금은 역산 추정치"
          : "* 매출원가·판관비·세금은 매출·영업이익·순이익으로부터 역산한 추정치입니다."}
      </p>
    </div>
  );
}
