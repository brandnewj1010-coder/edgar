import {
  cloneElement,
  Fragment,
  isValidElement,
  useMemo,
  useState,
} from "react";
import type { FinancialTermEntry } from "../types";

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 긴 구문을 먼저 매칭하도록 패턴 구성 */
export function buildTermPattern(terms: FinancialTermEntry[]) {
  const pieces: { label: string; entry: FinancialTermEntry }[] = [];
  for (const e of terms) {
    pieces.push({ label: e.term, entry: e });
    e.aliases?.forEach((a) => pieces.push({ label: a, entry: e }));
  }
  pieces.sort((a, b) => b.label.length - a.label.length);
  const alternation = pieces.map((p) => escapeReg(p.label)).join("|");
  if (!alternation) return null;
  return { re: new RegExp(`(${alternation})`, "gi"), pieces };
}

function lookupMatched(
  matched: string,
  pieces: { label: string; entry: FinancialTermEntry }[],
): FinancialTermEntry | undefined {
  const m = matched.trim();
  for (const p of pieces) {
    if (p.label.toLowerCase() === m.toLowerCase()) return p.entry;
  }
  return undefined;
}

export function RichTextWithTerms({
  children,
  terms,
}: {
  children: React.ReactNode;
  terms: FinancialTermEntry[];
}) {
  const pattern = useMemo(() => buildTermPattern(terms), [terms]);
  return <>{mapChildren(children, pattern)}</>;
}

function mapChildren(
  node: React.ReactNode,
  pattern: ReturnType<typeof buildTermPattern>,
): React.ReactNode {
  if (node == null || typeof node === "boolean") return null;
  if (typeof node === "string") {
    return <HighlightPlain text={node} pattern={pattern} />;
  }
  if (typeof node === "number") return node;
  if (Array.isArray(node)) {
    return node.map((c, i) => (
      <Fragment key={i}>{mapChildren(c, pattern)}</Fragment>
    ));
  }
  if (isValidElement(node)) {
    const t = node.type;
    if (t === "code" || t === "pre") return node;
    const ch = node.props.children as React.ReactNode;
    if (ch === undefined) return node;
    return cloneElement(node, {
      children: mapChildren(ch, pattern),
    } as never);
  }
  return node;
}

function HighlightPlain({
  text,
  pattern,
}: {
  text: string;
  pattern: ReturnType<typeof buildTermPattern>;
}) {
  if (!pattern) return <>{text}</>;
  const { re, pieces } = pattern;
  const out: React.ReactNode[] = [];
  let last = 0;
  const copy = new RegExp(re.source, re.flags);
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = copy.exec(text)) !== null && guard++ < 5000) {
    if (m.index > last) {
      out.push(text.slice(last, m.index));
    }
    const matched = m[0];
    const entry = lookupMatched(matched, pieces);
    if (entry) {
      out.push(
        <TermPopover key={`${m.index}-${out.length}`} entry={entry} label={matched} />,
      );
    } else {
      out.push(matched);
    }
    last = m.index + matched.length;
    if (matched.length === 0) break;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

function TermPopover({
  entry,
  label,
}: {
  entry: FinancialTermEntry;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="term-popover relative inline"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      {label}
      {open && (
        <span
          className="absolute left-0 top-full z-50 mt-1 w-[min(100vw-2rem,22rem)] rounded-lg border border-indigo-100 bg-white p-3 text-left text-xs font-normal text-slate-700 shadow-lg ring-1 ring-black/5"
          role="tooltip"
        >
          <span className="block font-semibold text-indigo-900">{entry.term}</span>
          <span className="mt-1 block leading-snug">{entry.definition}</span>
          <span className="mt-2 block text-slate-600">{entry.meaning}</span>
          {entry.formula ? (
            <span className="mt-2 block font-mono text-[11px] text-slate-500">
              {entry.formula}
            </span>
          ) : null}
        </span>
      )}
    </span>
  );
}
