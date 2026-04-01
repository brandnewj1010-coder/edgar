import { BookMarked, Link2 } from "lucide-react";
import { FINANCIAL_TERMS } from "../data/financialTerms";
import type { FinancialTermEntry, QuizItem } from "../types";
import { QuizPanel } from "./QuizPanel";

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
  sources,
  groundingQueries,
}: {
  reportMarkdown: string;
  quiz: QuizItem[];
  sources: { title: string; uri: string }[];
  groundingQueries: string[];
}) {
  const terms = termsInReport(reportMarkdown);

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-950">
          <BookMarked className="h-4 w-4 text-indigo-600" />
          리포트 속 용어
        </h3>
        {terms.length === 0 ? (
          <p className="text-xs text-slate-500">
            사전에 등록된 용어가 리포트에서 감지되지 않았습니다. Phase 2에서
            용어 DB를 확장할 수 있습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {terms.map((t) => (
              <li
                key={t.term}
                className="rounded-lg border border-slate-100 bg-white p-2.5 text-xs shadow-sm"
              >
                <span className="font-semibold text-indigo-900">{t.term}</span>
                <p className="mt-1 leading-snug text-slate-600">{t.definition}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(sources.length > 0 || groundingQueries.length > 0) && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-950">
            <Link2 className="h-4 w-4 text-indigo-600" />
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

      <section className="mt-auto border-t border-slate-100 pt-4">
        <QuizPanel quiz={quiz} />
      </section>
    </div>
  );
}
