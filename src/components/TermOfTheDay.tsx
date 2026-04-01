import { Lightbulb } from "lucide-react";
import { useMemo } from "react";
import { getTermOfTheDay } from "../lib/termOfDay";

export function TermOfTheDay() {
  const term = useMemo(() => getTermOfTheDay(), []);

  return (
    <div className="rounded-2xl border border-amber-100/90 bg-gradient-to-br from-amber-50/90 to-orange-50/40 p-3.5 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-amber-900/90">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <Lightbulb className="h-3.5 w-3.5" />
        </span>
        오늘의 금융 용어
      </div>
      <p className="text-[13px] font-semibold text-slate-900">{term.term}</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">
        {term.definition}
      </p>
    </div>
  );
}
