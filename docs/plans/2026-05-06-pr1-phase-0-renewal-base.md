# PR 1 — Phase 0 리뉴얼 베이스 패치 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 외부 API 의존 없이 사용량 보호·시각 가독성·기본 카피를 끌어올려, 이후 PR(데이터 직연동·시각화·학습 모드)이 올라탈 베이스를 만든다.

**Architecture:** 변경은 4개 축에 집중한다. ① 백엔드 호출 보호(인메모리 IP 기반 rate limit), ② 모델 출력 schema 확장(헤드라인 1줄 추가), ③ 마크다운 표/차트 가독성 CSS·툴팁 패치, ④ 메인 컨테이너 와이드화 + 디스클레이머 상시 노출. 외부 API 신규 의존 0, 라이브러리 추가 0.

**Tech Stack:** React 18 + Vite 5 + TypeScript / Tailwind CSS / Vercel Serverless Functions / Google Gemini 2.5 Flash (`@google/genai`) / `@nivo/sankey`.

---

## 검증 전략 (이 레포는 자동 테스트 인프라가 없음)

`package.json`에 테스트 스크립트가 없고 vitest/jest가 설치되어 있지 않다. PR 1 범위에서는 테스트 프레임워크 도입을 보류하고, **다음 두 가지로 verify** 한다 (PR 2에서 vitest 도입 별도 검토).

1. **TypeScript 빌드 통과** — `npm run build` 성공 (Vite + tsc 컴파일).
2. **Vercel Preview URL 시각 검증** — feature 브랜치 push 시 자동으로 생성되는 Preview URL에서 다음 4개 시나리오를 수동 확인.
   - 데모 모드 켠 상태 분석 → 헤드라인·표·Sankey가 새 디자인으로 보이는가
   - 동일 IP에서 11번 분석 시도 → 11번째에 429 + 한국어 안내 메시지가 뜨는가 (실서버 한정)
   - 와이드 모니터에서 본문이 1280px까지 펼쳐지는가
   - 디스클레이머 박스가 상단에 항상 보이는가

`docs/plans/2026-05-06-pr1-phase-0-renewal-base.md` 와 mockup 두 파일은 빌드 산출물이 아니므로 이번 PR에 함께 포함한다.

---

## File Structure

이번 PR이 건드리거나 만드는 모든 파일.

| 분류 | 경로 | 책임 |
|------|------|------|
| 신규 | `src/lib/formatNumber.ts` | 천 단위·음수 판별 등 표시 유틸 |
| 신규 | `api/_rateLimit.ts` | IP 기반 인메모리 사용량 제한 |
| 수정 | `api/analyze.ts` | rate limit 적용, 헤드라인 프롬프트·추출, 응답에 headline 추가 |
| 수정 | `src/types.ts` | `AnalyzeResponse.headline?: string` 추가 |
| 수정 | `src/lib/demoData.ts` | 데모 응답에 headline 필드 |
| 수정 | `src/lib/analysisStorage.ts` | meta에 headline 저장/복원 |
| 수정 | `src/index.css` | 표 우측정렬·천단위·헤더 강조·짝수행·음수 빨강 |
| 수정 | `src/components/MarkdownReport.tsx` | td/th에 numeric/negative 클래스 자동 적용, li 중복 정의 제거 |
| 수정 | `src/components/SankeyViz.tsx` | 노드 툴팁에 값·단위, 링크 툴팁 풍부화, 라벨 포맷 |
| 수정 | `src/App.tsx` | max-w-3xl→max-w-[1280px], 헤드라인 표시, 디스클레이머 상시 노출 |
| (추가) | `docs/specs/2026-05-06-insight-analyzer-renewal-design.md` | 이미 존재, untracked → 함께 add |
| (추가) | `mockup/renewal-v1.html`, `mockup/renewal-learning-v1.html` | 이미 존재, untracked → 함께 add |

---

## Tasks

각 task는 한 commit. step은 2~5분 단위.

---

### Task 1: feature 브랜치 + 숫자 포매터 유틸

**Files:**
- Branch: `feature/phase-0-renewal-base`
- Create: `src/lib/formatNumber.ts`

- [ ] **Step 1: feature 브랜치 생성**

```bash
git checkout -b feature/phase-0-renewal-base
git status
```

Expected: `On branch feature/phase-0-renewal-base`, working tree에는 `.env.example` 변경 + `.claude/`, `docs/`, `mockup/` untracked.

- [ ] **Step 2: `src/lib/formatNumber.ts` 작성**

```ts
/**
 * 표·차트에서 공통으로 쓰는 숫자 표시 유틸.
 * - 천 단위 콤마(ko-KR locale)
 * - 음수·괄호음수 판별 (회계식 -123 / (123) 모두 포함)
 * - 숫자스러운 셀(통화 기호·단위·퍼센트 포함) 인식
 */

export function formatNumber(value: number, opts?: { decimals?: number }): string {
  if (!Number.isFinite(value)) return "—";
  const decimals =
    opts?.decimals ?? (Math.abs(value) >= 100 ? 0 : 2);
  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatNumberWithUnit(value: number, unit?: string): string {
  const num = formatNumber(value);
  return unit ? `${num} ${unit}` : num;
}

/** 회계식 음수(-, −, U+2212, 또는 괄호) 모두 인식 */
export function isNegativeText(text: string): boolean {
  const t = text.trim();
  if (t.startsWith("-") || t.startsWith("−") || t.startsWith("–")) return true;
  if (/^\(.*\)$/.test(t) && /\d/.test(t)) return true;
  return false;
}

/** 통화·단위·퍼센트가 섞여 있어도 "수치 셀"이면 true */
export function isNumericCell(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /^[\(\-−–]?\s*[\$₩]?\s*[\d,]+(\.\d+)?\s*[\)%]?\s*(원|조|억|만|백만|십억|trillion|billion|million|bn|mil|m|b|t|%)?\s*$/i.test(
    t,
  );
}
```

- [ ] **Step 3: 빌드 검증**

```bash
npm run build
```

Expected: `vite build` 성공 메시지 + `dist/` 산출. 타입 에러 0.

- [ ] **Step 4: 커밋**

```bash
git add src/lib/formatNumber.ts
git commit -m "feat: add formatNumber util for table/chart display"
```

---

### Task 2: 사용량 제한 (IP 기반 rate limit)

**Files:**
- Create: `api/_rateLimit.ts`
- Modify: `api/analyze.ts` (handler 진입부)

- [ ] **Step 1: `api/_rateLimit.ts` 작성**

```ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * 인메모리 IP별 사용량 제한.
 * Vercel 서버리스는 인스턴스별로 메모리가 분리되므로 100% 정확하진 않지만,
 * MVP 단계의 비용 폭주 방어용으로는 충분. 추후 Supabase 카운터로 이전 가능.
 */

const WINDOW_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 10;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitOutcome = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export function getClientIp(req: VercelRequest): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") return xff.split(",")[0]!.trim();
  if (Array.isArray(xff) && xff.length > 0) {
    return String(xff[0]).split(",")[0]!.trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

export function checkRateLimit(
  ip: string,
  limit: number = DEFAULT_LIMIT,
): RateLimitOutcome {
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || bucket.resetAt < now) {
    const fresh: Bucket = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(ip, fresh);
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetAt: fresh.resetAt,
    };
  }

  if (bucket.count >= limit) {
    return { allowed: false, limit, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export function applyRateLimitHeaders(
  res: VercelResponse,
  outcome: RateLimitOutcome,
) {
  res.setHeader("X-RateLimit-Limit", String(outcome.limit));
  res.setHeader("X-RateLimit-Remaining", String(outcome.remaining));
  res.setHeader(
    "X-RateLimit-Reset",
    String(Math.floor(outcome.resetAt / 1000)),
  );
}
```

- [ ] **Step 2: `api/analyze.ts` 상단 import 추가**

`api/analyze.ts:1-3` 부분, `import { GoogleGenAI } from "@google/genai";` 바로 아래 줄에 추가:

```ts
import {
  applyRateLimitHeaders,
  checkRateLimit,
  getClientIp,
} from "./_rateLimit";
```

- [ ] **Step 3: 핸들러 진입부에 rate limit 적용**

`api/analyze.ts:222` 근처 — `if (req.method !== "POST")` 블록 직후, `const apiKey = process.env.GEMINI_API_KEY;` 바로 위에 다음을 삽입:

```ts
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  applyRateLimitHeaders(res, rl);
  if (!rl.allowed) {
    const resetIn = Math.max(
      1,
      Math.ceil((rl.resetAt - Date.now()) / 1000 / 60),
    );
    res.status(429).json({
      error: `오늘의 분석 횟수를 모두 사용했어요 (하루 ${rl.limit}건). 약 ${resetIn}분 뒤 다시 시도해 주세요.`,
    });
    return;
  }
```

- [ ] **Step 4: 빌드 검증**

```bash
npm run build
```

Expected: 통과. 타입 에러 0.

- [ ] **Step 5: 커밋**

```bash
git add api/_rateLimit.ts api/analyze.ts
git commit -m "feat(api): add per-IP rate limit (10/day) for /api/analyze"
```

---

### Task 3: AI 헤드라인 schema + 프롬프트 + 추출

**Files:**
- Modify: `src/types.ts`
- Modify: `api/analyze.ts` (프롬프트 2곳, 추출 함수, 응답)
- Modify: `src/lib/demoData.ts` (데모용 헤드라인)
- Modify: `src/lib/analysisStorage.ts` (meta에 headline)

- [ ] **Step 1: `src/types.ts` 의 `AnalyzeResponse` 에 `headline` 추가**

`src/types.ts:36-50` 의 `AnalyzeResponse` 타입을 다음으로 교체:

```ts
export type AnalyzeResponse = {
  reportMarkdown: string;
  /** "회사를 한 줄로" 비유·요약 헤드라인. 모델이 생성 못 했으면 빈 문자열. */
  headline?: string;
  quiz: QuizItem[];
  reflectionPrompts: ReflectionItem[];
  sankey: SankeyChartData | null;
  groundingQueries: string[];
  sources: { title: string; uri: string }[];
  model: string;
  source: DisclosureSource;
  query: string;
  /** 기업 간 비교 시 상대 기업 */
  compareWith?: string;
  /** 선택된 회계 연도 비교 (예: 2023, 2024, 2025) */
  fiscalYears?: number[];
};
```

- [ ] **Step 2: `api/analyze.ts` DART 프롬프트에 헤드라인 지침 추가**

`api/analyze.ts:39-58`(`if (source === "dart") { return ...` 블록) 안의 마지막 줄 `전문 용어는 처음 등장 시 짧게 풀어쓰기.` 바로 위에 다음 단락을 끼워 넣음:

```
⚠ 본문 시작 전, 첫 줄에 다음 형식의 **헤드라인 한 줄**을 넣으세요:
\`> HEADLINE: <60자 이내 한 줄 비유·요약>\`
- 회사를 처음 보는 사람에게 "한 줄로 설명한다면" 톤.
- 비유나 메타포 1개 권장(강제 아님).
- 따옴표·이모지 사용 금지. 한국어로 한 줄.
- 그 다음 줄부터 \`# 개요\` 등 본문 헤딩 시작.

```

(역따옴표는 백틱이고, 이미 위 코드는 JS 문자열이므로 백틱·달러 기호는 \` \\\` \` 처럼 이스케이프하지 않아도 됩니다 — 템플릿 리터럴 안의 일반 텍스트로 들어가면 됩니다.)

- [ ] **Step 3: `api/analyze.ts` EDGAR 프롬프트에 헤드라인 지침 추가**

`api/analyze.ts:61-79` 의 EDGAR `return` 블록 안, `Use clear headings and bullet points where helpful.` 바로 아래에 다음을 추가:

```
At the very first line of your output, include a HEADLINE line in this exact format:
> HEADLINE: <Korean one-liner, 60 chars or fewer>

- Optional metaphor; concise; no quotes or emojis.
- The markdown report (\`# 개요\` …) starts on the next line.
```

- [ ] **Step 4: 헤드라인 추출 함수 추가**

`api/analyze.ts:184` 근처(`function parseQuizFromModelText` 바로 위)에 다음 함수를 추가:

```ts
function extractHeadline(markdown: string): {
  headline: string;
  rest: string;
} {
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < Math.min(lines.length, 4); i++) {
    const line = lines[i] ?? "";
    const m = line.match(/^>\s*HEADLINE\s*[:：]\s*(.+)$/i);
    if (m) {
      const headline = (m[1] ?? "").trim().replace(/^["“”']+|["“”']+$/g, "")
        .slice(0, 80);
      const rest = lines
        .slice(0, i)
        .concat(lines.slice(i + 1))
        .join("\n")
        .replace(/^\s+/, "");
      return { headline, rest };
    }
  }
  return { headline: "", rest: markdown };
}
```

- [ ] **Step 5: 추출 호출 + 응답 필드 추가**

`api/analyze.ts:277-283` 의 `const reportMarkdown = analysis.text?.trim() ?? ...` 부분(`if (!reportMarkdown)` 위)을 다음으로 교체:

```ts
    const rawMarkdown =
      analysis.text?.trim() ??
      analysis.candidates?.[0]?.content?.parts
        ?.map((p) => ("text" in p ? p.text : ""))
        .join("\n")
        .trim() ??
      "";

    const { headline, rest: reportMarkdown } = extractHeadline(rawMarkdown);
```

그리고 같은 파일 `res.status(200).json({ reportMarkdown, ... })` 블록(파일 하단 `res.status(200).json({...})` 호출, 약 374-387 라인)의 `reportMarkdown,` 다음 줄에 `headline,`을 한 줄로 추가:

```ts
    res.status(200).json({
      reportMarkdown,
      headline,
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
```

- [ ] **Step 6: `src/lib/demoData.ts` 에 데모 headline 추가**

`src/lib/demoData.ts:42-44` 의 `return { reportMarkdown: md(title), ...` 객체에 `headline` 필드 추가:

```ts
  return {
    reportMarkdown: md(title),
    headline: "본업이 흔들려도 사이드 비즈니스가 받쳐준 한 해(데모)",
    quiz: [
```

- [ ] **Step 7: `src/lib/analysisStorage.ts` 의 `normalizeAnalyzeResponse` 갱신**

`src/lib/analysisStorage.ts:4-32` 함수 내부의 return 객체에 `headline` 필드를 추가. 바뀐 함수 전체:

```ts
function normalizeAnalyzeResponse(
  d: Partial<AnalyzeResponse> | null | undefined,
): AnalyzeResponse {
  const sankey = d?.sankey;
  const okSankey =
    sankey &&
    typeof sankey === "object" &&
    Array.isArray(sankey.nodes) &&
    sankey.nodes.length >= 2
      ? sankey
      : null;
  return {
    reportMarkdown: d?.reportMarkdown ?? "",
    headline: typeof d?.headline === "string" ? d.headline : "",
    quiz: Array.isArray(d?.quiz) ? d.quiz : [],
    reflectionPrompts: Array.isArray(d?.reflectionPrompts)
      ? d.reflectionPrompts
      : [],
    sankey: okSankey,
    groundingQueries: Array.isArray(d?.groundingQueries)
      ? d.groundingQueries
      : [],
    sources: Array.isArray(d?.sources) ? d.sources : [],
    model: d?.model ?? "",
    source: d?.source === "edgar" ? "edgar" : "dart",
    query: d?.query ?? "",
    compareWith: d?.compareWith,
    fiscalYears: Array.isArray(d?.fiscalYears) ? d.fiscalYears : undefined,
  };
}
```

- [ ] **Step 8: `analysisStorage.ts` 의 `saveReport` meta 에 `headline` 포함**

`src/lib/analysisStorage.ts:120-134` 의 `meta:` 객체에 `headline: trimmed.headline,` 한 줄 추가:

```ts
        meta: {
          model: trimmed.model,
          headline: trimmed.headline,
          groundingQueries: trimmed.groundingQueries,
          sources: trimmed.sources,
          reflectionPrompts: trimmed.reflectionPrompts,
          sankey: trimmed.sankey,
          compareWith: trimmed.compareWith,
          fiscalYears: trimmed.fiscalYears,
        },
```

- [ ] **Step 9: `analysisStorage.ts` 의 `rowToResponse` 에서 `meta.headline` 복원**

`src/lib/analysisStorage.ts:75-98` 의 `rowToResponse` 안 `meta` 타입 선언과 return 객체 양쪽 갱신. 함수 전체를 다음으로 교체:

```ts
function rowToResponse(row: DbReportRow): AnalyzeResponse {
  const meta = (row.meta || {}) as {
    model?: string;
    headline?: string;
    groundingQueries?: string[];
    sources?: { title: string; uri: string }[];
    reflectionPrompts?: AnalyzeResponse["reflectionPrompts"];
    sankey?: AnalyzeResponse["sankey"];
    compareWith?: string;
    fiscalYears?: number[];
  };
  return normalizeAnalyzeResponse({
    source: row.source as AnalyzeResponse["source"],
    query: String(row.query),
    reportMarkdown: String(row.report_markdown),
    headline: meta.headline,
    quiz: Array.isArray(row.quiz) ? (row.quiz as AnalyzeResponse["quiz"]) : [],
    reflectionPrompts: meta.reflectionPrompts,
    sankey: meta.sankey as AnalyzeResponse["sankey"],
    groundingQueries: meta.groundingQueries,
    sources: meta.sources,
    model: typeof meta.model === "string" ? meta.model : "",
    compareWith: meta.compareWith,
    fiscalYears: meta.fiscalYears,
  });
}
```

- [ ] **Step 10: 빌드 검증**

```bash
npm run build
```

Expected: 타입 에러 0. (`headline` 이 모든 곳에서 `string` 또는 `undefined` 로 일관)

- [ ] **Step 11: 커밋**

```bash
git add src/types.ts api/analyze.ts src/lib/demoData.ts src/lib/analysisStorage.ts
git commit -m "feat(ai): add HEADLINE one-liner schema + extractor"
```

---

### Task 4: 헤드라인 UI 노출

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: 헤드라인 표시 블록 추가**

`src/App.tsx:233-235` 의 `<h2 className="truncate text-xl font-semibold ...">{result.query}</h2>` 직후, `</div>` 전에 다음을 삽입:

```tsx
                  {result.headline ? (
                    <p className="mt-3 text-[15px] md:text-[16px] leading-relaxed text-slate-700 max-w-2xl">
                      <span
                        className="font-semibold"
                        style={{
                          backgroundImage:
                            "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                          WebkitBackgroundClip: "text",
                          backgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        “{result.headline}”
                      </span>
                    </p>
                  ) : null}
```

- [ ] **Step 2: 빌드 검증**

```bash
npm run build
```

Expected: 통과.

- [ ] **Step 3: 커밋**

```bash
git add src/App.tsx
git commit -m "feat(ui): show AI headline above report"
```

---

### Task 5: 표 가독성 패치

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/MarkdownReport.tsx`

- [ ] **Step 1: `src/index.css` 표 영역(147~180) 교체**

`src/index.css:147-180` `/* 표 — 리포트용 */` 부터 `.report-table tbody tr:last-child td { @apply border-b-0; }` 까지를 다음 블록으로 통째 교체:

```css
/* 표 — 리포트용 (PR1 강화: 우측정렬·천단위·헤더 강조·짝수행·음수 빨강) */
.report-table-outer {
  @apply my-9 overflow-x-auto rounded-2xl border border-stone-200/90 bg-white shadow-sm;
  -webkit-overflow-scrolling: touch;
}

.report-table {
  @apply w-full border-collapse text-left text-[13px];
}

.report-table thead {
  background: linear-gradient(180deg, #eef2ff 0%, #e0e7ff 100%);
}

.report-table th {
  @apply border-b border-indigo-200/60 px-5 py-3.5 font-semibold tracking-wide text-indigo-900;
  font-size: 0.8125rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.report-table th:first-child {
  text-align: left;
}

.report-table td {
  @apply border-b border-stone-100 px-5 py-3 align-top text-slate-600;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.report-table td:first-child {
  text-align: left;
  color: #1e293b;
  font-weight: 500;
}

.report-table tbody tr {
  @apply transition-colors;
}

.report-table tbody tr:nth-child(even) td {
  background: #fafbfd;
}

.report-table tbody tr:hover td {
  background: #eef2ff;
}

.report-table tbody tr:last-child td {
  @apply border-b-0;
}

/* 음수 셀 강조 — JSX에서 .is-negative 클래스 부착 */
.report-table td.is-negative {
  color: #dc2626;
}
```

- [ ] **Step 2: `src/components/MarkdownReport.tsx` 전체 교체**

기존 파일을 다음 내용으로 교체. `wrap` 헬퍼는 td/li 처리에서 빠지고 별도 컴포넌트(`Td`, `Li`)로 대체. li 중복 정의도 제거.

```tsx
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
```

- [ ] **Step 3: 빌드 검증**

```bash
npm run build
```

Expected: 통과. JSX 중복 키(`li` 두 번 정의) 경고 사라짐.

- [ ] **Step 4: 커밋**

```bash
git add src/index.css src/components/MarkdownReport.tsx
git commit -m "feat(report): right-align numbers, emerald header, zebra rows, red negatives"
```

---

### Task 6: Sankey 노드 툴팁·라벨 값 표시

**Files:**
- Modify: `src/components/SankeyViz.tsx`

- [ ] **Step 1: `src/components/SankeyViz.tsx` 전체 교체**

```tsx
import { ResponsiveSankey } from "@nivo/sankey";
import type { SankeyChartData, SankeyNodeCategory } from "../types";

function colorForCategory(cat: SankeyNodeCategory | undefined): string {
  switch (cat) {
    case "revenue":
      return "#2563eb";
    case "profit":
      return "#16a34a";
    case "expense":
      return "#dc2626";
    default:
      return "#64748b";
  }
}

function formatSankeyValue(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("ko-KR", {
    maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 1,
  });
}

export function SankeyViz({ data }: { data: SankeyChartData }) {
  const categoryById = new Map(
    data.nodes.map((n) => [n.id, n.category] as const),
  );

  const nivoData = {
    nodes: data.nodes.map((n) => ({
      id: n.id,
      label: n.label,
    })),
    links: data.links.map((l) => ({
      source: l.source,
      target: l.target,
      value: l.value,
    })),
  };

  const unitLabel = data.unit ? ` ${data.unit}` : "";

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-100 bg-white">
      <div className="h-[min(420px,70vw)] min-h-[280px] w-full min-w-[280px]">
        <ResponsiveSankey
          data={nivoData}
          margin={{ top: 24, right: 160, bottom: 24, left: 56 }}
          align="justify"
          sort="auto"
          layout="horizontal"
          nodeWidth={14}
          nodePadding={20}
          nodeOpacity={1}
          nodeHoverOpacity={1}
          nodeThickness={10}
          nodeSpacing={20}
          nodeBorderWidth={0}
          linkOpacity={0.45}
          linkHoverOpacity={0.75}
          linkContract={2}
          enableLinkGradient
          labelPosition="outside"
          labelOrientation="horizontal"
          labelPadding={12}
          labelTextColor={{ from: "color", modifiers: [["darker", 1.2]] }}
          theme={{
            labels: { text: { fontSize: 11, fontWeight: 500 } },
          }}
          colors={{ scheme: "set2" }}
          nodeColor={(node) =>
            colorForCategory(
              categoryById.get(String(node.id)) as SankeyNodeCategory,
            )
          }
          label={(node) => {
            const v = (node as unknown as { value?: number }).value;
            const base = String(node.label ?? node.id);
            if (!Number.isFinite(v)) return base;
            return `${base} · ${formatSankeyValue(Number(v))}${unitLabel}`;
          }}
          nodeTooltip={({ node }) => {
            const v = (node as unknown as { value?: number }).value;
            return (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                <div className="font-semibold text-slate-900">
                  {node.label}
                </div>
                {Number.isFinite(v) ? (
                  <div className="mt-0.5 text-slate-600 tabular-nums">
                    {formatSankeyValue(Number(v))}
                    {unitLabel}
                  </div>
                ) : null}
              </div>
            );
          }}
          linkTooltip={({ link }) => {
            const src = (link as unknown as { source: { label?: string } })
              .source;
            const tgt = (link as unknown as { target: { label?: string } })
              .target;
            return (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                <div className="font-medium text-slate-700">
                  {src?.label ?? ""} → {tgt?.label ?? ""}
                </div>
                <div className="mt-0.5 font-semibold text-slate-900 tabular-nums">
                  {formatSankeyValue(Number(link.value))}
                  {unitLabel}
                </div>
              </div>
            );
          }}
        />
      </div>
      <div className="flex flex-wrap gap-3 border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-blue-600" /> 매출·수익원
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-green-600" /> 이익
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-red-600" /> 비용
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-slate-500" /> 합계·중간
        </span>
        {data.unit ? (
          <span className="ml-auto tabular-nums">단위: {data.unit}</span>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 검증**

```bash
npm run build
```

Expected: 통과.

- [ ] **Step 3: 커밋**

```bash
git add src/components/SankeyViz.tsx
git commit -m "feat(sankey): show value+unit in node tooltip and outside labels"
```

---

### Task 7: 와이드 레이아웃 + 디스클레이머 상시 노출

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: 결과 컨테이너의 `max-w-3xl` → `max-w-[1280px]`**

`src/App.tsx:204` 의

```tsx
className={`mx-auto max-w-3xl transition-opacity duration-200 ${restoring ? "pointer-events-none opacity-60" : "opacity-100"}`}
```

를 다음으로 교체:

```tsx
className={`mx-auto max-w-[1280px] transition-opacity duration-200 ${restoring ? "pointer-events-none opacity-60" : "opacity-100"}`}
```

- [ ] **Step 2: 디스클레이머 컴포넌트 노출**

`src/App.tsx:139` 의 `<div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">` 바로 다음 줄, `{error && (` 위에 다음 블록을 삽입:

```tsx
          <div className="mx-auto mb-4 max-w-[1280px]">
            <div className="rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-[11px] leading-relaxed text-amber-900 flex items-start gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="mt-0.5 shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <span>
                InsightAnalyzer는 <b>교육·정보 제공 목적</b>이며, 투자 권유나
                매수·매도 추천이 아닙니다. AI 해설은 검색 결과를 바탕으로 생성되어
                실제 공시 수치와 차이가 있을 수 있어요.
              </span>
            </div>
          </div>
```

- [ ] **Step 3: 빌드 검증**

```bash
npm run build
```

Expected: 통과.

- [ ] **Step 4: 커밋**

```bash
git add src/App.tsx
git commit -m "feat(ui): widen container to 1280px and add persistent disclaimer"
```

---

### Task 8: 산출물 add → push → PR 생성

**Files (untracked, 본 PR에 포함):**
- `docs/specs/2026-05-06-insight-analyzer-renewal-design.md`
- `docs/plans/2026-05-06-pr1-phase-0-renewal-base.md` (이 파일)
- `mockup/renewal-v1.html`
- `mockup/renewal-learning-v1.html`

**제외 (이번 PR 범위 아님):**
- `.env.example` 변경 — 사용자 로컬 작업물일 가능성 높아 별도 처리. 이번 PR에서는 stash 또는 reset.
- `.claude/` — 도구 설정. .gitignore 후보지만 이번 PR에 포함하지 않음.

- [ ] **Step 1: `.env.example` 변경 및 .claude 디렉토리는 PR에서 제외**

```bash
git status --short
git checkout -- .env.example
```

`.env.example` 의 modify가 사용자 의도(API 키 메모용)라면 사용자 확인 후 별도 처리. PR1에서는 깨끗하게 비움.

`.claude/` 는 `git add` 단계에서 명시적으로 안 추가하면 PR에 안 들어감.

- [ ] **Step 2: 산출물(spec/plan/mockup) add**

```bash
git add docs/specs/2026-05-06-insight-analyzer-renewal-design.md
git add docs/plans/2026-05-06-pr1-phase-0-renewal-base.md
git add mockup/renewal-v1.html
git add mockup/renewal-learning-v1.html
git status --short
```

Expected: untracked가 정확히 위 4개 파일만 staged 상태로 표시.

- [ ] **Step 3: 산출물 commit**

```bash
git commit -m "docs: add renewal design spec, PR1 plan, and mockup pages"
```

- [ ] **Step 4: 최종 빌드 + commit log 확인**

```bash
npm run build
git log --oneline main..HEAD
```

Expected: 7개 커밋이 main 위로 쌓여 있음 (Task 1~7 기능 + Task 8 docs).

- [ ] **Step 5: feature 브랜치 push**

```bash
git push -u origin feature/phase-0-renewal-base
```

Expected: GitHub에 새 브랜치 생성 + Vercel 자동 Preview URL 생성 시작.

- [ ] **Step 6: PR 생성 (gh CLI)**

```bash
gh pr create --base main --head feature/phase-0-renewal-base --title "PR1: Phase 0 리뉴얼 베이스 — 사용량 제한·헤드라인·표 가독성·Sankey·와이드 레이아웃" --body "$(cat <<'EOF'
## 요약

기획서 §10 Phase 0 의 6개 베이스 패치. 외부 API 의존 0, 라이브러리 추가 0.

## 주요 변경

- **사용량 제한** — `/api/analyze` 에 IP당 일 10건 (재정 보호용)
- **AI 헤드라인 1줄** — 응답 schema에 \`headline\` 필드 추가, 본문 위 그라데이션으로 표시
- **표 가독성** — 우측정렬·천단위·헤더 강조·짝수행 스트라이프·음수 빨강
- **Sankey 강화** — 노드 툴팁에 값·단위, 외곽 라벨에 값 동반 표기
- **와이드 레이아웃** — \`max-w-3xl\` → \`max-w-[1280px]\`
- **디스클레이머 상시 노출** — 교육·정보 제공 목적 명시

## 검증

- ✅ \`npm run build\` 통과
- 🔍 Vercel Preview URL에서 시각 검증 필요:
  - 데모 모드 분석 → 헤드라인·표·Sankey 새 디자인 확인
  - 와이드 모니터 1280px 컨테이너 확인
  - 디스클레이머 항상 보이는지 확인

## 참고 문서

- 기획서: \`docs/specs/2026-05-06-insight-analyzer-renewal-design.md\`
- PR1 플랜: \`docs/plans/2026-05-06-pr1-phase-0-renewal-base.md\`
- Mockup: \`mockup/renewal-v1.html\`, \`mockup/renewal-learning-v1.html\`

## 다음 PR 예정

- PR2: AI 프롬프트·schema 재설계 (해설 카드 JSON, 토큰 절감)
- PR3: DART OpenAPI 직연동 + Supabase 캐시
- PR4: KPI 카드 + 시계열 + 비교 차트 (실데이터)
- PR5: 학습 모드 분리 + 미션·도감·워크북·트레이너
EOF
)"
```

Expected: PR URL 출력. `https://github.com/brandnewj1010-coder/edgar/pull/<번호>`

- [ ] **Step 7: 사용자에게 Preview URL 안내**

PR 페이지에 Vercel 봇이 코멘트로 Preview URL을 자동 게시함 (1~3분 소요). 사용자에게:
- PR URL
- Preview URL (PR 페이지에서 확인) 안내
- 머지 결정은 사용자가 GitHub에서 직접

---

## Self-Review

이 플랜이 spec(`docs/specs/2026-05-06-insight-analyzer-renewal-design.md` §10 Phase 0)을 모두 커버하는지, placeholder는 없는지, 타입 정합성은 맞는지 검토.

**Spec 커버리지 매핑:**
- 표 가독성 5종 패치 → Task 5 ✅
- Sankey 노드 툴팁에 값·단위 표시 → Task 6 ✅
- Sankey 라벨 천단위·단위 포맷 → Task 6 ✅
- 메인 컨테이너 max-w-3xl 해제 → Task 7 ✅
- 디스클레이머 상시 노출 → Task 7 ✅
- AI 헤드라인 1줄 추가 → Task 3 + Task 4 ✅
- 사용량 제한 (Phase 0에 추가 권장) → Task 2 ✅

**Placeholder scan:** "TBD/TODO/추후 구현/적절한 처리 추가" 없음. 모든 step은 실제 코드 또는 정확한 명령어.

**Type consistency:**
- `headline?: string` 이 `types.ts`, `analyze.ts` 응답, `demoData.ts`, `analysisStorage.ts` (normalize, save meta, rowToResponse) 모두에서 일관되게 처리됨. ✅
- `RateLimitOutcome` 인터페이스가 `_rateLimit.ts` 안에서만 쓰이고 외부 노출 일관. ✅
- `isNegativeText`, `isNumericCell` 시그니처가 `formatNumber.ts` 정의와 `MarkdownReport.tsx` 사용처에서 일치. ✅

**스펙 외 추가 결정 (정당화):**
- `.env.example` 변경은 PR1에서 제외(사용자 로컬 작업물일 가능성). 사용자 확인 후 별도 처리.

검토 완료. 이상 없음.

---

## Execution Handoff

**두 가지 실행 옵션:**

1. **Subagent-Driven (권장)** — 각 task마다 새 subagent 디스패치, task 사이 사용자가 검토. 안전하지만 다소 느림.
2. **Inline Execution** — 현재 세션에서 그대로 실행, 묶음 단위 체크포인트로 사용자 검토. 빠름.

이번 PR은 task 단위가 작고(8개) 코드도 plan에 미리 다 적혀 있어 **Inline Execution** 으로 진행해도 안전합니다. 다만 마지막 push/PR 생성 직전에는 **반드시 사용자 확인**을 한 번 받습니다.
