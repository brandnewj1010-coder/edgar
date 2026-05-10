import type { AnalyzeResponse, DisclosureSource } from "../types";
import { demoAnalyzeResponse } from "./demoData";

type ResolvedCorp = { corp_code: string; corp_name: string; stock_code: string };

async function dartSearch(query: string): Promise<ResolvedCorp> {
  const res = await fetch("/api/dart-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const raw = await res.text();
  let data: ResolvedCorp & { error?: string };
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(
      res.status === 504 || /timeout|FUNCTION_INVOCATION_TIMEOUT/i.test(raw)
        ? `DART 기업 목록을 가져오는 데 시간이 초과됐습니다. 6자리 종목코드(예: 005930)로 검색해 보세요.`
        : `기업 조회 실패 (${res.status})`,
    );
  }
  if (!res.ok) throw new Error(data.error ?? `기업 조회 실패 (${res.status})`);
  return data;
}

async function callAnalyze(
  body: Record<string, unknown>,
): Promise<AnalyzeResponse> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let data: AnalyzeResponse & { error?: string; detail?: string };
  try {
    data = JSON.parse(raw) as AnalyzeResponse & { error?: string; detail?: string };
  } catch {
    const hint =
      res.status === 504 || /timeout|FUNCTION_INVOCATION_TIMEOUT/i.test(raw)
        ? "서버 함수 시간이 초과되었습니다. 잠시 후 다시 시도하거나 Vercel에서 함수 maxDuration을 확인하세요."
        : res.status >= 500
          ? "Vercel 서버 함수가 실행 중에 종료되었습니다. 메모리·시간 초과·배포 오류일 수 있어요. Vercel → 해당 배포 → Functions / Runtime Logs를 확인하고, 최신 커밋이 배포됐는지도 봐 주세요."
          : "응답 형식이 올바르지 않습니다.";
    const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 280);
    throw new Error(snippet ? `${hint} (${res.status}) — ${snippet}` : `${hint} (${res.status})`);
  }

  if (!res.ok) {
    const parts = [data.error, data.detail].filter(
      (s): s is string => typeof s === "string" && s.length > 0,
    );
    throw new Error(parts.join(" — ") || `요청 실패 (${res.status})`);
  }

  return data as AnalyzeResponse;
}

export async function requestAnalyze(
  source: DisclosureSource,
  query: string,
  opts?: { demo?: boolean },
): Promise<AnalyzeResponse> {
  const useDemo = opts?.demo === true || import.meta.env.VITE_USE_DEMO === "1";
  if (useDemo) {
    await new Promise((r) => setTimeout(r, 500));
    return demoAnalyzeResponse(source, query);
  }

  if (source === "dart") {
    // 1단계: corp 조회 (최대 30s, XML 다운로드 포함)
    const corp = await dartSearch(query);
    // 2단계: 분석 (최대 60s, XML 생략 — corp_code 이미 확보)
    return callAnalyze({
      source,
      query,
      resolvedCorpCode: corp.corp_code,
      resolvedCorpName: corp.corp_name,
      resolvedStockCode: corp.stock_code,
    });
  }

  return callAnalyze({ source, query });
}
