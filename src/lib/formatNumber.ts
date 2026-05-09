/**
 * 표·차트에서 공통으로 쓰는 숫자 표시 유틸.
 * - 천 단위 콤마(ko-KR locale)
 * - 음수·괄호음수 판별 (회계식 -123 / (123) 모두 포함)
 * - 숫자스러운 셀(통화 기호·단위·퍼센트 포함) 인식
 */

export function formatNumber(value: number, opts?: { decimals?: number }): string {
  if (!Number.isFinite(value)) return "—";
  const decimals =
    opts?.decimals ?? (Math.abs(value) >= 100 ? 0 : 2);
  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatNumberWithUnit(value: number, unit?: string): string {
  const num = formatNumber(value);
  return unit ? `${num} ${unit}` : num;
}

/** 회계식 음수(-, −, U+2212, 또는 괄호) 모두 인식 */
export function isNegativeText(text: string): boolean {
  const t = text.trim();
  if (t.startsWith("-") || t.startsWith("−") || t.startsWith("–")) return true;
  if (/^\(.*\)$/.test(t) && /\d/.test(t)) return true;
  return false;
}

/** 통화·단위·퍼센트가 섞여 있어도 "수치 셀"이면 true */
export function isNumericCell(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /^[\(\-−–]?\s*[\$₩]?\s*[\d,]+(\.\d+)?\s*[\)%]?\s*(원|조|억|만|백만|십억|trillion|billion|million|bn|mil|m|b|t|%)?\s*$/i.test(
    t,
  );
}
