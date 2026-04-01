import type { AnalyzeResponse, DisclosureSource } from "../types";

const md = (q: string) => `# ${q} — 데모 분석 리포트

이 화면은 **API 키 없이** UI·툴팁·퀴즈·샌키·생각 과제 흐름을 확인하기 위한 샘플입니다. 실제 분석은 Vercel에 배포한 뒤 \`GEMINI_API_KEY\`를 설정하고 데모 모드를 끄세요.

## 핵심 재무·사업 포인트

(데모) 해외 공시식 표기 예: **$1.2 billion** 매출, **USD 450 million** 영업비용.

| 연도 | 매출 | 영업이익 |
|------|------|----------|
| 2023년 | 100 | 12 |
| 2024년 | 110 | 14 |
| 2025년(추정) | 118 | 15 |

## 현금흐름

**영업활동현금흐름**이 순이익과 다른 이유는 발생주의와 현금주의 차이 때문입니다.

## 리스크·주의사항

투자 권유가 아닌 **교육용 요약**입니다.

## 핵심 용어 학습

- **당기순이익**: 모든 비용·세금을 반영한 최종 이익.
- **부채비율**: 레버리지 수준을 가늠할 때 참고합니다.
`;

export function demoAnalyzeResponse(
  source: DisclosureSource,
  query: string,
  opts?: { compareWith?: string; fiscalYears?: number[] },
): AnalyzeResponse {
  const label = source === "dart" ? "DART" : "EDGAR";
  const base = query || "샘플";
  const vs = opts?.compareWith?.trim();
  const title =
    vs && vs !== base ? `${base} vs ${vs}` : `${label} · ${base}`;

  return {
    reportMarkdown: md(title),
    quiz: [
      {
        question: "영업이익이 의미하는 바로 가장 가까운 것은?",
        choices: [
          "본업 활동의 손익",
          "배당금 규모",
          "단기 차입금 이자",
          "법인세 납부액",
        ],
        correctIndex: 0,
      },
      {
        question: "EBITDA에 대한 설명으로 적절한 것은?",
        choices: [
          "감가상각 등 일부 비용을 되돌려 본 ‘가까운’ 수익력 지표로 자주 쓰인다",
          "배당성향을 나타낸다",
          "유동비율과 동일하다",
          "현금흐름표와 항상 일치한다",
        ],
        correctIndex: 0,
      },
      {
        question: "영업활동현금흐름을 순이익과 함께 보는 이유는?",
        choices: [
          "이익과 현금의 타이밍 차이를 이해하기 위해서",
          "두 수치는 항상 같아야 하기 때문",
          "배당만 보면 되기 때문",
          "재무제표에 순이익이 없기 때문",
        ],
        correctIndex: 0,
      },
      {
        question: "연도별 비교 표에서 추세를 볼 때 가장 먼저 확인하기 좋은 것은?",
        choices: [
          "매출·이익의 방향(증가/감소)과 변동 폭",
          "표의 글자 크기",
          "첫 행만",
          "부채 항목만",
        ],
        correctIndex: 0,
      },
    ],
    reflectionPrompts: [
      {
        title: "이익과 현금의 괴리",
        prompt:
          "영업이익은 늘었는데 영업현금흐름이 줄었다면, 어떤 계정이나 사업 요인을 의심해볼 수 있을까요? (실제 데이터 없이 가정으로 논의)",
      },
      {
        title: "비교 관점",
        prompt:
          vs
            ? `두 기업 중 어느 쪽이 재무 건전성·성장성 측면에서 더 보수적으로 보이는지, 본인만의 기준을 하나 정해 근거를 말해보세요.`
            : "동종 업종에서 '좋은 재무'를 판단할 때 가장 중요하게 볼 지표 하나를 고르고 이유를 쓰세요.",
      },
      {
        title: "리스크 시나리오",
        prompt:
          "금리·환율·원자재 중 하나를 골라, 해당 리스크가 손익·현금흐름에 미치는 경로를 한 단락으로 설명해보세요.",
      },
    ],
    sankey: {
      title: "데모: 매출에서 이익·비용으로 (교육용)",
      unit: "억 원",
      nodes: [
        { id: "seg_a", label: "사업부문 A", category: "revenue" },
        { id: "seg_b", label: "사업부문 B", category: "revenue" },
        { id: "total", label: "총매출", category: "neutral" },
        { id: "opex", label: "영업비용", category: "expense" },
        { id: "op", label: "영업이익", category: "profit" },
        { id: "tax", label: "법인세 등", category: "expense" },
        { id: "net", label: "당기순이익", category: "profit" },
      ],
      links: [
        { source: "seg_a", target: "total", value: 100 },
        { source: "seg_b", target: "total", value: 80 },
        { source: "total", target: "opex", value: 120 },
        { source: "total", target: "op", value: 60 },
        { source: "op", target: "tax", value: 15 },
        { source: "op", target: "net", value: 45 },
      ],
    },
    groundingQueries: ["demo"],
    sources: [],
    model: "demo",
    source,
    query: title,
    compareWith: vs || undefined,
    fiscalYears: opts?.fiscalYears?.length ? opts.fiscalYears : undefined,
  };
}
