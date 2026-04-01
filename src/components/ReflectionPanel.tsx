import { Lightbulb } from "lucide-react";
import type { ReflectionItem } from "../types";

export function ReflectionPanel({ items }: { items: ReflectionItem[] }) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-4 text-center text-xs leading-relaxed text-slate-500">
        생각해볼 과제가 아직 없습니다. 분석을 다시 실행하면 리포트 기반 과제가 생성됩니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <Lightbulb className="h-3.5 w-3.5" />
          </span>
          생각해볼 과제
        </h3>
        <span className="text-[10px] font-medium text-slate-400">
          서술·토론 (객관식과 별도)
        </span>
      </div>
      <ol className="space-y-3">
        {items.map((item, i) => (
          <li
            key={i}
            className="rounded-xl border border-amber-100/90 bg-amber-50/30 p-3.5"
          >
            <p className="text-[12px] font-semibold text-amber-950">
              {i + 1}. {item.title}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-700">
              {item.prompt}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
