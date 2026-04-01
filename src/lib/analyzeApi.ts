import type { AnalyzeResponse, DisclosureSource } from "../types";
import { demoAnalyzeResponse } from "./demoData";

export async function requestAnalyze(
  source: DisclosureSource,
  query: string,
  opts?: { demo?: boolean },
): Promise<AnalyzeResponse> {
  const useDemo =
    opts?.demo === true || import.meta.env.VITE_USE_DEMO === "1";
  if (useDemo) {
    await new Promise((r) => setTimeout(r, 600));
    return demoAnalyzeResponse(source, query);
  }

  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source, query }),
  });

  const data = (await res.json()) as AnalyzeResponse & { error?: string; detail?: string };

  if (!res.ok) {
    throw new Error(data.error || data.detail || `요청 실패 (${res.status})`);
  }

  return data as AnalyzeResponse;
}
