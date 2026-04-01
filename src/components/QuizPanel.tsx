import { useState } from "react";
import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import type { QuizItem } from "../types";

export function QuizPanel({ quiz }: { quiz: QuizItem[] }) {
  const [picked, setPicked] = useState<Record<number, number | undefined>>({});
  const [revealed, setRevealed] = useState(false);

  if (!quiz.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-4 text-center text-xs leading-relaxed text-slate-500">
        아직 퀴즈가 없습니다. 분석을 완료하면 AI가 리포트 기반 문항을 생성합니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <CircleHelp className="h-3.5 w-3.5" />
          </span>
          분석 퀴즈
        </h3>
        <button
          type="button"
          onClick={() => {
            setRevealed((r) => {
              const next = !r;
              if (!next) setPicked({});
              return next;
            });
          }}
          className="rounded-full border border-indigo-200/80 bg-white px-3 py-1 text-[11px] font-medium text-indigo-700 shadow-sm transition hover:bg-indigo-50"
        >
          {revealed ? "다시 풀기" : "정답 공개"}
        </button>
      </div>
      <ol className="space-y-3">
        {quiz.map((item, qi) => (
          <li
            key={qi}
            className="rounded-xl border border-slate-100 bg-slate-50/40 p-3.5"
          >
            <p className="text-sm font-medium text-slate-800">
              {qi + 1}. {item.question}
            </p>
            <ul className="mt-2 space-y-1.5">
              {item.choices.map((c, ci) => {
                const selected = picked[qi] === ci;
                const correct = item.correctIndex === ci;
                const show = revealed;
                return (
                  <li key={ci}>
                    <button
                      type="button"
                      disabled={revealed}
                      onClick={() =>
                        setPicked((prev) => ({ ...prev, [qi]: ci }))
                      }
                      className={`flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition ${
                        show && correct
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : show && selected && !correct
                            ? "border-rose-200 bg-rose-50 text-rose-900"
                            : selected
                              ? "border-indigo-200 bg-indigo-50 text-indigo-900"
                              : "border-transparent bg-slate-50 text-slate-700 hover:border-slate-200"
                      }`}
                    >
                      <span className="mt-0.5 shrink-0">
                        {show && correct ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : show && selected && !correct ? (
                          <XCircle className="h-4 w-4 text-rose-500" />
                        ) : (
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px]">
                            {ci + 1}
                          </span>
                        )}
                      </span>
                      <span>{c}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
