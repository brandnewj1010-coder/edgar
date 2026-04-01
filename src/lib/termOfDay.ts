import { FINANCIAL_TERMS } from "../data/financialTerms";
import type { FinancialTermEntry } from "../types";

/** 날짜 기준으로 하루 하나 고정되는 용어 */
export function getTermOfTheDay(): FinancialTermEntry {
  const d = new Date();
  const seed =
    d.getUTCFullYear() * 10000 +
    (d.getUTCMonth() + 1) * 100 +
    d.getUTCDate();
  const idx = seed % FINANCIAL_TERMS.length;
  return FINANCIAL_TERMS[idx]!;
}
