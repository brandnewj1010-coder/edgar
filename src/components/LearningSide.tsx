import { BookMarked, Link2 } from "lucide-react";
import { FINANCIAL_TERMS } from "../data/financialTerms";
import type { FinancialTermEntry, QuizItem, ReflectionItem } from "../types";
import { QuizPanel } from "./QuizPanel";
import { ReflectionPanel } from "./ReflectionPanel";

function termsInReport(markdown: string): FinancialTermEntry[] {
  const lower = markdown.toLowerCase();
  const seen = new Set<string>();
  const out: FinancialTermEntry[] = [];
  for (const e of FINANCIAL_TERMS) {
    const labels = [e.term, ...(e.aliases ?? [])];
    const hit = labels.some((l) => lower.includes(l.toLowerCase()));
    if (hit && !seen.has(e.term)) {
      seen.add(e.term);
      out.push(e);
    }
  }
  return out;
}

export function LearningSide({
  reportMarkdown,
  quiz,
  reflectionPrompts,
  sources,
  groundingQueries,
}: {
  reportMarkdown: string;
  quiz: QuizItem[];
  reflectionPrompts: ReflectionItem[];
  sources: { title: string; uri: string }[];
  groundingQueries: string[];
}) {
  const terms = termsInReport(reportMarkdown);

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4 md:p-5">
      <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-slate-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <BookMarked className="h-3.5 w-3.5" />
          </span>
          리포트 속 용어
        </h3>
        {terms.length === 0 ? (
          <p className="text-xs leading-relaxed text-slate-500">
            사전에 등록된 용어가 리포트에서 감지되지 않았습니다. Phase 2에서
            용어 DB를 확장할 수 있습니다.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {terms.map((t) => (
              <li
                key={t.term}
                className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs leading-relaxed"
              >
                <span className="font-semibold text-indigo-900">{t.term}</span>
                <p className="mt-1.5 text-slate-600">{t.definition}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(sources.length > 0 || groundingQueries.length > 0) && (
        <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Link2 className="h-3.5 w-3.5" />
            </span>
            검색·근거 힌트
          </h3>
          {groundingQueries.length > 0 && (
            <ul className="mb-2 list-inside list-disc text-xs text-slate-600">
              {groundingQueries.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          )}
          {sources.length > 0 && (
            <ul className="space-y-1">
              {sources.slice(0, 6).map((s, i) => (
                <li key={i}>
                  <a
                    href={s.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="line-clamp-2 text-xs text-indigo-600 hover:underline"
                  >
                    {s.title || s.uri}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
        <ReflectionPanel items={reflectionPrompts} />
      </section>

      <section className="mt-auto rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
        <QuizPanel quiz={quiz} />
      </section>
    </div>
  );
}
