/**
 * 공시·리포트 마크다운에서 달러 표기를 찾아 숫자(USD 기준)로 환산합니다.
 * 표 헤더의 "in millions" 등은 문맥을 완벽히 반영하지 못하므로 참고용입니다.
 */

export type ExtractedUsd = {
  /** 원문에 나온 문자열 */
  raw: string;
  /** USD 금액 (달러 단위. 5억 달러면 500_000_000) */
  usd: number;
};

const SCALE: Record<string, number> = {
  trillion: 1e12,
  billion: 1e9,
  million: 1e6,
  t: 1e12,
  b: 1e9,
  bn: 1e9,
  m: 1e6,
  mm: 1e6,
  mil: 1e6,
};

function parseNum(s: string): number {
  const n = parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function pushUnique(
  out: ExtractedUsd[],
  seen: Set<string>,
  raw: string,
  usd: number,
) {
  if (!Number.isFinite(usd) || usd === 0) return;
  const key = `${Math.round(usd)}:${raw.slice(0, 80)}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push({ raw: raw.trim(), usd });
}

/**
 * 텍스트에서 USD 표기를 추출합니다 (중복·유사 항목은 일부 제거).
 */
export function extractUsdAmounts(text: string, max = 40): ExtractedUsd[] {
  const out: ExtractedUsd[] = [];
  const seen = new Set<string>();
  const t = text.replace(/\r/g, "");

  const patterns: RegExp[] = [
    // $1.2 billion / $500 million / $2B / $10M
    /\$\s*([\d,]+(?:\.\d+)?)\s*(trillion|billion|million|bn|mil|mm|t|b|m)?/gi,
    // US$ 1,234 / USD 1,234
    /(?:US\$|USD)\s*([\d,]+(?:\.\d+)?)\s*(trillion|billion|million|bn|t|b|m)?/gi,
    // 1.5 billion USD
    /([\d,]+(?:\.\d+)?)\s*(trillion|billion|million)\s+USD/gi,
    // $ 기호만 (백만 등 접미 없음) — 큰 숫자만
    /\$\s*([\d]{1,3}(?:,\d{3})+(?:\.\d+)?|\d{4,}(?:\.\d+)?)\b/g,
  ];

  for (let p = 0; p < patterns.length; p++) {
    const re = patterns[p];
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      const raw = m[0];
      if (p === 3) {
        const n = parseNum(m[1] ?? "");
        if (!Number.isFinite(n) || n < 1000) continue;
        pushUnique(out, seen, raw, n);
        continue;
      }

      const n = parseNum(m[1] ?? "");
      const suf = (m[2] ?? "").toLowerCase();
      if (!Number.isFinite(n)) continue;
      const mult = suf ? SCALE[suf] ?? 1 : 1;
      const usd = n * mult;
      if (usd < 1) continue;
      pushUnique(out, seen, raw, usd);
    }
  }

  out.sort((a, b) => b.usd - a.usd);
  return out.slice(0, max);
}
