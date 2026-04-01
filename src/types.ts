export type DisclosureSource = "dart" | "edgar";

export type QuizItem = {
  question: string;
  choices: string[];
  correctIndex: number;
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
