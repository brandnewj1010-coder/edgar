import { BookOpen, Check, Copy, Printer } from "lucide-react";
import { useCallback, useState } from "react";
import { estimateReadingMinutes } from "../lib/readingTime";

export function ReportActions({
  reportMarkdown,
}: {
  reportMarkdown: string;
}) {
  const [copied, setCopied] = useState(false);
  const minutes = estimateReadingMinutes(reportMarkdown);

  const copyMd = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(reportMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [reportMarkdown]);

  const print = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100/90 px-3 py-1 text-[11px] font-medium text-slate-600">
        <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
        예상 읽기 {minutes}분
      </span>
      <button
        type="button"
        onClick={copyMd}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            복사됨
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            마크다운 복사
          </>
        )}
      </button>
      <button
        type="button"
        onClick={print}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50 print:hidden"
      >
        <Printer className="h-3.5 w-3.5" />
        인쇄
      </button>
    </div>
  );
}
