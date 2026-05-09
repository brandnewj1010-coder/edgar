import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FINANCIAL_TERMS } from "../data/financialTerms";
import { isNegativeText, isNumericCell } from "../lib/formatNumber";
import { RichTextWithTerms } from "./TermSpan";

const terms = FINANCIAL_TERMS;

const wrap =
  (Tag: "p" | "th" | "strong" | "em") =>
  ({ children }: { children?: ReactNode }) => (
    <Tag>
      <RichTextWithTerms terms={terms}>{children}</RichTextWithTerms>
    </Tag>
  );

function H1({ children }: { children?: ReactNode }) {
  return (
    <h1 className="report-h1">
      <RichTextWithTerms terms={terms}>{children}</RichTextWithTerms>
    </h1>
  );
}

function H2({ children }: { children?: ReactNode }) {
  return (
    <h2 className="report-h2">
      <RichTextWithTerms terms={terms}>{children}</RichTextWithTerms>
    </h2>
  );
}

function H3({ children }: { children?: ReactNode }) {
  return (
    <h3 className="report-h3">
      <RichTextWithTerms terms={terms}>{children}</RichTextWithTerms>
    </h3>
  );
}

function Blockquote({ children }: { children?: ReactNode }) {
  return (
    <blockquote className="report-quote">
      <RichTextWithTerms terms={terms}>{children}</RichTextWithTerms>
    </blockquote>
  );
}

function Hr() {
  return (
    <div className="report-hr-wrap" role="separator">
      <span className="report-hr-line" />
      <span className="report-hr-dot" aria-hidden />
      <span className="report-hr-line" />
    </div>
  );
}

function Table({ children }: { children?: ReactNode }) {
  return (
    <div className="report-table-outer">
      <table className="report-table">{children}</table>
    </div>
  );
}

function childrenToString(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(childrenToString).join("");
  if (typeof node === "object" && node && "props" in node) {
    return childrenToString(
      (node as { props: { children?: ReactNode } }).props.children,
    );
  }
  return "";
}

function Td({ children }: { children?: ReactNode }) {
  const text = childrenToString(children);
  const numeric = isNumericCell(text);
  const negative = numeric && isNegativeText(text);
  const cls = negative ? "is-negative" : undefined;
  return (
    <td className={cls}>
      <RichTextWithTerms terms={terms}>{children}</RichTextWithTerms>
    </td>
  );
}

function Li({ children }: { children?: ReactNode }) {
  return (
    <li className="report-li">
      <RichTextWithTerms terms={terms}>{children}</RichTextWithTerms>
    </li>
  );
}

export function MarkdownReport({ markdown }: { markdown: string }) {
  return (
    <article className="report-md report-editorial selection:bg-indigo-100/90 selection:text-indigo-950">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: H1,
          h2: H2,
          h3: H3,
          p: wrap("p"),
          li: Li,
          td: Td,
          th: wrap("th"),
          blockquote: Blockquote,
          strong: wrap("strong"),
          em: wrap("em"),
          hr: Hr,
          table: Table,
          ul: ({ children }) => <ul className="report-ul">{children}</ul>,
          ol: ({ children }) => <ol className="report-ol">{children}</ol>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
