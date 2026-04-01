import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FINANCIAL_TERMS } from "../data/financialTerms";
import { RichTextWithTerms } from "./TermSpan";

const wrap =
  (Tag: "p" | "li" | "td" | "th" | "blockquote" | "strong" | "em") =>
  ({
    children,
  }: {
    children?: ReactNode;
  }) => (
    <Tag>
      <RichTextWithTerms terms={FINANCIAL_TERMS}>{children}</RichTextWithTerms>
    </Tag>
  );

export function MarkdownReport({ markdown }: { markdown: string }) {
  return (
    <div className="report-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: wrap("p"),
          li: wrap("li"),
          td: wrap("td"),
          th: wrap("th"),
          blockquote: wrap("blockquote"),
          strong: wrap("strong"),
          em: wrap("em"),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
