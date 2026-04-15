export type DisclosureSource = "dart" | "edgar";

export type QuizItem = {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation?: string;
};

/** 객관식 외 서술·토론형 과제 */
export type ReflectionItem = {
  title: string;
  prompt: string;
};

export type SankeyNodeCategory =
  | "revenue"
  | "profit"
  | "expense"
  | "neutral";

export type SankeyChartData = {
  title?: string;
  unit?: string;
  nodes: Array<{
    id: string;
    label: string;
    category?: SankeyNodeCategory;
  }>;
  links: Array<{
    source: string;
    target: string;
    value: number;
  }>;
};

// --- 재무 차트 데이터 ---

export type FinancialMetric = {
  label: string;
  /** 당기 (가장 최근 연도) */
  current: number | null;
  /** 전기 */
  prior: number | null;
  /** 전전기 */
  priorPrior: number | null;
  /** 수치 단위 (예: "백만원", "억원", "명", "%") */
  unit: string;
  /** 차트용 분류 */
  category: "income" | "cashflow" | "balance" | "hr" | "ratio";
};

export type HrMetrics = {
  /** 직원 총 수 */
  headcount?: number | null;
  /** 직원 1인당 평균 급여 (백만원) */
  avgSalaryMillion?: number | null;
  /** 임원 중 최대 보수 (백만원) */
  execMaxPayMillion?: number | null;
  /** 임원 보수 합계 (백만원) */
  execTotalPayMillion?: number | null;
  /** 임원수 */
  execCount?: number | null;
  /** 인건비 / 매출 비율 (%) */
  laborToRevenueRatio?: number | null;
  /** 인당 영업이익 (백만원) */
  opIncomePerEmployee?: number | null;
  /** 인당 매출 (백만원) */
  revenuePerEmployee?: number | null;
  /** CEO 보수 배율 (임원 최대 / 직원 평균) */
  payRatio?: number | null;
};

export type FinancialChartData = {
  /** 기업명 */
  corp: string;
  /** 당기 회계연도 (예: "2024") */
  currentYear: string;
  priorYear: string;
  priorPriorYear: string;
  /** 주요 재무 지표 (손익·현금흐름·재무상태) */
  metrics: FinancialMetric[];
  /** HR 특화 지표 */
  hrMetrics?: HrMetrics;
  /** 수치 단위 설명 (예: "단위: 백만원") */
  unitNote?: string;
};

// --- EDGAR (SEC) ---

export type EdgarCompany = {
  cik: string;           // 10자리 패딩된 CIK
  name: string;
  ticker: string;
};

export type EdgarFiling = {
  accessionNumber: string;
  form: string;
  filingDate: string;
  primaryDocument: string;
  reportDate?: string;
};

export type EdgarFinancialFact = {
  label: string;
  unit: string;
  values: Array<{
    end: string;         // ISO date (fiscal year end)
    val: number;
    form: string;
    filed: string;
    frame?: string;
  }>;
};

// --- 스터디/퀴즈 아카이브 ---

export type QuizSession = {
  id: string;
  at: number;            // unix ms
  source: DisclosureSource;
  query: string;
  questions: QuizItem[];
  answers: (number | null)[];   // 사용자가 고른 choice index
  score: number | null;         // null = 미완료
};

export type AnalyzeResponse = {
  reportMarkdown: string;
  quiz: QuizItem[];
  reflectionPrompts: ReflectionItem[];
  sankey: SankeyChartData | null;
  groundingQueries: string[];
  sources: { title: string; uri: string }[];
  model: string;
  source: DisclosureSource;
  query: string;
  /** 구조화된 차트 데이터 (DART/EDGAR에서 추출) */
  chartData?: FinancialChartData | null;
  /** 기업 간 비교 시 상대 기업 */
  compareWith?: string;
  /** 선택된 회계 연도 비교 (예: 2023, 2024, 2025) */
  fiscalYears?: number[];
};

export type FinancialTermEntry = {
  /** 표시·매칭에 쓰는 대표 키워드 */
  term: string;
  aliases?: string[];
  definition: string;
  meaning: string;
  formula?: string;
};
