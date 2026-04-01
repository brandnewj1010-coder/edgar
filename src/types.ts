export type DisclosureSource = "dart" | "edgar";

export type QuizItem = {
  question: string;
  choices: string[];
  correctIndex: number;
};

export type AnalyzeResponse = {
  reportMarkdown: string;
  quiz: QuizItem[];
  groundingQueries: string[];
  sources: { title: string; uri: string }[];
  model: string;
  source: DisclosureSource;
  query: string;
};

export type FinancialTermEntry = {
  /** 표시·매칭에 쓰는 대표 키워드 */
  term: string;
  aliases?: string[];
  definition: string;
  meaning: string;
  formula?: string;
};
