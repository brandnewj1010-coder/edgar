import { ResponsiveSankey } from "@nivo/sankey";
import type { SankeyChartData, SankeyNodeCategory } from "../types";

function colorForCategory(cat: SankeyNodeCategory | undefined): string {
  switch (cat) {
    case "revenue":
      return "#2563eb";
    case "profit":
      return "#16a34a";
    case "expense":
      return "#dc2626";
    default:
      return "#64748b";
  }
}

export function SankeyViz({ data }: { data: SankeyChartData }) {
  const categoryById = new Map(
    data.nodes.map((n) => [n.id, n.category] as const),
  );

  const nivoData = {
    nodes: data.nodes.map((n) => ({
      id: n.id,
      label: n.label,
    })),
    links: data.links.map((l) => ({
      source: l.source,
      target: l.target,
      value: l.value,
    })),
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-100 bg-white">
      <div className="h-[min(420px,70vw)] min-h-[280px] w-full min-w-[280px]">
        <ResponsiveSankey
          data={nivoData}
          margin={{ top: 24, right: 140, bottom: 24, left: 48 }}
          align="justify"
          sort="auto"
          layout="horizontal"
          nodeWidth={14}
          nodePadding={20}
          nodeOpacity={1}
          nodeHoverOpacity={1}
          nodeThickness={10}
          nodeSpacing={20}
          nodeBorderWidth={0}
          linkOpacity={0.45}
          linkHoverOpacity={0.75}
          linkContract={2}
          enableLinkGradient
          labelPosition="outside"
          labelOrientation="horizontal"
          labelPadding={12}
          labelTextColor={{ from: "color", modifiers: [["darker", 1.2]] }}
          theme={{
            labels: { text: { fontSize: 11, fontWeight: 500 } },
          }}
          colors={{ scheme: "set2" }}
          nodeColor={(node) =>
            colorForCategory(
              categoryById.get(String(node.id)) as SankeyNodeCategory,
            )
          }
          nodeTooltip={({ node }) => (
            <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-lg">
              <span className="font-semibold text-slate-900">{node.label}</span>
            </div>
          )}
          linkTooltip={({ link }) => (
            <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-lg">
              <span className="text-slate-700">
                흐름: {Math.round(Number(link.value))}
                {data.unit ? ` ${data.unit}` : ""}
              </span>
            </div>
          )}
        />
      </div>
      <div className="flex flex-wrap gap-3 border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-blue-600" /> 매출·수익원
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-green-600" /> 이익
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-red-600" /> 비용
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-slate-500" /> 합계·중간
        </span>
      </div>
    </div>
  );
}
