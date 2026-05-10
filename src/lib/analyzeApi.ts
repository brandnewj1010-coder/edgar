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
    await new Promise((r) => setTimeout(r, 500));
    return demoAnalyzeResponse(source, query);
  }

  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source, query }),
  });

  const raw = await res.text();
  let data: AnalyzeResponse & { error?: string; detail?: string };
  try {
    data = JSON.parse(raw) as AnalyzeResponse & {
      error?: string;
      detail?: string;
    };
  } catch {
    const hint =
      res.status === 504 || /timeout|FUNCTION_INVOCATION_TIMEOUT/i.test(raw)
        ? "서버 함수 시간이 초과되었습니다. 오픈다트 목록 다운로드+AI가 한 번에 길어질 수 있어요. 잠시 후 다시 시도하거나 Vercel에서 함수 maxDuration을 확인하세요."
        : res.status >= 500
          ? "서버가 JSON 대신 오류 페이지를 돌려보냈습니다. Vercel 배포 로그(Function Logs)를 확인하세요."
          : "응답 형식이 올바르지 않습니다.";
    const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 280);
    throw new Error(
      snippet ? `${hint} (${res.status}) — ${snippet}` : `${hint} (${res.status})`,
    );
  }

  if (!res.ok) {
    const parts = [data.error, data.detail].filter(
      (s): s is string => typeof s === "string" && s.length > 0,
    );
    const msg = parts.join(" — ") || `요청 실패 (${res.status})`;
    throw new Error(msg);
  }

  return data as AnalyzeResponse;
}
