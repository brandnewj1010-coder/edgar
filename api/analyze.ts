import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

/** Vercel 플랜에 따라 상한이 다릅니다 */
export const config = { maxDuration: 60 };

type Source = "dart" | "edgar";

type Body = {
  source?: string;
  query?: string;
};

/** 본문이 너무 짧으면 검색 없이 재시도 */
const MIN_REPORT_CHARS = 180;

function buildPrimaryPrompt(source: Source, q: string): string {
  const name = q.trim();
  if (source === "dart") {
    return `당신은 **회계·재무를 공부하는 직장인**을 위한 공시 읽기 도우미입니다.
**Google 검색**으로 DART·공시·최근 보도 맥락을 참고하세요.

분석 대상: "${name}" (기업명 또는 6자리 종목코드)

**출력은 마크다운 한 덩어리만.** 빈 응답 금지. 각 # 제목 아래에 반드시 여러 문단 또는 표로 채우세요.

# 오늘 이 공시에서 잡을 줄기
# 손익·이익률 — 직장인이 스스로 물어볼 질문 3가지
# 재무 건전성·현금 (핵심만)
# 오늘의 용어 5개 (짧은 정의와 함께)
# 다음에 DART에서 더 볼 곳

- 투자 권유·매수·매도 추천 금지.
- 불확실하면 "교육용 요약"임을 밝히기.`;
  }
  return `Help Korean office workers study US SEC filings. **Use Google Search.** Symbol/ticker: "${name}"

Output **Markdown only**. No empty reply. Fill every # section with real paragraphs or a small table.

# What to skim first
# Income statement — 3 questions a learner should ask
# Balance sheet & cash — essentials
# Five terms today (short definitions)
# Where to look next on EDGAR

No investment advice. If uncertain, say it's educational summary.`;
}

function buildFallbackPrompt(source: Source, q: string): string {
  const name = q.trim() || "해당 기업";
  if (source === "dart") {
    return `검색 없이, 회계를 공부하는 직장인에게 "${name}" 관련 **공시·재무제표 읽는 법**만 마크다운으로 안내하세요.
**반드시** 아래 모든 섹션을 채우고, 각 섹션에 최소 4문장 이상 쓰세요.

# 공시를 왜 직장인이 보나
# 손익계산서에서 먼저 볼 줄
# 재무상태표·비율 감 잡기
# 현금흐름표와 순이익이 다른 이유
# DART 들어가서 찾는 순서 (단계별로 짧게)
# 오늘 외울 용어 6개

교육용. 투자 권유 금지.`;
  }
  return `Markdown only in Korean. No search. Help office workers study "${name}" filings. At least 4 sentences per section.

# Why filings matter
# Income statement first passes
# Balance sheet ratios
# Cash flow vs net income
# EDGAR navigation in steps
# Six terms today

No investment advice.`;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function generateWithRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  maxRetries = 2,
): Promise<Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const retryable =
        msg.includes("429") ||
        msg.includes("503") ||
        msg.includes("UNAVAILABLE") ||
        msg.toLowerCase().includes("quota") ||
        msg.toLowerCase().includes("high demand");
      if (retryable && attempt < maxRetries) {
        await sleep((attempt + 1) * 5000);
        continue;
      }
      throw e;
    }
  }
  throw new Error("Max retries exceeded");
}

function extractModelText(
  analysis: Awaited<
    ReturnType<GoogleGenAI["models"]["generateContent"]>
  >,
): string {
  const direct = analysis.text?.trim();
  if (direct) return direct;
  const cands = analysis.candidates;
  if (!cands?.length) return "";
  const out: string[] = [];
  for (const c of cands) {
    const parts = c.content?.parts;
    if (!parts) continue;
    for (const p of parts) {
      if (
        p &&
        typeof p === "object" &&
        "text" in p &&
        typeof (p as { text?: string }).text === "string"
      ) {
        out.push((p as { text: string }).text);
      }
    }
  }
  return out.join("\n").trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "GEMINI_API_KEY가 서버 환경 변수에 설정되지 않았습니다.",
    });
    return;
  }

  const model =
    process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  let body: Body;
  try {
    body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: "잘못된 JSON 본문입니다." });
    return;
  }

  const source = body.source === "edgar" ? "edgar" : "dart";
  const query = String(body.query ?? "").trim();
  if (!query) {
    res.status(400).json({
      error: "검색어(기업명·종목코드 또는 티커)를 입력하세요.",
    });
    return;
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    let analysis = await generateWithRetry(ai, {
      model,
      contents: buildPrimaryPrompt(source, query),
      config: {
        tools: [{ googleSearch: {} }],
        maxOutputTokens: 8192,
      },
    });

    let reportMarkdown = extractModelText(analysis);
    let usedFallback = false;

    if (reportMarkdown.length < MIN_REPORT_CHARS) {
      usedFallback = true;
      analysis = await generateWithRetry(ai, {
        model,
        contents: buildFallbackPrompt(source, query),
        config: {
          maxOutputTokens: 8192,
        },
      });
      reportMarkdown = extractModelText(analysis);
    }

    if (!reportMarkdown.trim()) {
      res.status(502).json({
        error: "모델 응답이 비어 있습니다. 잠시 후 다시 시도해 주세요.",
      });
      return;
    }

    const cand = analysis.candidates?.[0] as
      | {
          groundingMetadata?: {
            webSearchQueries?: string[];
            groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
          };
        }
      | undefined;
    const gm = cand?.groundingMetadata;
    const groundingQueries = usedFallback ? [] : (gm?.webSearchQueries ?? []);
    const chunks = usedFallback ? [] : (gm?.groundingChunks ?? []);
    const sources = chunks
      .map((c) => {
        const w = c.web;
        if (!w?.uri) return null;
        return { title: w.title ?? "", uri: w.uri };
      })
      .filter(Boolean) as { title: string; uri: string }[];

    if (usedFallback) {
      reportMarkdown = `${reportMarkdown}\n\n---\n*위 본문은 검색 연동 없이 생성된 **보조 설명**입니다. 최신 수치는 DART·공시 원문과 함께 확인하세요.*\n`;
    }

    res.status(200).json({
      reportMarkdown,
      quiz: [],
      reflectionPrompts: [],
      sankey: null,
      groundingQueries,
      sources,
      model: usedFallback ? `${model} (fallback)` : model,
      source,
      query,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[analyze]", message);
    res.status(500).json({
      error: "분석 중 오류가 발생했습니다.",
      detail: message,
    });
  }
}
