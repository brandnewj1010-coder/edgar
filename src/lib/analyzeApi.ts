import type { AnalyzeResponse, DisclosureSource } from "../types";
import { demoAnalyzeResponse } from "./demoData";

export async function requestAnalyze(
  source: DisclosureSource,
  query: string,
  opts?: {
    demo?: boolean;
    compareWith?: string;
    fiscalYears?: number[];
  },
): Promise<AnalyzeResponse> {
  const useDemo =
    opts?.demo === true || import.meta.env.VITE_USE_DEMO === "1";
  if (useDemo) {
    await new Promise((r) => setTimeout(r, 600));
    return demoAnalyzeResponse(source, query, {
      compareWith: opts?.compareWith,
      fiscalYears: opts?.fiscalYears,
    });
  }

  const body: Record<string, unknown> = { source, query };
  const cw = opts?.compareWith?.trim();
  if (cw) body.compareWith = cw;
  if (opts?.fiscalYears?.length) body.fiscalYears = opts.fiscalYears;

  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as AnalyzeResponse & {
    error?: string;
    detail?: string;
  };

  if (!res.ok) {
    const parts = [data.error, data.detail].filter(
      (s): s is string => typeof s === "string" && s.length > 0,
    );
    const msg =
      parts.join(" — ") || `요청 실패 (${res.status})`;
    throw new Error(msg);
  }

  return data as AnalyzeResponse;
}
