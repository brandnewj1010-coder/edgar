import type { FinancialTermEntry } from "../types";

/** 교육·공시 리포트에서 자주 나오는 한·영 재무 용어 (툴팁 시드) */
export const FINANCIAL_TERMS: FinancialTermEntry[] = [
  // --- 매출·손익 ---
  {
    term: "Revenue",
    aliases: ["Sales", "매출액", "영업수익"],
    definition: "재화·용역 판매 등으로 인식한 총수입.",
    meaning: "'얼마나 팔았는지'의 출발점입니다. 성장률·채널·단가와 함께 읽습니다.",
  },
  {
    term: "Net Loss",
    aliases: ["순손실", "당기순손실", "Net loss"],
    definition: "일정 기간 비용·손실이 수익을 초과해 당기순이익이 마이너스인 상태.",
    meaning: "적자 규모와 원인(일회성 vs 구조적)을 구분해 보는 것이 중요합니다.",
  },
  {
    term: "Gross Profit",
    aliases: ["매출총이익", "Gross profit"],
    definition: "매출액에서 매출원가를 뺀 이익.",
    meaning: "원가 관리·가격 결정력을 보는 단계로, 이후 판관비를 빼면 영업이익으로 이어집니다.",
    formula: "매출총이익 = 매출액 − 매출원가",
  },
  {
    term: "Gross Margin",
    aliases: ["매출총이익률", "Gross margin"],
    definition: "매출총이익을 매출액으로 나눈 비율.",
    meaning: "제품·서비스 단위당 '남는 폭'을 나타냅니다. 업종별로 비교가 중요합니다.",
    formula: "매출총이익률 = 매출총이익 ÷ 매출액",
  },
  {
    term: "Operating Margin",
    aliases: ["영업이익률", "Operating margin"],
    definition: "영업이익을 매출액으로 나눈 비율.",
    meaning: "본업의 수익성을 한 줄로 보는 지표입니다. 판관비 효율과 함께 봅니다.",
    formula: "영업이익률 = 영업이익 ÷ 매출액",
  },
  {
    term: "Net Margin",
    aliases: ["순이익률", "당기순이익률", "Net margin", "Net profit margin"],
    definition: "당기순이익을 매출액으로 나눈 비율.",
    meaning: "최종적으로 매출 대비 얼마가 남았는지 보여 줍니다. 비영업·세금·이자의 영향을 받습니다.",
  },
  {
    term: "매출원가율",
    definition: "매출원가를 매출액으로 나눈 비율.",
    meaning: "원가 부담이 매출 대비 얼마나 큰지 보는 지표입니다.",
    formula: "매출원가율 = 매출원가 ÷ 매출액",
  },
  {
    term: "COGS",
    aliases: ["Cost of Goods Sold", "매출원가", "Cost of revenue"],
    definition: "매출과 직접 대응되는 원가(재료·외주·재고 변동 등).",
    meaning: "매출 성장 대비 원가가 과도하게 늘지 않는지 확인할 때 봅니다.",
  },
  {
    term: "SG&A",
    aliases: ["판관비", "Selling, General and Administrative"],
    definition: "판매비와 일반관리비 등 영업 활동과 관련된 비용.",
    meaning: "규모의 경제·브랜드 투자·조직 효율 등이 반영됩니다. 매출 대비 비율을 자주 봅니다.",
  },
  {
    term: "EBIT",
    aliases: ["Earnings before interest and taxes"],
    definition: "이자와 법인세 차감 전 이익.",
    meaning: "자본 구조(이자비용)와 세금 전에 본업의 이익을 보고 싶을 때 씁니다.",
  },
  {
    term: "EBITDA",
    aliases: ["이비타"],
    definition: "이자·법인세·감가상각비·무형자산상각비 차감 전 이익.",
    meaning: "본업에서 벌어들인 현금에 가까운 수익력을 보기 위한 지표입니다.",
    formula: "EBITDA ≈ 영업이익 + 감가상각비 + 무형자산상각비",
  },
  {
    term: "당기순이익",
    aliases: ["순이익", "NI", "Net Income"],
    definition: "일정 기간 동안 법인세 등 모든 비용을 차감한 최종 이익.",
    meaning: "주주 입장에서 '남은 이익'에 가깝지만, 일회성 항목에 따라 크게 출렁일 수 있습니다.",
  },
  {
    term: "영업이익",
    aliases: ["영업손익", "Operating Income", "Operating Profit"],
    definition: "본업 활동에서 난 이익(매출에서 매출원가·판관비 등을 뺀 금액).",
    meaning: "'장사가 잘됐는지'를 보는 대표 지표입니다.",
  },

  // --- 현금흐름 ---
  {
    term: "현금흐름",
    aliases: ["Cash flow", "Cash Flow"],
    definition: "일정 기간 동안 유입·유출된 현금의 변동.",
    meaning: "발생주의 이익과 달리 '실제 돈'의 관점이라 청산력·배당 여력을 볼 때 중요합니다.",
  },
  {
    term: "영업활동현금흐름",
    aliases: ["영업현금흐름", "CFO", "Operating Cash Flow"],
    definition: "일상적인 영업 과정에서 실제로 유입·유출된 현금의 순액.",
    meaning: "이익과 달리 '현금' 기준이라 왜곡이 적은 편입니다.",
  },
  {
    term: "투자활동현금흐름",
    aliases: ["CFI", "Investing Cash Flow"],
    definition: "유형·무형자산 취득·처분, 투자증권 등 투자 활동에서의 현금 흐름.",
    meaning: "설비 투자·M&A·현금성 자산 운용이 반영됩니다.",
  },
  {
    term: "재무활동현금흐름",
    aliases: ["CFF", "Financing Cash Flow"],
    definition: "차입·상환, 유상증자, 배당 등 자금 조달·반환과 관련된 현금 흐름.",
    meaning: "레버리지 조정·주주 환원 정책이 드러납니다.",
  },
  {
    term: "Free Cash Flow",
    aliases: ["FCF", "잉여현금흐름", "자유현금흐름"],
    definition: "영업에서 번 현금에서 투자(CAPEX 등)를 차감한 남는 현금 흐름.",
    meaning: "배당·부채 상환·추가 투자 여력을 논할 때 자주 인용됩니다.",
  },

  // --- 재무상태표 ---
  {
    term: "Total Assets",
    aliases: ["총자산", "자산총계"],
    definition: "기업이 보유한 경제적 자원의 합계(유동·비유동).",
    meaning: "규모만으로는 판단하기 어렵고, 수익성·부채 구조와 함께 봅니다.",
  },
  {
    term: "Total Liabilities",
    aliases: ["총부채", "부채총계"],
    definition: "기업이 부담해야 할 채무·의무의 합계.",
    meaning: "단기·장기 구조, 이자 부담과 연결해 봅니다.",
  },
  {
    term: "Shareholders Equity",
    aliases: ["자기자본", "순자산", "Shareholders' equity", "자본총계"],
    definition: "자산에서 부채를 뺀 잔액으로, 소유주 지분에 해당하는 부분.",
    meaning: "내실(버퍼)과 레버리지 해석의 기준이 됩니다.",
  },
  {
    term: "부채비율",
    definition: "총부채를 자본으로 나눈 비율.",
    meaning: "재무 레버리지(빚 의존도)를 가늠합니다. 업종·성장 단계에 따라 해석이 달라집니다.",
    formula: "부채비율 = 부채 ÷ 자본",
  },
  {
    term: "유동비율",
    aliases: ["Current Ratio"],
    definition: "유동자산을 유동부채로 나눈 비율.",
    meaning: "단기 상환 능력을 보는 대표 지표입니다. 100% 미만이면 단기 자금 조달 여력을 더 살펴봅니다.",
    formula: "유동비율 = 유동자산 ÷ 유동부채",
  },
  {
    term: "당좌비율",
    aliases: ["Quick ratio"],
    definition: "당좌자산(현금성·매출채권 등)을 유동부채로 나눈 비율.",
    meaning: "재고를 제외한 '빨리 현금화되는 자산'으로 단기 지급능력을 볼 때 참고합니다.",
  },
  {
    term: "차입금",
    aliases: ["Borrowings", "Interest-bearing debt"],
    definition: "이자를 부담하는 차입성 부채(단기·장기).",
    meaning: "금리·만기 구조와 함께 이자비용·상환 리스크를 평가합니다.",
  },
  {
    term: "이자비용",
    aliases: ["Interest expense", "금융비용"],
    definition: "차입 등에 따른 이자 지출로 인식되는 비용.",
    meaning: "금리 변동·레버리지에 민감합니다.",
  },
  {
    term: "감가상각비",
    aliases: ["Depreciation"],
    definition: "유형자산의 사용·소모에 따라 비용으로 인식하는 금액.",
    meaning: "현금이 당장 나가지 않아도 비용으로 잡히므로, 이익과 현금흐름 차이를 이해할 때 필요합니다.",
  },
  {
    term: "무형자산",
    aliases: ["Intangible assets"],
    definition: "상표권·특허권·소프트웨어 등 형태 없는 자산.",
    meaning: "무형자산상각·손상이 이익에 영향을 줄 수 있습니다.",
  },

  // --- 수익성·밸류 ---
  {
    term: "ROE",
    aliases: ["자기자본이익률", "Return on Equity"],
    definition: "순이익을 자기자본으로 나눈 수익률.",
    meaning: "주주 투입 자본이 얼마나 효율적으로 이익을 내는지 보여 줍니다.",
  },
  {
    term: "ROA",
    aliases: ["총자산이익률", "Return on assets"],
    definition: "순이익을 총자산으로 나눈 수익률.",
    meaning: "자산 전체를 얼마나 효율적으로 굴려 이익을 냈는지 봅니다.",
  },
  {
    term: "ROIC",
    aliases: ["투하자본이익률", "Return on invested capital"],
    definition: "투입된 자본 대비 사업에서 벌어들인 초과수익을 보는 지표.",
    meaning: "장기적인 사업 가치 창출 논의에서 자주 등장합니다.",
  },
  {
    term: "EPS",
    aliases: ["주당순이익", "Earnings per share"],
    definition: "순이익을 유통주식수로 나눈 값.",
    meaning: "주당 벌어들인 이익으로, PER 등 밸류에이션과 함께 자주 쓰입니다.",
  },
  {
    term: "PER",
    aliases: ["주가수익비율", "P/E", "Price-to-Earnings"],
    definition: "주가를 주당순이익(EPS)으로 나눈 배수.",
    meaning: "시장이 기업 이익에 대해 얼마나 미래를 반영해 평가하는지 보는 지표입니다.",
  },
  {
    term: "PBR",
    aliases: ["주가순자산비율", "P/B", "Price-to-Book"],
    definition: "주가를 주당순자산(BPS)으로 나눈 배수.",
    meaning: "순자산 대비 시장 평가 수준을 볼 때 쓰입니다.",
  },
  {
    term: "EV/EBITDA",
    definition: "기업가치(EV)를 EBITDA로 나눈 배수.",
    meaning: "M&A·동종 비교에 자주 쓰이는 상대 밸류 지표입니다.",
  },

  // --- 성장·비교 ---
  {
    term: "YoY",
    aliases: ["전년동기대비", "Year-over-year", "Y/Y"],
    definition: "전년 동일 기간 대비 변화율 또는 변화량.",
    meaning: "계절성을 일부 제거한 성장·추세 해석에 쓰입니다.",
  },
  {
    term: "QoQ",
    aliases: ["전분기대비", "Quarter-over-quarter"],
    definition: "직전 분기 대비 변화.",
    meaning: "단기 흐름·계절 요인에 민감할 수 있어 업종별로 해석합니다.",
  },
  {
    term: "CAGR",
    aliases: ["연평균성장률", "Compound annual growth rate"],
    definition: "여러 해에 걸친 성장을 연복리로 환산한 평균 성장률.",
    meaning: "중장기 매출·이익 추세를 한 숫자로 비교할 때 씁니다.",
  },
  {
    term: "TTM",
    aliases: ["LTM", "Trailing twelve months"],
    definition: "직전 12개월 누적 기준으로 지표를 산출한 값.",
    meaning: "분기 변동을 완화해 최근 실적을 볼 때 자주 씁니다.",
  },

  // --- 공시·보고서 ---
  {
    term: "GAAP",
    definition: "미국 일반적으로 인정되는 회계 원칙(Generally Accepted Accounting Principles).",
    meaning: "미국 상장사 공시에서 자주 언급됩니다. Non-GAAP 조정과 대비해 읽습니다.",
  },
  {
    term: "IFRS",
    aliases: ["K-IFRS", "국제회계기준"],
    definition: "국제회계기준으로, 국내 상장사는 K-IFRS를 적용합니다.",
    meaning: "인식·표시 방식이 재무제표 해석에 영향을 줍니다.",
  },
  {
    term: "감사의견",
    aliases: ["Audit opinion"],
    definition: "외부 감사인이 재무제표가 기준에 따라 적정하게 표시되었는지에 대한 의견.",
    meaning: "한정·부적정 등은 리스크 신호로 추가 검토가 필요합니다.",
  },
  {
    term: "MD&A",
    aliases: ["사업의 내용", "경영자의 분석", "Management Discussion and Analysis"],
    definition: "경영진이 실적·전망·위험 등을 서술하는 공시·보고서 섹션.",
    meaning: "숫자 뒤의 '설명'과 전략을 읽을 때 핵심입니다.",
  },
  {
    term: "10-K",
    aliases: ["10-K 보고서", "Annual Report on Form 10-K"],
    definition: "미국 SEC에 제출하는 연간 보고서. 사업 개요·위험요인·재무제표 포함.",
    meaning: "미국 상장사의 가장 포괄적인 공시 문서입니다.",
  },
  {
    term: "10-Q",
    definition: "미국 SEC에 제출하는 분기 보고서.",
    meaning: "분기 실적과 최근 변화를 추적할 때 씁니다.",
  },
  {
    term: "8-K",
    definition: "미국에서 중요 사건 발생 시 제출하는 수시 공시.",
    meaning: "인수·경영진 변동·실적 발표 등 즉각적인 이벤트를 확인합니다.",
  },
  {
    term: "DART",
    aliases: ["전자공시", "금융감독원 전자공시"],
    definition: "금융감독원 전자공시시스템에 제출되는 국내 공시.",
    meaning: "사업보고서·분기보고서 등 국내 상장사 정보의 중심 창구입니다.",
  },
  {
    term: "EDGAR",
    definition: "미국 SEC의 전자 공시 시스템(Electronic Data Gathering, Analysis, and Retrieval).",
    meaning: "미국 상장사 서류 검색·다운로드에 사용합니다.",
  },
  {
    term: "사업보고서",
    aliases: ["Annual business report"],
    definition: "국내 상장사가 DART에 제출하는 연간 공시 보고서.",
    meaning: "재무제표·임원 현황·직원 현황·사업 개요 등이 포함됩니다.",
  },
  {
    term: "분기보고서",
    aliases: ["Quarterly report"],
    definition: "1분기·3분기에 제출하는 분기 실적 공시.",
    meaning: "연간 사업보고서 사이의 중간 실적을 확인할 때 씁니다.",
  },
  {
    term: "반기보고서",
    aliases: ["Semi-annual report"],
    definition: "상반기(6월 말 기준) 실적을 담아 제출하는 공시.",
    meaning: "연간·분기 중간 시점의 경영 성과를 추적합니다.",
  },

  // --- 리스크·기타 ---
  {
    term: "Going concern",
    aliases: ["계속기업"],
    definition: "당분간 사업을 지속할 수 있다는 가정(회계상 전제).",
    meaning: "감사보고서 등에서 언급되면 유동성·존속 리스크를 집중 점검합니다.",
  },
  {
    term: "Goodwill",
    aliases: ["영업권"],
    definition: "인수 시 지급 금액과 순식별자산의 차이 등으로 인식되는 무형자산.",
    meaning: "손상차손 이슈가 실적에 큰 영향을 줄 수 있습니다.",
  },
  {
    term: "One-off",
    aliases: ["일회성", "비경상", "Non-recurring"],
    definition: "통상 매년 반복된다고 보기 어려운 수익·비용 항목.",
    meaning: "'껍질 깐' 이익을 보려면 일회성을 조정해 해석하기도 합니다.",
  },
  {
    term: "WACC",
    aliases: ["가중평균자본비용"],
    definition: "부채·자본 비용을 자본 구조 가중치로 합산한 할인율.",
    meaning: "투자·밸류에이션에서 요구수익률의 기준으로 논의됩니다.",
  },

  // ===== HR / 보상 (신규) =====

  {
    term: "CEO Pay Ratio",
    aliases: ["CEO 보수 배율", "CEO 급여 배율", "임직원 보수 격차"],
    definition:
      "CEO(또는 최고보수 임원)의 연간 총보상을 일반 직원 중위(또는 평균) 총보상으로 나눈 배수.",
    meaning:
      "HR 실무자가 조직 공정성·보상 철학을 진단하는 핵심 지표입니다. 미국 상장사는 SEC 규정에 따라 Proxy(DEF 14A)에 공시 의무가 있습니다.",
    formula: "CEO Pay Ratio = CEO 총보상 ÷ 직원 중위 총보상",
  },
  {
    term: "Proxy Statement",
    aliases: ["위임장 설명서", "Proxy", "대리 설명서"],
    definition:
      "미국 상장사가 주주총회 전에 SEC에 제출하는 공시 문서(DEF 14A). 임원 보상·이사 선임·주주 의결사항 등을 상세히 기재.",
    meaning:
      "CEO Pay Ratio, 임원 총보상 명세, Say-on-Pay 결과가 여기에 담깁니다. HR 벤치마킹의 가장 풍부한 공개 데이터 원천입니다.",
  },
  {
    term: "DEF 14A",
    aliases: ["Definitive Proxy Statement", "프록시"],
    definition:
      "SEC에 제출되는 '확정판' 주주총회 위임장 설명서 양식. 임원 보수 전반이 공시됩니다.",
    meaning:
      "EDGAR에서 검색해 임원 보상 구조·CEO Pay Ratio·이사 보수를 확인할 수 있습니다.",
  },
  {
    term: "Section 16",
    aliases: ["Section 16 임원", "Section 16 officer", "섹션 16"],
    definition:
      "미국 증권거래법 Section 16에 따라 SEC에 지분 변동을 보고해야 하는 임원·대주주(10% 이상). Form 4를 통해 주식 거래를 공시합니다.",
    meaning:
      "내부자(Insider) 거래 투명성을 위한 규정입니다. DEF 14A의 임원 보상 테이블에 Section 16 임원들의 보상이 열거됩니다.",
  },
  {
    term: "Named Executive Officers",
    aliases: ["NEO", "명시 임원", "보수 공시 대상 임원"],
    definition:
      "미국 SEC 규정상 Proxy Statement에 개인별 보상을 공시해야 하는 5명의 임원(CEO·CFO 포함).",
    meaning:
      "Proxy Statement의 Summary Compensation Table에 각 NEO별 기본급·보너스·주식·연금 등이 명시됩니다.",
  },
  {
    term: "Total Compensation",
    aliases: ["총보상", "총보수", "Total Comp"],
    definition:
      "기본급·단기 인센티브(보너스)·장기 인센티브(주식 보상)·복리후생·퇴직급여를 합산한 종합 보상 금액.",
    meaning:
      "단순 연봉과 달리 주식·옵션 등 비현금 보상이 포함돼 실질 보상 수준을 비교할 때 씁니다.",
    formula: "총보상 = 기본급 + STI + LTI + 복리후생 + 퇴직급여",
  },
  {
    term: "Base Salary",
    aliases: ["기본급", "기본 연봉", "Base Pay"],
    definition:
      "성과와 무관하게 고정적으로 지급되는 급여 기준액.",
    meaning:
      "보상 구조에서 'at-risk pay'(성과연동)와 구분되는 고정급 부분입니다.",
  },
  {
    term: "Annual Bonus",
    aliases: ["연간 인센티브", "연봉 보너스", "Short-term Incentive", "STI"],
    definition:
      "회계연도 성과(매출·이익·KPI 달성률 등)에 연동하여 1년 단위로 지급되는 변동 보상.",
    meaning:
      "단기 성과주의를 반영하며, 지급 기준(threshold·target·maximum)이 Proxy에 공시됩니다.",
  },
  {
    term: "Long-Term Incentive",
    aliases: ["LTI", "장기 인센티브", "LTIP", "Long-Term Incentive Plan"],
    definition:
      "3년 이상의 성과 또는 재직 기간을 조건으로 주식·현금으로 지급하는 보상 계획.",
    meaning:
      "임원의 장기적 가치 창출과 주주 이익 정렬을 위한 핵심 도구입니다. RSU·PSU·스톡옵션이 주요 수단입니다.",
  },
  {
    term: "RSU",
    aliases: ["Restricted Stock Unit", "양도제한조건부주식", "주식지급형"],
    definition:
      "일정 기간(vesting period) 재직 또는 성과 달성 후 주식으로 전환되는 보상 단위.",
    meaning:
      "스톡옵션과 달리 주가 하락 시에도 일정 가치가 있어 최근 임원 보상에서 선호됩니다.",
  },
  {
    term: "PSU",
    aliases: ["Performance Share Unit", "성과주식", "PSA"],
    definition:
      "특정 재무·비재무 성과 지표 달성도에 따라 지급 수량이 결정되는 주식 보상 단위.",
    meaning:
      "EPS·TSR(주주총수익률) 등 성과 목표와 연동되어 임원의 경영 책임을 강화합니다.",
  },
  {
    term: "Stock Option",
    aliases: ["스톡옵션", "주식매수선택권", "Stock options"],
    definition:
      "미리 정한 행사가격(exercise price)으로 회사 주식을 매수할 수 있는 권리.",
    meaning:
      "주가 상승분만큼 이익을 얻는 구조로, 주가 하락 시 가치가 '0'이 될 수 있습니다.",
  },
  {
    term: "Say-on-Pay",
    aliases: ["보수 결정권", "임원보수 주주투표"],
    definition:
      "주주가 임원 보상 패키지에 대해 찬반 투표를 하는 제도(미국은 3년 주기 의무).",
    meaning:
      "찬성률이 낮으면(50% 미만) 이사회 보상위원회가 큰 부담을 받습니다. Proxy에 결과가 공시됩니다.",
  },
  {
    term: "Compensation Committee",
    aliases: ["보상위원회", "보수위원회"],
    definition:
      "이사회 산하 위원회로, 임원 보상 정책 수립·결정·감독을 담당.",
    meaning:
      "보상위원회의 독립성·전문성이 임원 보상의 적정성을 좌우합니다. Proxy에 구성원과 활동이 공시됩니다.",
  },
  {
    term: "Clawback",
    aliases: ["보수 환수", "Clawback Policy"],
    definition:
      "재무 재작성·부정행위 등 특정 상황에서 지급된 임원 보상을 회사가 환수하는 정책.",
    meaning:
      "2023년부터 SEC 규정으로 미국 상장사 의무화되었습니다. 보상 거버넌스의 중요 요소입니다.",
  },
  {
    term: "Vesting",
    aliases: ["베스팅", "권리 확정", "Vesting period"],
    definition:
      "주식·옵션 보상이 실제로 지급·행사 가능한 상태가 되기까지의 기간 또는 조건 충족 과정.",
    meaning:
      "보통 3~4년 균등 분할(cliff/graded) 방식으로 재직을 유인합니다.",
  },

  // --- 인건비·HR 재무 지표 ---
  {
    term: "인건비",
    aliases: ["Labor Cost", "Personnel Cost", "Payroll"],
    definition:
      "급여·퇴직급여·복리후생·주식보상 등 직원 고용에 드는 모든 비용의 합계.",
    meaning:
      "매출 대비 인건비율이 올라가면 원가 구조가 악화될 수 있습니다. HR KPI와 재무 성과를 잇는 핵심 항목입니다.",
  },
  {
    term: "인건비율",
    aliases: ["Labor Cost Ratio", "인건비/매출"],
    definition: "인건비를 매출액으로 나눈 비율.",
    meaning:
      "인력 생산성의 역수 개념입니다. 업종·사업 모델별로 기준이 크게 다르므로 동종 비교가 중요합니다.",
    formula: "인건비율 = 인건비 ÷ 매출액 × 100",
  },
  {
    term: "인당 영업이익",
    aliases: ["Operating Profit per Employee", "직원 1인당 영업이익"],
    definition: "영업이익을 직원 수로 나눈 값.",
    meaning:
      "직원 1명이 창출하는 사업 이익을 측정하는 노동 생산성 지표입니다. 업종 간 차이가 크므로 동종 비교가 필수입니다.",
    formula: "인당 영업이익 = 영업이익 ÷ 직원 수",
  },
  {
    term: "인당 매출",
    aliases: ["Revenue per Employee", "직원 1인당 매출"],
    definition: "매출액을 직원 수로 나눈 값.",
    meaning:
      "인력 효율성을 나타내는 기본 지표로, 산업·사업 구조에 따라 해석이 달라집니다.",
    formula: "인당 매출 = 매출액 ÷ 직원 수",
  },
  {
    term: "평균근속연수",
    aliases: ["Average Tenure", "평균 재직기간"],
    definition: "직원들의 현재 회사 재직 기간 평균.",
    meaning:
      "이직률과 함께 조직 안정성·직원 몰입도를 간접적으로 보여 줍니다.",
  },
  {
    term: "이직률",
    aliases: ["Turnover Rate", "Attrition Rate"],
    definition: "일정 기간 동안 퇴사한 인원을 평균 직원 수로 나눈 비율.",
    meaning:
      "높은 이직률은 채용·교육 비용 증가와 지식 손실로 이어져 재무 비용에도 영향을 줍니다.",
    formula: "이직률 = 퇴사자 수 ÷ 평균 직원 수 × 100",
  },
  {
    term: "직원 1인당 평균급여",
    aliases: ["Average Salary per Employee", "평균 연봉"],
    definition:
      "총 급여 지급액을 직원 수로 나눈 1인당 평균 급여.",
    meaning:
      "사업보고서 직원 현황에서 확인할 수 있으며, 업종·지역별 급여 수준 비교에 활용됩니다.",
  },
  {
    term: "임원 보수",
    aliases: ["Executive Compensation", "임원 보상", "임원 급여"],
    definition:
      "등기이사·감사 등 임원에게 지급된 급여·상여·퇴직금·주식보상의 합계.",
    meaning:
      "사업보고서 임원 현황에서 총액·1인당 평균을 확인할 수 있습니다. 직원 급여와의 비율로 보상 불균형을 진단합니다.",
  },
  {
    term: "퇴직급여",
    aliases: ["Retirement Benefit", "퇴직충당금", "Pension Expense"],
    definition: "직원 퇴직 시 지급할 급여를 재직 기간 동안 비용으로 인식한 금액.",
    meaning:
      "확정급여형(DB) 제도는 운용 성과·금리 변동에 따라 부채가 커질 수 있습니다.",
  },
  {
    term: "복리후생",
    aliases: ["Employee Benefits", "Benefits", "후생비"],
    definition:
      "급여 외 의료보험·식비·교통비·교육비·주택 지원 등 비금전적·보조적 보상.",
    meaning:
      "총보상(Total Compensation)의 중요한 구성 요소로, 인재 유치·유지 전략에 영향을 줍니다.",
  },
  {
    term: "성과급",
    aliases: ["Incentive Pay", "Performance Bonus", "인센티브"],
    definition:
      "개인·팀·조직의 성과 목표 달성도에 따라 지급하는 변동 보상.",
    meaning:
      "고정급 비중이 낮을수록 경기 침체기에 비용 유연성이 높아지는 반면, 직원 안정성은 낮아질 수 있습니다.",
  },

  // --- ESG·지배구조 ---
  {
    term: "ESG",
    aliases: ["환경·사회·지배구조", "Environmental, Social, Governance"],
    definition:
      "기업의 환경(E)·사회(S)·지배구조(G) 측면의 비재무적 성과를 종합적으로 평가하는 프레임워크.",
    meaning:
      "HR은 'S' 영역(직원 다양성·안전·복지)과 'G' 영역(임원 보상·이사회 구성)에 직접 관여합니다.",
  },
  {
    term: "이사회",
    aliases: ["Board of Directors", "BOD"],
    definition:
      "주주로부터 위임받아 회사의 최고 의사결정을 감독·승인하는 기관.",
    meaning:
      "이사회 구성(독립성·다양성)과 활동이 지배구조 평가의 핵심입니다.",
  },
  {
    term: "사외이사",
    aliases: ["Independent Director", "Outside Director"],
    definition:
      "회사 경영진이나 지배주주와 독립적인 관계를 유지하는 비상근 이사.",
    meaning:
      "이사회 독립성 확보를 위해 상장사는 일정 비율 이상 사외이사를 두어야 합니다.",
  },
  {
    term: "감사위원회",
    aliases: ["Audit Committee"],
    definition:
      "이사회 산하 위원회로, 재무보고·내부통제·외부 감사 감독을 담당.",
    meaning:
      "회계 투명성의 핵심 기구입니다. 독립이사들로 구성됩니다.",
  },
  {
    term: "내부회계관리제도",
    aliases: ["Internal Control over Financial Reporting", "ICFR"],
    definition:
      "재무제표의 신뢰성 확보를 위한 내부 통제 체계.",
    meaning:
      "중요한 취약점이 발견되면 감사의견·투자자 신뢰에 영향을 미칩니다.",
  },
  {
    term: "지배구조",
    aliases: ["Corporate Governance", "거버넌스"],
    definition:
      "기업을 통제·감독하는 구조와 절차(이사회·주주·경영진 간 관계).",
    meaning:
      "지배구조 수준은 ESG 평가·투자자 신뢰·장기 성과와 연결됩니다.",
  },
  {
    term: "최대주주",
    aliases: ["Largest Shareholder", "Controlling Shareholder"],
    definition:
      "의결권 기준 최다 지분을 보유한 주주.",
    meaning:
      "지배구조·경영 방향·이익 분배 결정에 결정적 영향을 미칩니다.",
  },
  {
    term: "지분율",
    aliases: ["Ownership Ratio", "Shareholding Ratio"],
    definition:
      "특정 주주가 보유한 주식 수를 발행 주식 총수로 나눈 비율.",
    meaning:
      "5% 이상이면 대량보유보고, 10% 이상이면 주요주주 의무가 생깁니다.",
  },
  {
    term: "Form 4",
    aliases: ["폼 4"],
    definition:
      "미국 Section 16 임원·이사·대주주가 주식 거래 후 2영업일 내에 SEC에 제출해야 하는 내부자 거래 보고서.",
    meaning:
      "임원들의 주식 매수·매도·행사 등을 실시간으로 추적할 수 있어 내부자 동향 파악에 활용됩니다.",
  },
  {
    term: "TSR",
    aliases: ["Total Shareholder Return", "주주총수익률"],
    definition:
      "주가 상승분과 배당금을 합산한 주주의 총 투자 수익률.",
    meaning:
      "임원 LTI의 성과 지표로 자주 쓰입니다. 동종 업계 TSR과 비교(Relative TSR)해 임원 성과를 평가합니다.",
    formula: "TSR = (기말 주가 − 기초 주가 + 배당금) ÷ 기초 주가",
  },
  {
    term: "Peer Group",
    aliases: ["피어 그룹", "비교 대상 기업군"],
    definition:
      "임원 보상 수준 결정·TSR 비교를 위해 이사회가 선정한 동종·규모 유사 기업 집합.",
    meaning:
      "Proxy Statement에 Peer Group 목록과 선정 기준이 공시됩니다. 보상 벤치마킹의 기준점입니다.",
  },
  {
    term: "Annual Report",
    aliases: ["연간 보고서", "주주 연례 보고서"],
    definition:
      "기업이 주주에게 보내는 연간 경영 성과 보고서. 미국은 10-K와 별도로 발행하기도 합니다.",
    meaning:
      "재무 성과 외 CEO 메시지·전략 방향이 담겨 투자자·직원 소통의 창구가 됩니다.",
  },
  {
    term: "Headcount",
    aliases: ["직원수", "임직원수", "인원수"],
    definition:
      "특정 시점 기준 회사에 고용된 전체 직원 수(정규직·계약직 등 포함 기준은 공시마다 상이).",
    meaning:
      "인당 생산성 지표의 분모이자 인건비 예측의 기초 데이터입니다.",
  },
  {
    term: "등기임원",
    aliases: ["Registered Executive", "등기이사"],
    definition:
      "상업등기부에 등재된 이사·감사. 상법상 책임과 공시 의무를 집니다.",
    meaning:
      "사업보고서에 개인별 보수가 공시될 수 있습니다(5억 원 이상 시 의무).",
  },
  {
    term: "미등기임원",
    aliases: ["Non-registered Executive", "비등기임원"],
    definition:
      "상업등기부에 등재되지 않은 임원(부사장·전무 등). 경영 의사결정에 참여하지만 법적 이사 책임은 없음.",
    meaning:
      "사업보고서의 직원 현황에 포함되기도 하며, 등기임원보다 개인 보수 공시 의무가 낮습니다.",
  },
  {
    term: "스톡그랜트",
    aliases: ["Stock Grant", "주식 부여"],
    definition:
      "회사가 임직원에게 무상으로 자사 주식을 부여하는 보상 방식.",
    meaning:
      "RSU처럼 vesting 조건이 붙기도 하며, 주식보상비용(SBC)으로 재무제표에 반영됩니다.",
  },
  {
    term: "주식보상비용",
    aliases: ["Stock-Based Compensation", "SBC", "Share-based payment"],
    definition:
      "임직원에게 지급된 주식·옵션의 공정가치를 비용으로 인식한 금액.",
    meaning:
      "현금 지출은 없지만 손익계산서에 비용으로 잡혀 이익을 줄입니다. Non-GAAP 조정 시 종종 제외합니다.",
  },
  {
    term: "Non-GAAP",
    aliases: ["조정 이익", "Adjusted Earnings", "Non-GAAP Earnings"],
    definition:
      "일회성·비현금 항목(SBC·감가상각·구조조정 등)을 제외하고 경영진이 자체 정의한 이익 지표.",
    meaning:
      "GAAP 이익과 차이가 클수록 조정 항목의 성격·규모를 꼭 확인해야 합니다.",
  },
  {
    term: "Diluted EPS",
    aliases: ["희석 주당이익", "Diluted Earnings per Share"],
    definition:
      "스톡옵션·전환사채 등 잠재적 주식이 모두 행사됐다고 가정한 주당순이익.",
    meaning:
      "주식보상 제도가 많은 기업에서 Basic EPS와 차이가 클 수 있습니다.",
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
