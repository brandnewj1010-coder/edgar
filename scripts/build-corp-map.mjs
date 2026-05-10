#!/usr/bin/env node
/**
 * 빌드 타임에 DART corpCode.xml을 처리해 public/corp-map.json 생성.
 * Vercel 배포 시 1회 실행 → CDN 정적 파일로 서빙 → 런타임 XML 다운로드 불필요.
 */
import { unzipSync, strFromU8 } from "fflate";
import { writeFileSync, mkdirSync } from "fs";

const dartKey = process.env.DART_API_KEY?.trim();
if (!dartKey) {
  console.log("[build-corp-map] DART_API_KEY 없음 — 건너뜀 (런타임 alias 폴백 사용)");
  process.exit(0);
}

function extractTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`, "i"));
  return m ? m[1].trim() : "";
}

try {
  console.log("[build-corp-map] DART corpCode.xml 다운로드 중...");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);

  const res = await fetch(
    `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${encodeURIComponent(dartKey)}`,
    { signal: controller.signal },
  );
  clearTimeout(timer);

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const buf = new Uint8Array(await res.arrayBuffer());
  const unzipped = unzipSync(buf);
  const xmlFile = Object.keys(unzipped).find((k) =>
    k.toUpperCase().endsWith("CORPCODE.XML"),
  );
  if (!xmlFile) throw new Error("ZIP 안에 CORPCODE.XML 없음");
  const xml = strFromU8(unzipped[xmlFile]);

  const byStock = {};
  const byName  = {};
  const listRe  = /<list[^>]*>([\s\S]*?)<\/list>/gi;
  let m;
  let count = 0;

  while ((m = listRe.exec(xml)) !== null) {
    const block     = m[1];
    const corpCode  = extractTag(block, "corp_code");
    const corpName  = extractTag(block, "corp_name");
    const stockCode = extractTag(block, "stock_code");
    if (!corpCode || !corpName || !/^\d{6}$/.test(stockCode)) continue;

    byStock[stockCode] = { corp_code: corpCode, corp_name: corpName };

    // 이름 → 종목코드 역인덱스 (정규화: 공백 제거, 소문자)
    const key = corpName.replace(/\s+/g, "").toLowerCase();
    byName[key] = stockCode;
    // 원본 (소문자 변환 전)도 추가
    const keyOrig = corpName.replace(/\s+/g, "");
    if (keyOrig !== key) byName[keyOrig] = stockCode;

    count++;
  }

  mkdirSync("public", { recursive: true });
  writeFileSync("public/corp-map.json", JSON.stringify({ byStock, byName }));
  console.log(`[build-corp-map] ✓ ${count}개 상장사 → public/corp-map.json`);
} catch (e) {
  console.warn(`[build-corp-map] 실패: ${e.message} — 런타임 폴백 사용`);
  process.exit(0); // 빌드 실패로 이어지지 않도록 0으로 종료
}
