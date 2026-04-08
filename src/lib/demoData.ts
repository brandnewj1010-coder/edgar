import type { AnalyzeResponse, DisclosureSource } from "../types";

const md = (title: string) => `# ${title}

이 화면은 **API 없이** 레이아웃을 확인하는 **데모**입니다. 실제 공시 해설은 Vercel에 배포하고 \`GEMINI_API_KEY\`를 설정한 뒤 데모 모드를 끄세요.

## 오늘 이 공시에서 잡을 줄기

직장인이 재무제표를 볼 때는 **매출·영업이익·영업이익률**의 흐름을 먼저 잡는 것이 좋습니다.

## 손익에서 볼 질문 세 가지

1. 영업이익이 전년 대비 어떻게 변했는가  
2. 매출 대비 비용 구조는 어떤가  
3. 일회성 항목이 이익을 흔들지는 않는가  

## 오늘의 용어

- **영업이익**: 본업에서 난 손익.  
- **당기순이익**: 세금 등을 반영한 최종 이익.  
- **EBITDA**: 감가상각 전까지의 수익력을 보는 보조 지표.  

## 다음에 볼 곳

감사보고서·주석에서 매출 인식·충당부채 등을 확인해 보세요.

---

*교육용 예시이며 투자 권유가 아닙니다.*
`;

export function demoAnalyzeResponse(
  source: DisclosureSource,
  query: string,
): AnalyzeResponse {
  const label = source === "dart" ? "DART" : "EDGAR";
  const title = `${label} · ${query || "샘플"}`;
  return {
    reportMarkdown: md(title),
    quiz: [],
    reflectionPrompts: [],
    sankey: null,
    groundingQueries: ["demo"],
    sources: [],
    model: "demo",
    source,
    query: title,
  };
}
