/** 마크다운 본문 기준 대략적인 읽는 시간(분) — 한·영 혼합 가정 */
export function estimateReadingMinutes(markdown: string): number {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_~`|-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return 1;
  const cjk = (plain.match(/[\u3040-\u9fff\uac00-\ud7af]/g) || []).length;
  const asciiWords = plain
    .replace(/[\u3040-\u9fff\uac00-\ud7af]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const units = cjk * 0.45 + asciiWords;
  const minutes = Math.max(1, Math.round(units / 380));
  return Math.min(minutes, 120);
}
