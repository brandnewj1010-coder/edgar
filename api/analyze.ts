import type { VercelRequest, VercelResponse } from "@vercel/node";
import OpenAI from "openai";
import {
  bundleToChartData,
  bundleToMarkdown,
  bundleToPromptSnippet,
  fetchDartFinancialBundle,
  resolveDartCorp,
} from "./dart.js";
import {
  edgarFinancialsToMarkdown,
  fetchEdgarFinancials,
  fetchRecentFilings,
  resolveEdgarCik,
} from "./edgar.js";
import type { QuizItem, FinancialChartData } from "../src/types.js";

export const config = { maxDuration: 60 };

type Source = "dart" | "edgar";
type Body = { source?: string; query?: string };

const MIN_REPORT_CHARS = 180;

// ── 퀴즈 파싱 헬퍼 ──────────────────────────────────────────────────────────
function parseQuizBlock(text: string): QuizItem[] {
  const quiz: QuizItem[] = [];
  // JSON 코드 블록에서 파싱 시도
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (
            typeof item.question === "string" &&
            Array.isArray(item.choices) &&
            typeof item.correctIndex === "number"
          ) {
            quiz.push({
              question: item.question,
              choices: item.choices.map(String),
              correctIndex: item.correctIndex,
              explanation: typeof item.explanation === "string" ? item.explanation : undefined,
            });
          }
        }
      }
    } catch { /* ignore */ }
  }
  return quiz;
}

// ── DART 프롬프트 ─────────────────────────────────────────────────────────────
function buildDartPrompt(q: string, dartContext: string | null): string {
  const name = q.trim();
  const dataBlock = dartContext
    ? `
[오픈다트에서 불러온 실제 공시 수치]
${dartContext}

위 표의 계정명·금액만 근거로 해설하세요. 표에 없는 숫자·추정 실적은 쓰지 마세요.
`
    : `(참고: DART 실시간 공시 표를 가져오지 못했습니다. 교육용 일반 설명으로만 작성하세요.)`;

  return `당신은 **HR 실무자**를 위한 공시 기반 재무 회계 스터디 도우미입니다.
${dataBlock}

분석 대상: "${name}" (기업명 또는 6자리 종목코드)

**출력 형식**: 아래 순서대로 마크다운 한 덩어리만. 빈 섹션 금지. 각 섹션에 실질적인 내용 필수.

# 이 공시에서 잡을 핵심 줄기
(HR 실무자 관점에서 이 기업의 재무 공시를 왜 봐야 하는지 2~3문장)

# 손익·이익률 — HR 실무자가 물어볼 질문 3가지
(인건비·조직 비용이 어떻게 손익에 영향을 주는지 포함)

# 재무 건전성·현금 (핵심만)
(위 표의 자산·부채·현금흐름 계정 인용, HR 관점 코멘트 포함)

# HR KPI ↔ 재무 지표 상관 분석
공시 수치가 있으면 아래 항목을 **수치와 함께** 분석하세요. 수치가 없으면 산식과 의미만:
- 인건비율 (인건비 / 매출액 %)
- 인당 영업이익 (영업이익 ÷ 직원수)
- 인당 매출 (매출액 ÷ 직원수)
- 임원 최대 보수 vs 직원 평균 급여 비교 (Pay Ratio 추정)
- 전년 대비 인력 변화와 수익성 변화의 상관관계

# 오늘의 HR 재무 용어 5개
(HR 실무자가 공시에서 자주 접하는 용어, 짧은 정의 + 공시에서 어디서 보이는지)

# 다음에 DART에서 더 볼 곳
(임원 현황, 직원 현황, 주요 계약, 내부통제 등 HR 관련 섹션 안내)

---

규칙:
- 투자 권유·매수·매도 추천 금지
- 불확실하면 "교육용 요약"임을 밝히기
- HR 실무자에게 의미 있는 해석 중심으로`;
}

// ── EDGAR 프롬프트 ─────────────────────────────────────────────────────────────
function buildEdgarPrompt(q: string, edgarContext: string | null): string {
  const name = q.trim();
  const dataBlock = edgarContext
    ? `
[SEC EDGAR에서 불러온 실제 공시 수치]
${edgarContext}
`
    : `(참고: EDGAR 실시간 수치를 가져오지 못했습니다. 일반 교육용 설명으로만 작성하세요.)`;

  return `You are a study assistant for **HR professionals** learning US corporate financial disclosures.
${dataBlock}

Target company: "${name}"

Output **Markdown only**, in Korean. No empty sections.

# 이 공시에서 HR 실무자가 잡을 핵심
(2~3 sentences from an HR perspective)

# 손익계산서 — HR 담당자가 물어볼 질문 3가지
(include labor cost/compensation impact)

# 재무 건전성 & 현금흐름
(key metrics with HR-relevant commentary)

# HR KPI ↔ 재무 지표 상관 분석
If data is available, include with numbers. If not, explain the formula and significance:
- Labor Cost Ratio (Labor Cost / Revenue %)
- Revenue per Employee
- Operating Income per Employee
- CEO Pay Ratio (if from proxy data)
- Headcount trend vs profitability trend

# 오늘의 HR 재무 용어 5개
(terms HR practitioners see in US filings: Proxy Statement, DEF 14A, NEO, Say-on-Pay, TSR, etc.)

# EDGAR에서 더 볼 곳
(10-K, DEF 14A sections relevant to HR: employee counts, executive comp, risk factors)

---
No investment advice. Say "교육용 요약" if uncertain.`;
}

// ── Fallback 프롬프트 ─────────────────────────────────────────────────────────
function buildFallbackPrompt(source: Source, q: string): string {
  const name = q.trim() || "해당 기업";
  if (source === "dart") {
    return `HR 실무자를 위해 "${name}" 관련 공시·재무제표 읽는 법을 마크다운으로 안내하세요.
각 섹션에 최소 4문장 이상. HR 관점의 해석 포함.

# 공시를 HR 실무자가 보는 이유
# 손익계산서에서 먼저 볼 줄 (인건비 관련)
# 재무상태표·비율 감 잡기
# 현금흐름표와 순이익이 다른 이유
# HR KPI와 재무 지표의 연결 고리
# DART 들어가서 찾는 순서 (단계별)
# 오늘 외울 HR 재무 용어 6개

교육용. 투자 권유 금지.`;
  }
  return `Help HR practitioners understand "${name}" US SEC filings in Korean markdown.
At least 4 sentences per section.

# Why HR pros should read filings
# Income statement first passes (labor cost focus)
# Balance sheet ratios
# Cash flow vs net income
# HR KPI to financial metric connections
# EDGAR navigation steps
# Six HR finance terms today

No investment advice.`;
}

// ── 퀴즈 생성 프롬프트 ────────────────────────────────────────────────────────
function buildQuizPrompt(reportMarkdown: string, company: string): string {
  const snippet = reportMarkdown.slice(0, 3000);
  return `다음 재무 공시 해설 리포트를 바탕으로 HR 실무자를 위한 **객관식 퀴즈 4문제**를 만드세요.

리포트 (일부):
---
${snippet}
---

출력 형식: JSON 코드 블록만. 다른 텍스트 없이.
\`\`\`json
[
  {
    "question": "질문 텍스트",
    "choices": ["선택지A", "선택지B", "선택지C", "선택지D"],
    "correctIndex": 0,
    "explanation": "정답 이유 한 문장"
  }
]
\`\`\`

조건:
- 기업명: ${company}
- 재무 공시에서 파악할 수 있는 내용만
- HR 실무자가 알아야 할 내용 중심 (인건비·임원보수·수익성 등)
- 난이도 적절 (너무 쉽거나 어렵지 않게)
- correctIndex는 0~3 정수`;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function chatWithRetry(
  client: OpenAI,
  params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
  maxRetries = 2,
): Promise<OpenAI.Chat.ChatCompletion> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await client.chat.completions.create(params);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const retryable =
        msg.includes("429") ||
        msg.includes("503") ||
        /rate limit|overloaded|temporarily unavailable/i.test(msg);
      if (retryable && attempt < maxRetries) {
        await sleep((attempt + 1) * 5000);
        continue;
      }
      throw e;
    }
  }
  throw new Error("Max retries exceeded");
}

function extractMessageText(completion: OpenAI.Chat.ChatCompletion): string {
  const c = completion.choices?.[0]?.message?.content;
  return typeof c === "string" ? c.trim() : "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  try {
    if (req.method === "OPTIONS") { res.status(204).end(); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey?.trim()) {
      res.status(500).json({ error: "OPENAI_API_KEY가 서버 환경 변수에 설정되지 않았습니다." });
      return;
    }

    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

    let body: Body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
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

    // ── 데이터 수집 ─────────────────────────────────────────────────────────
    let dartTablesMarkdown = "";
    let dartPromptSnippet: string | null = null;
    let chartData: FinancialChartData | null = null;
    const sources: { title: string; uri: string }[] = [];

    if (source === "dart") {
      const dartKey = process.env.DART_API_KEY?.trim();
      if (dartKey) {
        try {
          const corp = await resolveDartCorp(query, dartKey);
          if (!corp) {
            res.status(400).json({
              error: "상장사를 찾지 못했습니다. **6자리 종목코드**(예: 005930)로 다시 검색해 보세요.",
            });
            return;
          }
          const bundle = await fetchDartFinancialBundle(dartKey, corp);
          dartTablesMarkdown = bundleToMarkdown(bundle);
          dartPromptSnippet = bundleToPromptSnippet(bundle);
          chartData = bundleToChartData(bundle);
          sources.push(
            { title: "오픈다트 (금융감독원 전자공시)", uri: "https://opendart.fss.or.kr/" },
            { title: "DART 공시시스템", uri: "https://dart.fss.or.kr/" },
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[analyze dart]", msg);
          res.status(502).json({
            error: "오픈다트에서 재무제표를 가져오지 못했습니다. DART_API_KEY·기업 지정이 맞는지 확인하거나 잠시 후 다시 시도해 주세요.",
            detail: msg,
          });
          return;
        }
      }
    } else {
      // EDGAR
      try {
        const company = await resolveEdgarCik(query);
        if (company) {
          const [financials, filings] = await Promise.allSettled([
            fetchEdgarFinancials(company.cik),
            fetchRecentFilings(company.cik, ["10-K", "DEF 14A"], 6),
          ]);
          const cd = financials.status === "fulfilled" ? financials.value : null;
          const fl = filings.status === "fulfilled" ? filings.value : [];
          if (cd) {
            chartData = cd;
            dartTablesMarkdown = edgarFinancialsToMarkdown(cd, fl);
            dartPromptSnippet = dartTablesMarkdown;
            sources.push(
              { title: "SEC EDGAR", uri: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${company.cik}&type=10-K` },
              { title: "EDGAR XBRL Viewer", uri: `https://data.sec.gov/submissions/CIK${company.cik}.json` },
            );
          }
        }
      } catch (e) {
        console.warn("[analyze edgar]", e instanceof Error ? e.message : e);
        // EDGAR 실패는 soft fail — OpenAI only로 계속
      }
    }

    const client = new OpenAI({ apiKey });

    try {
      // ── 메인 리포트 생성 ───────────────────────────────────────────────────
      const primaryPrompt =
        source === "dart"
          ? buildDartPrompt(query, dartPromptSnippet)
          : buildEdgarPrompt(query, dartPromptSnippet);

      let completion = await chatWithRetry(client, {
        model,
        messages: [{ role: "user", content: primaryPrompt }],
        max_tokens: 4096,
      });

      let reportMarkdown = extractMessageText(completion);
      let usedFallback = false;

      const hasDartTables = dartTablesMarkdown.length > 400;
      const minLen = hasDartTables ? 80 : MIN_REPORT_CHARS;

      if (reportMarkdown.length < minLen) {
        usedFallback = true;
        completion = await chatWithRetry(client, {
          model,
          messages: [{ role: "user", content: buildFallbackPrompt(source, query) }],
          max_tokens: 4096,
        });
        reportMarkdown = extractMessageText(completion);
      }

      if (!reportMarkdown.trim()) {
        if (dartTablesMarkdown.length > 200) {
          reportMarkdown = "*AI 해설 문단은 비어 있었습니다. 위의 공시 표를 먼저 확인해 주세요.*";
        } else {
          res.status(502).json({ error: "모델 응답이 비어 있습니다. 잠시 후 다시 시도해 주세요." });
          return;
        }
      }

      if (usedFallback && !hasDartTables) {
        reportMarkdown += `\n\n---\n*위 본문은 짧은 응답이 나와 **보조 설명**으로 다시 생성한 것입니다.*\n`;
      } else if (usedFallback && hasDartTables) {
        reportMarkdown += `\n\n---\n*AI 해설이 짧아 보조 생성을 한 단계 더 거쳤습니다.*\n`;
      }

      if (dartTablesMarkdown) {
        reportMarkdown = `${dartTablesMarkdown}\n\n---\n\n## AI 해설 노트\n\n${reportMarkdown}`;
      }

      // ── 퀴즈 생성 (별도 호출) ─────────────────────────────────────────────
      let quiz: QuizItem[] = [];
      try {
        const quizCompletion = await chatWithRetry(client, {
          model,
          messages: [{ role: "user", content: buildQuizPrompt(reportMarkdown, query) }],
          max_tokens: 1200,
        });
        const quizText = extractMessageText(quizCompletion);
        quiz = parseQuizBlock(quizText);
      } catch (e) {
        console.warn("[analyze quiz gen]", e instanceof Error ? e.message : e);
        // 퀴즈 생성 실패는 soft fail
      }

      res.status(200).json({
        reportMarkdown,
        quiz,
        reflectionPrompts: [],
        sankey: null,
        chartData,
        groundingQueries: [],
        sources,
        model: usedFallback ? `${model} (fallback)` : model,
        source,
        query,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[analyze]", message);
      if (dartTablesMarkdown.length > 200) {
        res.status(200).json({
          reportMarkdown: `${dartTablesMarkdown}\n\n---\n\n## AI 해설\n\n*OpenAI 단계에서 오류가 났습니다. 위 표는 공시 원문입니다.*\n\n\`${message.replace(/`/g, "'")}\``,
          quiz: [],
          reflectionPrompts: [],
          sankey: null,
          chartData,
          groundingQueries: [],
          sources,
          model: `${model} (OpenAI 오류, 표만 성공)`,
          source,
          query,
        });
        return;
      }
      res.status(500).json({ error: "분석 중 오류가 발생했습니다.", detail: message });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[analyze unhandled]", message);
    if (!res.headersSent) {
      res.status(500).json({ error: "서버에서 처리하지 못했습니다.", detail: message });
    }
  }
}
