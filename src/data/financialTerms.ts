import type { FinancialTermEntry } from "../types";

/** 교육·공시 리포트에서 자주 나오는 한·영 재무 용어 (툴팁 시드) */
export const FINANCIAL_TERMS: FinancialTermEntry[] = [
  // --- 매출·손익 (영문) ---
  {
    term: "Revenue",
    aliases: ["Sales", "매출액", "영업수익"],
    definition:
      "재화·용역 판매 등으로 인식한 총수입(회계 기준·표시 방식은 공시마다 다를 수 있음).",
    meaning:
      "‘얼마나 팔았는지’의 출발점입니다. 성장률·채널·단가와 함께 읽습니다.",
  },
  {
    term: "Net Loss",
    aliases: ["순손실", "당기순손실", "Net loss"],
    definition:
      "일정 기간 비용·손실이 수익을 초과해 당기순이익이 마이너스인 상태.",
    meaning:
      "적자 규모와 원인(일회성 vs 구조적)을 구분해 보는 것이 중요합니다.",
  },
  {
    term: "Gross Profit",
    aliases: ["매출총이익", "Gross profit"],
    definition: "매출액에서 매출원가를 뺀 이익.",
    meaning:
      "원가 관리·가격 결정력을 보는 단계로, 이후 판관비를 빼면 영업이익으로 이어집니다.",
    formula: "매출총이익 = 매출액 − 매출원가",
  },
  {
    term: "Gross Margin",
    aliases: ["매출총이익률", "Gross margin"],
    definition: "매출총이익을 매출액으로 나눈 비율.",
    meaning:
      "제품·서비스 단위당 ‘남는 폭’을 나타냅니다. 업종별로 비교가 중요합니다.",
    formula: "매출총이익률 = 매출총이익 ÷ 매출액",
  },
  {
    term: "Operating Margin",
    aliases: ["영업이익률", "Operating margin"],
    definition: "영업이익을 매출액으로 나눈 비율.",
    meaning:
      "본업의 수익성을 한 줄로 보는 지표입니다. 판관비 효율과 함께 봅니다.",
    formula: "영업이익률 = 영업이익 ÷ 매출액",
  },
  {
    term: "Net Margin",
    aliases: ["순이익률", "당기순이익률", "Net margin", "Net profit margin"],
    definition: "당기순이익을 매출액으로 나눈 비율.",
    meaning:
      "최종적으로 매출 대비 얼마가 남았는지 보여 줍니다. 비영업·세금·이자의 영향을 받습니다.",
  },
  {
    term: "매출원가율",
    definition: "매출원가를 매출액으로 나눈 비율.",
    meaning:
      "원가 부담이 매출 대비 얼마나 큰지 보는 지표입니다. 업종·가격 전략과 함께 봅니다.",
    formula: "매출원가율 = 매출원가 ÷ 매출액",
  },
  {
    term: "COGS",
    aliases: ["Cost of Goods Sold", "매출원가", "Cost of revenue"],
    definition:
      "매출과 직접 대응되는 원가(재료·외주·재고 변동 등, 정의는 업종별로 상이).",
    meaning: "매출 성장 대비 원가가 과도하게 늘지 않는지 확인할 때 봅니다.",
  },
  {
    term: "SG&A",
    aliases: ["판관비", "Selling, General and Administrative"],
    definition:
      "판매비와 일반관리비 등 영업 활동과 관련된 비용(연구개발비 포함 여부는 공시마다 상이).",
    meaning:
      "규모의 경제·브랜드 투자·조직 효율 등이 반영됩니다. 매출 대비 비율을 자주 봅니다.",
  },
  {
    term: "EBIT",
    aliases: ["Earnings before interest and taxes"],
    definition:
      "이자와 법인세 차감 전 이익으로 쓰이는 경우가 많습니다(공시 표기 확인).",
    meaning:
      "자본 구조(이자비용)와 세금 전에 본업·영업 단계의 이익을 보고 싶을 때 씁니다.",
  },
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

  // --- 현금흐름 ---
  {
    term: "현금흐름",
    aliases: ["Cash flow", "Cash Flow"],
    definition:
      "일정 기간 동안 유입·유출된 현금의 변동을 나타내는 흐름.",
    meaning:
      "발생주의 이익과 달리 ‘실제 돈’의 관점이라 청산력·배당 여력을 볼 때 중요합니다.",
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
    term: "투자활동현금흐름",
    aliases: ["CFI", "Investing Cash Flow"],
    definition:
      "유형·무형자산 취득·처분, 투자증권 등 투자 활동에서의 현금 흐름.",
    meaning:
      "설비 투자·M&A·현금성 자산 운용이 반영됩니다. 성장 투자인지 방어적 지출인지 맥락을 봅니다.",
  },
  {
    term: "재무활동현금흐름",
    aliases: ["CFF", "Financing Cash Flow"],
    definition:
      "차입·상환, 유상증자, 배당 등 자금 조달·반환과 관련된 현금 흐름.",
    meaning:
      "레버리지 조정·주주 환원 정책이 드러납니다. 이자 부담과 함께 읽습니다.",
  },
  {
    term: "Free Cash Flow",
    aliases: ["FCF", "잉여현금흐름", "자유현금흐름"],
    definition:
      "통상 영업에서 번 현금에서 유지·성장에 필요한 투자(감가상각 대체 수준의 CAPEX 등)를 고려한 남는 현금 흐름으로 정의되기도 합니다(정의는 공시·업종마다 상이).",
    meaning:
      "배당·부채 상환·추가 투자 여력을 논할 때 자주 인용됩니다.",
  },

  // --- 재무상태표 ---
  {
    term: "Total Assets",
    aliases: ["총자산", "자산총계"],
    definition: "기업이 보유한 경제적 자원의 합계(유동·비유동).",
    meaning:
      "규모만으로는 좋고 나쁨을 판단하기 어렵고, 수익성·부채 구조와 함께 봅니다.",
  },
  {
    term: "Total Liabilities",
    aliases: ["총부채", "부채총계"],
    definition: "기업이 부담해야 할 채무·의무의 합계.",
    meaning:
      "단기·장기 구조, 이자 부담과 연결해 봅니다.",
  },
  {
    term: "Shareholders Equity",
    aliases: ["자기자본", "순자산", "Shareholders' equity"],
    definition:
      "자산에서 부채를 뺀 잔액으로, 소유주 지분에 해당하는 부분.",
    meaning:
      "내실(버퍼)과 레버리지 해석의 기준이 됩니다.",
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
    term: "당좌비율",
    aliases: ["Quick ratio"],
    definition:
      "당좌자산(현금성·매출채권 등)을 유동부채로 나눈 비율로 쓰이기도 합니다(정의는 공시 확인).",
    meaning:
      "재고를 제외한 ‘빨리 현금화되는 자산’으로 단기 지급능력을 볼 때 참고합니다.",
  },
  {
    term: "차입금",
    aliases: ["Borrowings", "Interest-bearing debt"],
    definition:
      "이자를 부담하는 차입성 부채(단기·장기 구분은 공시마다 상이).",
    meaning:
      "금리·만기 구조와 함께 이자비용·상환 리스크를 평가합니다.",
  },
  {
    term: "이자비용",
    aliases: ["Interest expense", "금융비용"],
    definition: "차입 등에 따른 이자 지출로 인식되는 비용.",
    meaning:
      "금리 변동·레버리지에 민감합니다. 영업이익 대비 부담을 보기도 합니다.",
  },
  {
    term: "감가상각비",
    definition: "유형자산의 사용·소모에 따라 비용으로 인식하는 금액.",
    meaning:
      "현금이 당장 나가지 않아도 비용으로 잡히므로, 이익과 현금흐름 차이를 이해할 때 필요합니다.",
  },
  {
    term: "무형자산",
    aliases: ["Intangible assets"],
    definition:
      "상표권·특허권·소프트웨어 등 형태 없는 자산.",
    meaning:
      "무형자산상각·손상이 이익에 영향을 줄 수 있습니다.",
  },

  // --- 수익성·밸류 ---
  {
    term: "ROE",
    aliases: ["자기자본이익률"],
    definition: "순이익을 자기자본으로 나눈 수익률.",
    meaning:
      "주주 투입 자본이 얼마나 효율적으로 이익을 내는지 보여 줍니다. 레버리지가 높으면 ROE가 과대평가될 수 있습니다.",
  },
  {
    term: "ROA",
    aliases: ["총자산이익률", "Return on assets"],
    definition: "순이익을 총자산으로 나눈 수익률.",
    meaning:
      "자산 전체를 얼마나 효율적으로 굴려 이익을 냈는지 봅니다.",
  },
  {
    term: "ROIC",
    aliases: ["투하자본이익률", "Return on invested capital"],
    definition:
      "투입된 자본 대비 사업에서 벌어들인 초과수익을 보는 지표로 널리 쓰입니다(정의·조정은 분석마다 상이).",
    meaning:
      "장기적인 사업 가치 창출 논의에서 자주 등장합니다.",
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
    aliases: ["주가수익비율", "P/E", "Price-to-Earnings"],
    definition: "주가를 주당순이익(EPS)으로 나눈 배수.",
    meaning:
      "시장이 기업 이익에 대해 얼마나 미래를 반영해 평가하는지 보는 지표입니다. 업종 비교가 중요합니다.",
  },
  {
    term: "PBR",
    aliases: ["주가순자산비율", "P/B", "Price-to-Book"],
    definition: "주가를 주당순자산(BPS)으로 나눈 배수.",
    meaning:
      "순자산 대비 시장 평가 수준을 볼 때 쓰입니다. 자산 중심 업종에서 자주 인용됩니다.",
  },
  {
    term: "EV/EBITDA",
    definition:
      "기업가치(EV)를 EBITDA로 나눈 배수로, M&A·동종 비교에 자주 쓰입니다.",
    meaning:
      "자본 구조·현금창출력을 함께 고려한 상대 밸류 지표로 이해하면 됩니다.",
  },

  // --- 성장·비교 ---
  {
    term: "YoY",
    aliases: ["전년동기대비", "Year-over-year", "Y/Y"],
    definition: "전년 동일 기간 대비 변화율 또는 변화량.",
    meaning:
      "계절성을 일부 제거한 성장·추세 해석에 쓰입니다.",
  },
  {
    term: "QoQ",
    aliases: ["전분기대비", "Quarter-over-quarter"],
    definition: "직전 분기 대비 변화.",
    meaning:
      "단기 흐름·계절 요인에 민감할 수 있어 업종별로 해석합니다.",
  },
  {
    term: "CAGR",
    aliases: ["연평균성장률", "Compound annual growth rate"],
    definition:
      "여러 해에 걸친 성장을 연복리로 환산한 평균 성장률.",
    meaning:
      "중장기 매출·이익 추세를 한 숫자로 비교할 때 씁니다.",
  },
  {
    term: "TTM",
    aliases: ["LTM", "Trailing twelve months"],
    definition:
      "직전 12개월 누적 기준으로 지표를 산출한 값.",
    meaning:
      "분기 변동을 완화해 최근 실적을 볼 때 자주 씁니다.",
  },

  // --- 공시·회계 ---
  {
    term: "GAAP",
    definition:
      "미국 일반적으로 인정되는 회계 원칙(Generally Accepted Accounting Principles).",
    meaning:
      "미국 상장사 공시에서 자주 언급됩니다. Non-GAAP 조정과 대비해 읽습니다.",
  },
  {
    term: "IFRS",
    aliases: ["K-IFRS", "국제회계기준"],
    definition:
      "국제회계기준으로, 국내 상장사는 K-IFRS를 적용합니다.",
    meaning:
      "인식·표시 방식이 재무제표 해석에 영향을 줍니다.",
  },
  {
    term: "감사의견",
    aliases: ["Audit opinion"],
    definition:
      "외부 감사인이 재무제표가 기준에 따라 적정하게 표시되었는지에 대한 의견.",
    meaning:
      "한정·부적정 등은 리스크 신호로 추가 검토가 필요합니다.",
  },
  {
    term: "MD&A",
    aliases: [
      "사업의 내용",
      "경영자의 분석",
      "Management Discussion and Analysis",
    ],
    definition:
      "경영진이 실적·전망·위험 등을 서술하는 공시·보고서 섹션.",
    meaning:
      "숫자 뒤의 ‘설명’과 전략을 읽을 때 핵심입니다.",
  },
  {
    term: "10-K",
    aliases: ["10-K 보고서"],
    definition: "미국 SEC에 제출하는 연간 보고서.",
    meaning:
      "사업 개요·위험요인·재무제표가 한데 묶여 있습니다.",
  },
  {
    term: "10-Q",
    definition: "미국 SEC에 제출하는 분기 보고서.",
    meaning:
      "분기 실적과 최근 변화를 추적할 때 씁니다.",
  },
  {
    term: "8-K",
    definition:
      "미국에서 중요 사건 발생 시 제출하는 수시 공시.",
    meaning:
      "인수·경영진 변동·실적 발표 등 즉각적인 이벤트를 확인합니다.",
  },
  {
    term: "DART",
    aliases: ["전자공시", "금융감독원 전자공시"],
    definition: "금융감독원 전자공시시스템에 제출되는 국내 공시.",
    meaning:
      "사업보고서·분기보고서 등 국내 상장사 정보의 중심 창구입니다.",
  },
  {
    term: "EDGAR",
    definition: "미국 SEC의 전자 공시 시스템.",
    meaning:
      "미국 상장사 서류 검색·다운로드에 사용합니다.",
  },

  // --- 리스크·기타 ---
  {
    term: "Going concern",
    aliases: ["계속기업"],
    definition:
      "당분간 사업을 지속할 수 있다는 가정(회계상 전제).",
    meaning:
      "감사보고서 등에서 언급되면 유동성·존속 리스크를 집중 점검합니다.",
  },
  {
    term: "Goodwill",
    aliases: ["영업권"],
    definition:
      "인수 시 지급 금액과 순식별자산의 차이 등으로 인식되는 무형자산.",
    meaning:
      "손상차손 이슈가 실적에 큰 영향을 줄 수 있습니다.",
  },
  {
    term: "One-off",
    aliases: ["일회성", "비경상", "Non-recurring"],
    definition:
      "통상 매년 반복된다고 보기 어려운 수익·비용 항목.",
    meaning:
      "‘껍질 깐’ 이익을 보려면 일회성을 조정해 해석하기도 합니다.",
  },
  {
    term: "WACC",
    aliases: ["가중평균자본비용"],
    definition:
      "부채·자본 비용을 자본 구조 가중치로 합산한 할인율로 자주 쓰입니다.",
    meaning:
      "투자·밸류에이션에서 요구수익률의 기준으로 논의됩니다.",
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
