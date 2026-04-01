import type { AnalyzeResponse, DisclosureSource } from "../types";

const md = (q: string) => `# ${q} — 데모 분석 리포트

이 화면은 **API 키 없이** UI·툴팁·퀴즈 흐름을 확인하기 위한 샘플입니다. 실제 분석은 Vercel에 배포한 뒤 \`GEMINI_API_KEY\`를 설정하고 데모 모드를 끄세요.

## 핵심 재무·사업 포인트

| 항목 | 메모 |
|------|------|
| **영업이익** | 본업 손익을 가장 먼저 봅니다. |
| **EBITDA** | 감가상각 전까지의 수익력을 보조 지표로 씁니다. |

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
): AnalyzeResponse {
  const label = source === "dart" ? "DART" : "EDGAR";
  return {
    reportMarkdown: md(`${label} · ${query || "샘플"}`),
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
    ],
    groundingQueries: ["demo"],
    sources: [],
    model: "demo",
    source,
    query: query || "DEMO",
  };
}
