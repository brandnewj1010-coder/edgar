import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

/** Vercel 플랜에 따라 상한이 다릅니다(무료 플랜은 더 짧을 수 있음). */
export const config = { maxDuration: 60 };

type Source = "dart" | "edgar";

type Body = {
  source: Source;
  query: string;
  /** 함께 비교할 두 번째 기업(또는 티커) */
  compareWith?: string;
  /** 비교할 회계 연도 목록 (예: 2023, 2024, 2025) */
  fiscalYears?: number[];
};

function buildAnalysisPrompt(
  source: Source,
  query: string,
  opts: { compareWith?: string; fiscalYears?: number[] },
): string {
  const q = query.trim();
  const compare = opts.compareWith?.trim();
  const years = (opts.fiscalYears ?? [])
    .filter((y) => typeof y === "number" && y >= 1990 && y <= 2100)
    .sort((a, b) => a - b);

  const yearBlock =
    years.length > 0
      ? `\n[연도 비교 요청]\n다음 연도를 **한눈에 비교**할 수 있도록 표·불릿을 활용하세요: ${years.join(", ")}년. 가능하면 동일 지표(매출, 영업이익, 당기순이익, 주요 비용 등)를 나란히 배치하세요.\n`
      : "";

  const compareBlock =
    compare && compare !== q
      ? `\n[기업 간 비교 요청]\n**A: "${q}"** 와 **B: "${compare}"** 를 같은 기준으로 비교하세요. 표 형식으로 사업·재무·리스크 차이를 정리하고, 마지막에 한 줄 요약을 넣으세요.\n`
      : "";

  if (source === "dart") {
    return `당신은 금융 교육용 공시 분석 도우미입니다. **Google 검색 도구**를 사용해 최신 공개 정보를 반영하세요.

[국내 DART / 금융감독원 전자공시]
사용자 입력: "${q}" (6자리 종목코드 또는 기업명)
${compareBlock}${yearBlock}
지침:
- 최근 사업보고서·반기·분기보고서 등 정기공시 맥락에서 검색으로 확인할 수 있는 정보를 바탕으로 교육 목적의 분석 리포트를 작성하세요.
- **간결하게** 작성하세요(각 섹션 과도한 장문은 피하고, 핵심 위주).
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
Primary ticker/symbol: "${q}"
${compare ? `\nAlso compare with: "${compare}" (same report structure, side-by-side where possible).\n` : ""}${yearBlock ? `\nInclude fiscal year comparison for: ${years.join(", ")}.\n` : ""}
Rules:
- Educational tone for Korean university students; write the final report in **Korean**.
- Be **concise** (avoid overly long paragraphs).
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

function normalizeReflection(raw: unknown): {
  title: string;
  prompt: string;
}[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const o = item as Record<string, unknown>;
      const title = String(o.title ?? "").trim();
      const prompt = String(o.prompt ?? "").trim();
      if (!title || !prompt) return null;
      return { title, prompt };
    })
    .filter(Boolean) as { title: string; prompt: string }[];
}

type SankeyNormalized = {
  title?: string;
  unit?: string;
  nodes: Array<{
    id: string;
    label: string;
    category?: "revenue" | "profit" | "expense" | "neutral";
  }>;
  links: Array<{ source: string; target: string; value: number }>;
};

function normalizeSankey(raw: unknown): SankeyNormalized | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const nodesRaw = o.nodes;
  const linksRaw = o.links;
  if (!Array.isArray(nodesRaw) || !Array.isArray(linksRaw)) return null;

  const nodes = nodesRaw
    .map((n) => {
      const x = n as Record<string, unknown>;
      const id = String(x.id ?? "").trim();
      const label = String(x.label ?? x.id ?? "").trim();
      if (!id || !label) return null;
      const cat = x.category;
      const category =
        cat === "revenue" ||
        cat === "profit" ||
        cat === "expense" ||
        cat === "neutral"
          ? cat
          : undefined;
      return { id, label, category };
    })
    .filter(Boolean) as SankeyNormalized["nodes"];

  const links = linksRaw
    .map((l) => {
      const x = l as Record<string, unknown>;
      const source = String(x.source ?? "").trim();
      const target = String(x.target ?? "").trim();
      const value = Number(x.value);
      if (!source || !target || !Number.isFinite(value) || value <= 0)
        return null;
      return { source, target, value };
    })
    .filter(Boolean) as SankeyNormalized["links"];

  if (nodes.length < 2 || links.length < 1) return null;

  const ids = new Set(nodes.map((n) => n.id));
  const okLinks = links.filter((l) => ids.has(l.source) && ids.has(l.target));
  if (okLinks.length < 1) return null;

  return {
    title: typeof o.title === "string" ? o.title : undefined,
    unit: typeof o.unit === "string" ? o.unit : undefined,
    nodes,
    links: okLinks,
  };
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

const EXTRAS_SCHEMA_HINT = `{
  "quiz": [{"question":"","choices":["","","",""],"correctIndex":0}],
  "reflection": [{"title":"","prompt":""}],
  "sankey": {
    "title": "",
    "unit": "억 원",
    "nodes": [{"id":"","label":"","category":"revenue|profit|expense|neutral"}],
    "links": [{"source":"","target":"","value":0}]
  }
}`;

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

  /** 기본은 검색 그라운딩 호환을 고려한 Flash. 더 빠른 모델은 \`GEMINI_MODEL\`로 지정(계정·지역별 지원 다름). */
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

  const compareWithRaw = body.compareWith != null ? String(body.compareWith).trim() : "";
  const compareWith = compareWithRaw || undefined;

  const fiscalYears = Array.isArray(body.fiscalYears)
    ? body.fiscalYears
        .map((y) => Number(y))
        .filter((y) => Number.isFinite(y))
    : undefined;

  const ai = new GoogleGenAI({ apiKey });

  try {
    const userPrompt = buildAnalysisPrompt(source, query, {
      compareWith,
      fiscalYears: fiscalYears ?? [],
    });

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

    /** 퀴즈·생각 과제·샌키를 한 번에 생성해 왕복 1회로 단축 */
    const slice = reportMarkdown.slice(0, 10000);
    const extrasPrompt = `아래는 공시 분석 리포트(마크다운)입니다. 이 내용만을 근거로 JSON 한 덩어리를 출력하세요.

규칙:
- quiz: 객관식 **정확히 4문항**. 한국어, 각 4지선다, correctIndex는 0~3 정수.
- reflection: 서술형 **생각해볼 과제 3개**. 각각 title(짧게), prompt(구체적 질문·토론 과제). 객관식과 중복되지 않게.
- sankey: 리포트에 나온 **숫자·비중**이 있으면 활용해 매출(또는 총수입)→비용/이익 쪽으로 흐르는 샌키 다이어그램용 데이터를 만드세요. 숫자가 불명확하면 교육용으로 **대표적인 구조만** 대략적인 수치로 채우되, unit에 단위를 명시하세요.
- nodes[].category: revenue(매출·수익원)=파란 계열, profit(이익)=초록, expense(비용)=빨강, neutral(합계·중간)=회색 구분용.
- links의 source/target은 반드시 nodes[].id와 일치.

스키마 예시:
${EXTRAS_SCHEMA_HINT}

리포트:
---
${slice}
---

반드시 **JSON만** 출력(설명 문장 없음).`;

    const extrasRes = await ai.models.generateContent({
      model,
      contents: extrasPrompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    });

    const extrasText = extrasRes.text?.trim() ?? "";
    let quiz = normalizeQuizItems([]);
    let reflectionPrompts: { title: string; prompt: string }[] = [];
    let sankey: ReturnType<typeof normalizeSankey> = null;

    try {
      const parsed = JSON.parse(extrasText) as {
        quiz?: unknown;
        reflection?: unknown;
        sankey?: unknown;
      };
      quiz = normalizeQuizItems(parsed.quiz);
      reflectionPrompts = normalizeReflection(parsed.reflection);
      sankey = normalizeSankey(parsed.sankey);
    } catch {
      try {
        const parsed2 = JSON.parse(
          extrasText.replace(/^```json\s*/i, "").replace(/\s*```$/i, ""),
        ) as { quiz?: unknown; reflection?: unknown; sankey?: unknown };
        quiz = normalizeQuizItems(parsed2.quiz);
        reflectionPrompts = normalizeReflection(parsed2.reflection);
        sankey = normalizeSankey(parsed2.sankey);
      } catch {
        try {
          quiz = parseQuizFromModelText(extrasText);
        } catch {
          quiz = [];
        }
      }
    }

    const displayQuery =
      compareWith && compareWith !== query
        ? `${query} vs ${compareWith}`
        : query;

    res.status(200).json({
      reportMarkdown,
      quiz,
      reflectionPrompts,
      sankey,
      groundingQueries,
      sources,
      model,
      source,
      query: displayQuery,
      compareWith,
      fiscalYears: fiscalYears?.length ? fiscalYears : undefined,
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
