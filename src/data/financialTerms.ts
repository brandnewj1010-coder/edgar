import type { FinancialTermEntry } from "../types";

/** Phase 2에서 Supabase/JSON으로 확장 가능한 시드 데이터 */
export const FINANCIAL_TERMS: FinancialTermEntry[] = [
  {
    term: "EBITDA",
    aliases: ["이비타"],
    definition:
      "이자·법인세·감가상각비·무형자산상각비 차감 전 이익(영업이익에 감가상각 등을 되돌린 지표).",
    meaning:
      "본업에서 벌어들인 현금에 가까운 수익력을 보기 위한 지표로 자주 쓰입니다. 다만 현금흐름과는 다릅니다.",
    formula: "EBITDA ≈ 영업이익 + 감가상각비 + 무형자산상각비",
  },
  {
    term: "당기순이익",
    aliases: ["순이익", "NI", "Net Income"],
    definition:
      "일정 기간 동안 법인세 등 모든 비용을 차감한 최종 이익.",
    meaning:
      "주주 입장에서 ‘남은 이익’에 가깝지만, 일회성 항목에 따라 크게 출렁일 수 있습니다.",
  },
  {
    term: "영업이익",
    aliases: ["영업손익", "Operating Income"],
    definition: "본업 활동에서 난 이익(매출에서 매출원가·판관비 등을 뺀 금액).",
    meaning:
      "‘장사가 잘됐는지’를 보는 대표 지표입니다. 영업이익이 늘었다면 본업 경쟁력·가격·원가 측면을 함께 봅니다.",
  },
  {
    term: "영업활동현금흐름",
    aliases: ["영업현금흐름", "CFO", "Operating Cash Flow"],
    definition:
      "일상적인 영업 과정에서 실제로 유입·유출된 현금의 순액.",
    meaning:
      "이익과 달리 ‘현금’ 기준이라 왜곡이 적은 편입니다. 적자인데 현금이 많거나, 흑자인데 현금이 부족한 경우를 비교할 때 중요합니다.",
  },
  {
    term: "부채비율",
    definition: "총부채를 자본으로 나눈 비율(표기 방식은 공시마다 유사 개념이 있을 수 있음).",
    meaning:
      "재무 레버리지(빚 의존도)를 가늠합니다. 업종·성장 단계에 따라 ‘좋고 나쁨’이 달라집니다.",
    formula: "부채비율 = 부채 ÷ 자본 (정의는 공시 표기 확인)",
  },
  {
    term: "유동비율",
    definition: "유동자산을 유동부채로 나눈 비율.",
    meaning:
      "단기 상환 능력을 보는 대표 지표입니다. 100% 미만이면 단기 자금 조달 여력을 더 살펴봅니다.",
  },
  {
    term: "ROE",
    aliases: ["자기자본이익률"],
    definition: "순이익을 자기자본으로 나눈 수익률.",
    meaning:
      "주주 투입 자본이 얼마나 효율적으로 이익을 내는지 보여 줍니다. 레버리지가 높으면 ROE가 과대평가될 수 있습니다.",
  },
  {
    term: "EPS",
    aliases: ["주당순이익"],
    definition: "순이익을 유통주식수로 나눈 값.",
    meaning:
      "주당 벌어들인 이익으로, PER 등 밸류에이션과 함께 자주 쓰입니다.",
  },
  {
    term: "PER",
    aliases: ["주가수익비율"],
    definition: "주가를 주당순이익(EPS)으로 나눈 배수.",
    meaning:
      "시장이 기업 이익에 대해 얼마나 미래를 반영해 평가하는지 보는 지표입니다. 업종 비교가 중요합니다.",
  },
  {
    term: "감가상각비",
    definition: "유형자산의 사용·소모에 따라 비용으로 인식하는 금액.",
    meaning:
      "현금이 당장 나가지 않아도 비용으로 잡히므로, 이익과 현금흐름 차이를 이해할 때 필요합니다.",
  },
];

export function allTermLabels(): string[] {
  const set = new Set<string>();
  for (const t of FINANCIAL_TERMS) {
    set.add(t.term);
    t.aliases?.forEach((a) => set.add(a));
  }
  return [...set];
}
