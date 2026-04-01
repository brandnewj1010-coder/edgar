import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

/** Vercel 플랜에 따라 상한이 다릅니다(무료 플랜은 더 짧을 수 있음). */
export const config = { maxDuration: 60 };

type Source = "dart" | "edgar";

type Body = {
  source: Source;
  query: string;
};

function buildAnalysisPrompt(source: Source, query: string): string {
  const q = query.trim();
  if (source === "dart") {
    return `당신은 금융 교육용 공시 분석 도우미입니다. **Google 검색 도구**를 사용해 최신 공개 정보를 반영하세요.

[국내 DART / 금융감독원 전자공시]
사용자 입력: "${q}" (6자리 종목코드 또는 기업명)

지침:
- 최근 사업보고서·반기·분기보고서 등 정기공시 맥락에서 검색으로 확인할 수 있는 정보를 바탕으로 교육 목적의 분석 리포트를 작성하세요.
- 원문 PDF 전체를 직접 읽을 수는 없을 수 있으므로, 검색 결과와 일반적으로 알려진 공시 구조·용어를 활용하고, 불확실한 부분은 반드시 "검색·교육용 요약"임을 밝히세요.
- 투자 권유나 매수·매도 추천은 하지 마세요.

출력 형식: **마크다운**, 한국어, 다음 섹션을 포함하세요.
# 개요
# 핵심 재무·사업 포인트 (가능하면 간단한 표)
# 현금흐름·재무건전성 관점
# 리스크·주의사항
# 핵심 용어 학습 (EBITDA, 영업이익, 부채비율, 유동비율, 영업활동현금흐름 등 해당되는 용어를 설명과 함께 나열)

전문 용어는 처음 등장 시 짧게 풀어쓰기.`;
  }

  return `You are an educational financial disclosure assistant. **Use Google Search** for recent public information.

[US SEC EDGAR context]
Ticker symbol: "${q}"
Focus on 10-K / 10-Q style themes: business overview, results, liquidity, risk factors, MD&A-style insights.

Rules:
- Educational tone for Korean university students; write the final report in **Korean**.
- No buy/sell recommendations.
- If uncertain, state uncertainty clearly.

Output: **Markdown** with sections:
# 개요
# 핵심 사업·재무 포인트 (간단한 표 가능)
# 현금흐름·재무건전성
# 리스크·주의사항
# 핵심 용어 학습 (영문 약어 병기)

Use clear headings and bullet points where helpful.`;
}

function normalizeQuizItems(raw: unknown): {
  question: string;
  choices: string[];
  correctIndex: number;
}[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const o = item as Record<string, unknown>;
      const question = String(o.question ?? "");
      const choices = Array.isArray(o.choices)
        ? o.choices.map((c) => String(c))
        : [];
      const correctIndex = Number(o.correctIndex ?? 0);
      if (!question || choices.length < 2) return null;
      return { question, choices, correctIndex };
    })
    .filter(Boolean) as {
      question: string;
      choices: string[];
      correctIndex: number;
    }[];
}

function parseQuizFromModelText(text: string): {
  question: string;
  choices: string[];
  correctIndex: number;
}[] {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned) as { quiz?: unknown };
  return normalizeQuizItems(parsed.quiz);
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
    res.status(400).json({ error: "검색어(기업명·종목코드 또는 티커)를 입력하세요." });
    return;
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const userPrompt = buildAnalysisPrompt(source, query);

    const analysis = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const reportMarkdown =
      analysis.text?.trim() ??
      analysis.candidates?.[0]?.content?.parts
        ?.map((p) => ("text" in p ? p.text : ""))
        .join("\n")
        .trim() ??
      "";

    if (!reportMarkdown) {
      res.status(502).json({ error: "모델 응답이 비어 있습니다." });
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
    const groundingQueries = gm?.webSearchQueries ?? [];
    const chunks = gm?.groundingChunks ?? [];
    const sources = chunks
      .map((c) => {
        const w = c.web;
        if (!w?.uri) return null;
        return { title: w.title ?? "", uri: w.uri };
      })
      .filter(Boolean) as { title: string; uri: string }[];

    const quizPrompt = `다음은 공시 분석 리포트(마크다운)입니다. 이 내용만을 근거로 학습자용 객관식 퀴즈 **정확히 4문항**을 만드세요.

규칙:
- 한국어로 작성.
- 각 문항은 정확히 4개의 선택지, 정답은 하나(correctIndex: 0~3).
- 리포트에 근거가 없는 사실은 만들지 마세요.

리포트:
---
${reportMarkdown.slice(0, 12000)}
---

반드시 **JSON만** 출력하세요(설명 문장 없음):
{"quiz":[{"question":"...","choices":["","","",""],"correctIndex":0}]}`;

    const quizRes = await ai.models.generateContent({
      model,
      contents: quizPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const quizText = quizRes.text?.trim() ?? "";
    let quiz: ReturnType<typeof normalizeQuizItems> = [];
    try {
      const parsed = JSON.parse(quizText) as { quiz?: unknown };
      quiz = normalizeQuizItems(parsed.quiz);
    } catch {
      try {
        quiz = parseQuizFromModelText(quizText);
      } catch {
        quiz = [];
      }
    }

    res.status(200).json({
      reportMarkdown,
      quiz,
      groundingQueries,
      sources,
      model,
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
