import { AlertTriangle, TrendingDown, TrendingUp, Minus, Lightbulb, GitBranch, Sparkles } from "lucide-react";
import type { InsightCards as InsightCardsType, InsightSeverity } from "../types";

interface Props {
  cards: InsightCardsType;
}

const SEVERITY_STYLE: Record<InsightSeverity, { bg: string; border: string; dot: string; label: string }> = {
  high: { bg: "bg-rose-50",    border: "border-rose-200",   dot: "bg-rose-500",    label: "중요" },
  mid:  { bg: "bg-amber-50",   border: "border-amber-200",  dot: "bg-amber-400",   label: "주의" },
  low:  { bg: "bg-slate-50",   border: "border-slate-200",  dot: "bg-slate-400",   label: "참고" },
};

function DirectionIcon({ d }: { d: "up" | "down" | "flat" }) {
  if (d === "up")   return <TrendingUp   className="h-4 w-4 text-emerald-500 shrink-0" />;
  if (d === "down") return <TrendingDown className="h-4 w-4 text-rose-500 shrink-0" />;
  return <Minus className="h-4 w-4 text-slate-400 shrink-0" />;
}

export function InsightCards({ cards }: Props) {
  const hasAny =
    cards.watchOuts.length > 0 ||
    cards.anomalies.length > 0 ||
    cards.scenarios.length > 0 ||
    cards.strengths.length > 0;

  if (!hasAny) return null;

  return (
    <div className="mb-6 space-y-4">
      {/* 주목할 점 */}
      {cards.watchOuts.length > 0 && (
        <section>
          <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            주목할 점
          </h3>
          <div className="space-y-2">
            {cards.watchOuts.map((w, i) => {
              const s = SEVERITY_STYLE[w.severity ?? "low"];
              return (
                <div key={i} className={`rounded-xl border ${s.border} ${s.bg} px-4 py-3`}>
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{w.title}
                        <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${s.bg} ${s.border} border`}>
                          {s.label}
                        </span>
                      </p>
                      <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{w.detail}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 이상치 */}
      {cards.anomalies.length > 0 && (
        <section>
          <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            이상치 자동 코멘트
          </h3>
          <div className="space-y-2">
            {cards.anomalies.map((a, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
                <DirectionIcon d={a.direction} />
                <div>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">{a.metric}</span>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{a.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 시나리오 */}
      {cards.scenarios.length > 0 && (
        <section>
          <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <GitBranch className="h-4 w-4 text-violet-500" />
            시나리오 분석
          </h3>
          <div className="space-y-2">
            {cards.scenarios.map((sc, i) => (
              <div key={i} className="rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3">
                <p className="text-[12px] font-semibold text-violet-700">IF · {sc.if}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-600">→ {sc.then}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 강점 */}
      {cards.strengths.length > 0 && (
        <section>
          <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Lightbulb className="h-4 w-4 text-emerald-500" />
            강점 요약
          </h3>
          <div className="flex flex-wrap gap-2">
            {cards.strengths.map((s, i) => (
              <span key={i} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[13px] text-emerald-800">
                ✓ {s}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
