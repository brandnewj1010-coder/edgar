/**
 * 금융감독원 전자공시 오픈다트 Open API
 * https://opendart.fss.or.kr/
 * 인증키 발급: 홈페이지 회원가입 → 인증키 신청 (무료)
 */
import { strFromU8, unzipSync } from "fflate";
import type { FinancialChartData, FinancialMetric, HrMetrics } from "../src/types.js";

const BASE = "https://opendart.fss.or.kr/api";

export type DartCorp = {
  corp_code: string;
  corp_name: string;
  stock_code: string;
};

type DartApiEnvelope = {
  status: string;
  message: string;
  list?: unknown;
};

export type FnlttRow = {
  sj_div?: string;
  sj_nm?: string;
  account_id?: string;   // IFRS 표준 코드 (ifrs-full_Revenue 등)
  account_nm?: string;
  thstrm_amount?: string;
  frmtrm_amount?: string;
  bfefrmtrm_amount?: string;
  ord?: string;
};

/** ── 인메모리 캐시 (TTL: 6시간) ── */
interface CacheEntry<T> {
  data: T;
  expiry: number;
}
const BUNDLE_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const bundleCache = new Map<string, CacheEntry<DartBundle>>();

function getBundleCacheKey(corp_code: string, bsns_year: string): string {
  return `${corp_code}:${bsns_year}`;
}

function getCachedBundle(key: string): DartBundle | null {
  const entry = bundleCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    bundleCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedBundle(key: string, data: DartBundle): void {
  bundleCache.set(key, { data, expiry: Date.now() + BUNDLE_CACHE_TTL_MS });
}

/** ── 기업 목록 캐시 ── */
let corpXmlCache: string | null = null;
let corpXmlCacheKey = "";

/** ── corp-map.json 캐시 (빌드타임 생성 → CDN 서빙) ── */
type CorpMapEntry = { corp_code: string; corp_name: string };
type CorpMap = { byStock: Record<string, CorpMapEntry>; byName: Record<string, string> };
let corpMapCache: CorpMap | null = null;
let corpMapLoaded = false;

function buildCorpMapFromXml(xml: string): CorpMap {
  const byStock: Record<string, CorpMapEntry> = {};
  const byName: Record<string, string> = {};
  const listRe = /<list[^>]*>([\s\S]*?)<\/list>/gi;
  let m: RegExpExecArray | null;
  while ((m = listRe.exec(xml)) !== null) {
    const block = m[1];
    const corp_code = extractTag(block, "corp_code");
    const corp_name = extractTag(block, "corp_name");
    const stock_code = extractTag(block, "stock_code").trim();
    if (!corp_code || !corp_name || !/^\d{6}$/.test(stock_code)) continue;
    byStock[stock_code] = { corp_code, corp_name };
    const key = corp_name.replace(/\s+/g, "").toLowerCase();
    byName[key] = stock_code;
    const keyOrig = corp_name.replace(/\s+/g, "");
    if (keyOrig !== key) byName[keyOrig] = stock_code;
  }
  return { byStock, byName };
}

async function loadCorpMap(): Promise<CorpMap | null> {
  if (corpMapLoaded) return corpMapCache;
  corpMapLoaded = true;

  // 1) 빌드타임 생성된 정적 파일 시도 (production URL 우선)
  const prodUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : null;

  if (prodUrl) {
    try {
      const res = await fetch(`${prodUrl}/corp-map.json`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) {
        corpMapCache = (await res.json()) as CorpMap;
        return corpMapCache;
      }
    } catch { /* fall through */ }
  }

  // 2) XML이 이미 캐시돼 있으면 메모리에서 map 빌드 (재다운로드 없음)
  if (corpXmlCache) {
    corpMapCache = buildCorpMapFromXml(corpXmlCache);
    return corpMapCache;
  }

  return null;
}

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : "";
}

const CORP_FETCH_MS = 20_000;

/**
 * 자주 쓰는 종목 고유번호 고정 테이블 — XML 다운로드 없이 즉시 반환.
 * corp_code: DART 고유번호(8자리), stock_code: KRX 종목코드(6자리).
 */
const DART_CORP_BY_STOCK: Record<string, DartCorp> = {
  // ── 대형주 (DART naviCrpCik 검증 완료) ─────────────────────────────────────
  "005930": { corp_code: "00126380", corp_name: "삼성전자",         stock_code: "005930" },
  "000660": { corp_code: "00164779", corp_name: "SK하이닉스",       stock_code: "000660" },
  "035420": { corp_code: "00266961", corp_name: "NAVER",             stock_code: "035420" },
  "035720": { corp_code: "00258801", corp_name: "카카오",            stock_code: "035720" },
  "000270": { corp_code: "00106641", corp_name: "기아",              stock_code: "000270" },
  "005380": { corp_code: "00164742", corp_name: "현대자동차",        stock_code: "005380" },
  "051910": { corp_code: "00356361", corp_name: "LG화학",            stock_code: "051910" },
  "006400": { corp_code: "00126362", corp_name: "삼성SDI",           stock_code: "006400" },
  "207940": { corp_code: "00877059", corp_name: "삼성바이오로직스",  stock_code: "207940" },
  "373220": { corp_code: "01515323", corp_name: "LG에너지솔루션",   stock_code: "373220" },
  "066570": { corp_code: "00401731", corp_name: "LG전자",            stock_code: "066570" },
  "017670": { corp_code: "00159023", corp_name: "SK텔레콤",          stock_code: "017670" },
  "005490": { corp_code: "00155319", corp_name: "POSCO홀딩스",       stock_code: "005490" },
  "068270": { corp_code: "00413046", corp_name: "셀트리온",           stock_code: "068270" },
  "015760": { corp_code: "00159643", corp_name: "한국전력",           stock_code: "015760" },
  "030200": { corp_code: "00190321", corp_name: "KT",                stock_code: "030200" },
  "028260": { corp_code: "00149655", corp_name: "삼성물산",           stock_code: "028260" },
  "000810": { corp_code: "00139214", corp_name: "삼성화재",           stock_code: "000810" },
  "090430": { corp_code: "00642807", corp_name: "아모레퍼시픽",      stock_code: "090430" },
  "352820": { corp_code: "01450869", corp_name: "하이브",             stock_code: "352820" },
  "259960": { corp_code: "00760971", corp_name: "크래프톤",           stock_code: "259960" },
  "323410": { corp_code: "01427728", corp_name: "카카오뱅크",         stock_code: "323410" },
  "003550": { corp_code: "00107897", corp_name: "LG",                stock_code: "003550" },
  "034730": { corp_code: "00181712", corp_name: "SK",                stock_code: "034730" },
  "012330": { corp_code: "00164788", corp_name: "현대모비스",         stock_code: "012330" },
  "032830": { corp_code: "00118228", corp_name: "삼성생명",           stock_code: "032830" },
  "105560": { corp_code: "00688996", corp_name: "KB금융",             stock_code: "105560" },
  "086790": { corp_code: "00547583", corp_name: "하나금융지주",       stock_code: "086790" },
  "055550": { corp_code: "00416950", corp_name: "신한지주",           stock_code: "055550" },
  "316140": { corp_code: "01388796", corp_name: "우리금융지주",       stock_code: "316140" },
  "010950": { corp_code: "00164452", corp_name: "S-Oil",             stock_code: "010950" },
  "096770": { corp_code: "00631518", corp_name: "SK이노베이션",       stock_code: "096770" },
  "011200": { corp_code: "00164645", corp_name: "HMM",               stock_code: "011200" },
  "000100": { corp_code: "00145109", corp_name: "유한양행",           stock_code: "000100" },
  "247540": { corp_code: "01144636", corp_name: "에코프로비엠",       stock_code: "247540" },
  "086520": { corp_code: "00866545", corp_name: "에코프로",           stock_code: "086520" },
  "003670": { corp_code: "00108726", corp_name: "포스코퓨처엠",      stock_code: "003670" },
  // 게임
  "036570": { corp_code: "00211079", corp_name: "엔씨소프트",        stock_code: "036570" },
  "251270": { corp_code: "01228485", corp_name: "넷마블",             stock_code: "251270" },
  "263750": { corp_code: "01152470", corp_name: "펄어비스",           stock_code: "263750" },
  "112040": { corp_code: "00375525", corp_name: "위메이드",           stock_code: "112040" },
  "078340": { corp_code: "00476498", corp_name: "컴투스",             stock_code: "078340" },
  "293490": { corp_code: "01137383", corp_name: "카카오게임즈",      stock_code: "293490" },
  // 엔터·미디어
  "041510": { corp_code: "00194329", corp_name: "에스엠",             stock_code: "041510" },
  "035900": { corp_code: "00117473", corp_name: "JYP Ent.",           stock_code: "035900" },
  "122870": { corp_code: "00779857", corp_name: "와이지엔터테인먼트", stock_code: "122870" },
  // 반도체·IT
  "000990": { corp_code: "00121596", corp_name: "DB하이텍",           stock_code: "000990" },
  "042700": { corp_code: "00156028", corp_name: "한미반도체",         stock_code: "042700" },
  // 헬스케어
  "326030": { corp_code: "01462189", corp_name: "SK바이오팜",         stock_code: "326030" },
  "196170": { corp_code: "01117264", corp_name: "알테오젠",           stock_code: "196170" },
  // 기타
  "071050": { corp_code: "00587523", corp_name: "한국금융지주",       stock_code: "071050" },
  "180640": { corp_code: "01139218", corp_name: "한진칼",             stock_code: "180640" },
  "003490": { corp_code: "00107638", corp_name: "대한항공",           stock_code: "003490" },
  "020560": { corp_code: "00126720", corp_name: "아시아나항공",       stock_code: "020560" },
  "000720": { corp_code: "00105319", corp_name: "현대건설",           stock_code: "000720" },
  "028050": { corp_code: "00122472", corp_name: "삼성엔지니어링",     stock_code: "028050" },
};

/**
 * 검색어 → 종목코드 변환 테이블.
 * 한글 발음 표기·대소문자 변형·약칭·영문명 등을 모두 포함.
 * 키는 소문자 정규화 후 비교하므로 실제 대소문자는 무관.
 */
const DART_CORP_NAME_ALIAS: Record<string, string> = {
  // 삼성그룹
  "삼성전자": "005930", "samsung": "005930", "삼성": "005930",
  "삼성sdi": "006400", "삼성에스디아이": "006400",
  "삼성바이오로직스": "207940", "삼성바이오": "207940",
  "삼성물산": "028260", "삼성화재": "000810", "삼성생명": "032830",
  // SK그룹
  "sk하이닉스": "000660", "에스케이하이닉스": "000660", "하이닉스": "000660",
  "sk텔레콤": "017670", "에스케이텔레콤": "017670", "skt": "017670",
  "sk이노베이션": "096770", "에스케이이노베이션": "096770",
  "sk": "034730", "에스케이": "034730",
  // LG그룹
  "lg전자": "066570", "엘지전자": "066570",
  "lg화학": "051910", "엘지화학": "051910",
  "lg에너지솔루션": "373220", "엘지에너지솔루션": "373220", "lges": "373220",
  "lg": "003550", "엘지": "003550",
  // 현대그룹
  "현대자동차": "005380", "현대차": "005380", "hyundai": "005380",
  "기아": "000270", "kia": "000270",
  "현대모비스": "012330", "모비스": "012330",
  // 포스코
  "posco홀딩스": "005490", "포스코홀딩스": "005490", "포스코": "005490", "posco": "005490",
  "포스코퓨처엠": "003670",
  // 카카오·네이버
  "naver": "035420", "네이버": "035420",
  "카카오": "035720", "kakao": "035720",
  "카카오뱅크": "323410",
  // 금융
  "kb금융": "105560", "국민은행": "105560", "kb": "105560",
  "신한지주": "055550", "신한": "055550",
  "하나금융지주": "086790", "하나금융": "086790", "하나은행": "086790",
  "우리금융지주": "316140", "우리금융": "316140", "우리은행": "316140",
  // 통신
  "kt": "030200",
  // 에너지
  "한국전력": "015760", "한전": "015760", "kepco": "015760",
  "s-oil": "010950", "에스오일": "010950",
  // 바이오·제약
  "셀트리온": "068270", "celltrion": "068270",
  "유한양행": "000100",
  // 이차전지·소재
  "에코프로비엠": "247540", "에코프로": "086520",
  // 해운
  "hmm": "011200", "현대상선": "011200",
  // 뷰티·생활
  "아모레퍼시픽": "090430", "아모레": "090430",
  // 엔터·게임
  "하이브": "352820", "hybe": "352820", "빅히트": "352820",
  "크래프톤": "259960", "krafton": "259960",
  "엔씨소프트": "036570", "엔씨": "036570", "ncsoft": "036570", "nc소프트": "036570",
  "넷마블": "251270", "netmarble": "251270",
  "펄어비스": "263750", "pearl abyss": "263750",
  "위메이드": "112040", "wemade": "112040",
  "컴투스": "078340", "com2us": "078340",
  "카카오게임즈": "293490", "kakao games": "293490",
  // 엔터·미디어
  "에스엠": "041510", "sm엔터": "041510", "sm": "041510",
  "jyp": "035900", "jyp엔터": "035900",
  "와이지": "122870", "yjp": "122870", "yg엔터": "122870",
  // 항공
  "대한항공": "003490", "koreanair": "003490",
  "아시아나": "020560", "아시아나항공": "020560", "asiana": "020560",
  // 건설
  "현대건설": "000720",
  "삼성엔지니어링": "028050",
};

/** 쿼리를 정규화해 alias 테이블을 검색 */
function lookupAlias(q: string): string | null {
  const trimmed = q.trim().replace(/\s+/g, "");
  // 직접 키 조회 (한글·이미 소문자 ASCII 처리, toLowerCase 우회)
  if (DART_CORP_NAME_ALIAS[trimmed] !== undefined) return DART_CORP_NAME_ALIAS[trimmed];
  // 소문자 변환 후 재시도 (영문 대소문자 처리)
  const lower = trimmed.toLowerCase();
  if (DART_CORP_NAME_ALIAS[lower] !== undefined) return DART_CORP_NAME_ALIAS[lower];
  // 선형 탐색 fallback
  for (const [k, v] of Object.entries(DART_CORP_NAME_ALIAS)) {
    if (k.toLowerCase().replace(/\s+/g, "") === lower) return v;
  }
  return null;
}

export async function resolveDartCorp(
  query: string,
  crtfc_key: string,
): Promise<DartCorp | null> {
  const q = query.trim();
  if (!q) return null;

  // corp-map.json (빌드타임 생성, CDN 서빙) 우선 — 모든 상장사 커버
  const corpMap = await loadCorpMap();

  if (/^\d{1,6}$/.test(q)) {
    const code = q.padStart(6, "0");
    // 1a. 하드코딩 테이블 (즉시)
    if (DART_CORP_BY_STOCK[code]) return DART_CORP_BY_STOCK[code];
    // 1b. corp-map.json
    if (corpMap?.byStock[code]) {
      const e = corpMap.byStock[code];
      return { corp_code: e.corp_code, corp_name: e.corp_name, stock_code: code };
    }
    // 1c. DART XML (느림, 폴백)
    const xml = await loadCorpXml(crtfc_key);
    return findCorpInXml(code, xml);
  }

  // 2. 회사명 검색
  // 2a. alias 테이블 → 하드코딩 테이블 (즉시)
  const aliasCode = lookupAlias(q);
  if (aliasCode && DART_CORP_BY_STOCK[aliasCode]) return DART_CORP_BY_STOCK[aliasCode];

  // 2b. corp-map.json 이름 역인덱스 (정확 일치)
  if (corpMap) {
    const key = q.replace(/\s+/g, "").toLowerCase();
    const keyOrig = q.replace(/\s+/g, "");
    const sc = corpMap.byName[key] ?? corpMap.byName[keyOrig];
    if (sc && corpMap.byStock[sc]) {
      const e = corpMap.byStock[sc];
      return { corp_code: e.corp_code, corp_name: e.corp_name, stock_code: sc };
    }
    // 2c. corp-map.json 부분 일치 (포함 검색)
    for (const [nameKey, stockCode] of Object.entries(corpMap.byName)) {
      if (nameKey.includes(key) || key.includes(nameKey)) {
        const e = corpMap.byStock[stockCode];
        if (e) return { corp_code: e.corp_code, corp_name: e.corp_name, stock_code: stockCode };
      }
    }
  }

  // 2d. DART XML 전체 검색 (느림, 폴백)
  const xml = await loadCorpXml(crtfc_key);
  return findCorpInXml(q, xml);
}

export async function loadCorpXml(crtfc_key: string): Promise<string> {
  if (corpXmlCache && corpXmlCacheKey === crtfc_key) return corpXmlCache;
  const url = `${BASE}/corpCode.xml?crtfc_key=${encodeURIComponent(crtfc_key)}`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), CORP_FETCH_MS);
  let buf: Uint8Array;
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) throw new Error(`고유번호 파일 다운로드 실패 (HTTP ${res.status})`);
    buf = new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(
        `DART 기업 목록을 ${CORP_FETCH_MS / 1000}초 내에 가져오지 못했습니다. 자주 검색하는 기업은 사이드바 퀵픽을 이용하거나, 6자리 종목코드(예: 005930)로 검색해 보세요.`,
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
  let xml: string;
  try {
    const unzipped = unzipSync(buf);
    const name = Object.keys(unzipped).find((k) =>
      k.toUpperCase().endsWith("CORPCODE.XML"),
    );
    if (!name) throw new Error("ZIP 안에 CORPCODE.xml 없음");
    xml = strFromU8(unzipped[name]);
  } catch {
    const t = new TextDecoder("utf-8");
    xml = t.decode(buf);
    if (!xml.includes("<list>")) throw new Error("고유번호 XML 파싱 실패");
  }
  corpXmlCache = xml;
  corpXmlCacheKey = crtfc_key;
  return xml;
}

export function findCorpInXml(query: string, xml: string): DartCorp | null {
  const q = query.trim();
  if (!q) return null;
  const listRe = /<list[^>]*>([\s\S]*?)<\/list>/gi;

  if (/^\d{1,6}$/.test(q)) {
    const code = q.padStart(6, "0");
    let m: RegExpExecArray | null;
    while ((m = listRe.exec(xml)) !== null) {
      const block = m[1];
      const stock_code = extractTag(block, "stock_code").trim();
      if (stock_code !== code) continue;
      const corp_code = extractTag(block, "corp_code");
      const corp_name = extractTag(block, "corp_name");
      if (corp_code && corp_name && /^\d{6}$/.test(stock_code)) {
        return { corp_code, corp_name, stock_code };
      }
    }
    return null;
  }

  // 사명 검색 — 대소문자 무관, 공백 무관, 부분 일치
  const qLower = q.toLowerCase();
  const compact = q.replace(/\s+/g, "");
  const compactLower = compact.toLowerCase();
  const candidates: DartCorp[] = [];
  let m: RegExpExecArray | null;
  while ((m = listRe.exec(xml)) !== null) {
    const block = m[1];
    const corp_code = extractTag(block, "corp_code");
    const corp_name = extractTag(block, "corp_name");
    const stock_code = extractTag(block, "stock_code").trim();
    if (!corp_code || !corp_name || !/^\d{6}$/.test(stock_code)) continue;
    const nameLower = corp_name.toLowerCase();
    const nameCompact = corp_name.replace(/\s+/g, "").toLowerCase();
    if (
      corp_name === q ||
      nameLower === qLower ||
      corp_name.includes(q) ||
      nameLower.includes(qLower) ||
      nameCompact === compactLower
    ) {
      candidates.push({ corp_code, corp_name, stock_code });
    }
  }
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  const exact = candidates.find(
    (c) => c.corp_name === q || c.corp_name.toLowerCase() === qLower,
  );
  return exact ?? candidates[0];
}

async function dartGet(
  path: string,
  crtfc_key: string,
  params: Record<string, string>,
): Promise<DartApiEnvelope> {
  const u = new URL(`${BASE}/${path}`);
  u.searchParams.set("crtfc_key", crtfc_key);
  for (const [k, v] of Object.entries(params)) {
    u.searchParams.set(k, v);
  }
  const res = await fetch(u.toString());
  const json = (await res.json()) as DartApiEnvelope;
  return json;
}

const SJ_FOR_STUDY = new Set(["BS", "IS", "CIS", "CF"]);
const MAX_FNLTT_ROWS_STUDY = 200;

const RE_CORE_ACCOUNT =
  /매출|영업이익|법인세|당기순이익|총자산|총부채|자본총계|부채총계|유동자산|유동부채|비유동|영업활동|투자활동|재무활동|현금및현금성|이자비용|법인세비용|매출총이익|매출액/;
const RE_LABOR_ACCOUNT =
  /급여|퇴직|임원|보수|복리후생|사외이사|스톡|주식보상|상여|퇴직급여|연금|인건비|판매비와관리비|경상연구개발|판매비|관리비/;

const RE_CORE_IDS =
  /revenue|profit|equity|assets|liabilities|cashflow|financing|investing|operating|interest/i;

function accountStudyScore(r: FnlttRow): number {
  const nm = (r.account_nm || "").replace(/\s/g, "");
  const id = r.account_id || "";
  let s = 0;
  if (RE_CORE_ACCOUNT.test(nm) || RE_CORE_IDS.test(id)) s += 4;
  if (RE_LABOR_ACCOUNT.test(nm)) s += 3;
  return s;
}

function filterFnlttForStudy(rows: FnlttRow[]): FnlttRow[] {
  const only = rows.filter((r) =>
    SJ_FOR_STUDY.has(String(r.sj_div || "").trim()),
  );
  const base = only.length > 0 ? only : rows;
  if (base.length === 0) return [];
  const scored = base.map((r, i) => ({ r, i, s: accountStudyScore(r) }));
  scored.sort((a, b) => {
    if (b.s !== a.s) return b.s - a.s;
    return a.i - b.i;
  });
  const picked = scored.slice(0, MAX_FNLTT_ROWS_STUDY).map(({ r }) => r);
  sortFnlttRowsInPlace(picked);
  return picked;
}

export async function fetchFnlttSinglAcntAll(
  crtfc_key: string,
  corp_code: string,
  bsns_year: string,
  reprt_code: string,
  fs_div: "CFS" | "OFS",
): Promise<FnlttRow[]> {
  const r = await dartGet("fnlttSinglAcnt.json", crtfc_key, {
    corp_code,
    bsns_year,
    reprt_code,
    fs_div,
  });
  if (r.status === "013") return [];
  if (r.status !== "000") {
    throw new Error(`fnlttSinglAcnt(주요계정) ${fs_div}: ${r.message} (${r.status})`);
  }
  const list = r.list;
  if (!Array.isArray(list)) return [];
  const arr = list as FnlttRow[];
  return filterFnlttForStudy(arr);
}

function sortFnlttRowsInPlace(rows: FnlttRow[]): void {
  const order = (s: string | undefined) => {
    const sj = s ?? "";
    const idx = ["BS", "IS", "CIS", "CF", "SCE"].indexOf(sj);
    return idx >= 0 ? idx : 99;
  };
  rows.sort((a, b) => {
    const oa = order(a.sj_div);
    const ob = order(b.sj_div);
    if (oa !== ob) return oa - ob;
    const na = parseInt(String(a.ord ?? "0"), 10) || 0;
    const nb = parseInt(String(b.ord ?? "0"), 10) || 0;
    return na - nb;
  });
}

/**
 * DART 금액 문자열 → 한국어 단위 변환
 * - 대부분 백만원 단위로 옴
 * - 10^10 초과 시 원 단위로 판단하여 1/1,000,000 변환
 */
function formatAmountKorean(s: string | undefined): string {
  if (s == null || s === "") return "—";
  const str = String(s).trim();
  if (!str || str === "—") return "—";
  const cleaned = str.replace(/[,\s]/g, "");
  const raw = parseFloat(cleaned);
  if (isNaN(raw)) return str;
  if (raw === 0) return "0";

  const sign = raw < 0 ? "−" : "";
  let v = Math.abs(raw);

  // 원 단위 자동 감지: 10^9(=10억) 초과면 원→백만원 변환
  if (v > 1_000_000_000) {
    v = v / 1_000_000;
  }

  if (v >= 1_000_000) return `${sign}${(v / 1_000_000).toFixed(1)}조`;
  if (v >= 100)       return `${sign}${Math.round(v / 100).toLocaleString()}억`;
  if (v >= 1)         return `${sign}${Math.round(v).toLocaleString()}백만`;
  return str;
}

export function fnlttToMarkdown(
  rows: FnlttRow[],
  title: string,
  maxRows = 120,
): string {
  if (!rows.length) return "";
  const totalInTable = rows.length;
  sortFnlttRowsInPlace(rows);
  const slice = rows.slice(0, maxRows);
  const more =
    totalInTable > maxRows
      ? `\n\n_*총 ${totalInTable}개 계정 중 상위 ${maxRows}개만 표시. 전체는 DART 원문을 보세요.*_\n`
      : "";
  const lines = [
    `### ${title}`,
    "",
    "> 단위: 백만원 (조/억 단위로 표시, DART 공시 원문 기준)",
    "",
    "| 구분 | 계정과목 | 당기 | 전기 | 전전기 |",
    "| --- | --- | ---: | ---: | ---: |",
  ];
  for (const r of slice) {
    const sj = (r.sj_nm || r.sj_div || "").replace(/\|/g, "/");
    const nm = (r.account_nm || "").replace(/\|/g, "/");
    lines.push(
      `| ${sj} | ${nm} | ${formatAmountKorean(r.thstrm_amount)} | ${formatAmountKorean(r.frmtrm_amount)} | ${formatAmountKorean(r.bfefrmtrm_amount)} |`,
    );
  }
  return lines.join("\n") + more;
}

async function fetchOptionalList(
  path: string,
  crtfc_key: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>[]> {
  const r = await dartGet(path, crtfc_key, params);
  if (r.status !== "000") return [];
  const list = r.list;
  if (!Array.isArray(list)) return [];
  const arr = list as Record<string, unknown>[];
  return arr.length > 24 ? arr.slice(0, 24) : arr;
}

/** 임원 현황 (exctvSttus) → 깔끔한 마크다운 표 */
function exctvToMarkdown(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  // DART exctvSttus 주요 필드 순서
  const COLS: Array<{ key: string; label: string }> = [
    { key: "main_job_nm", label: "직명" },
    { key: "kor_nm",      label: "성명" },
    { key: "ofcps",       label: "직위" },
    { key: "act_sttus",   label: "상근구분" },
    { key: "sexdstn",     label: "성별" },
    { key: "tenure_end_dt", label: "임기만료" },
    { key: "tenure_end",  label: "임기만료" },
  ];

  // 실제 데이터에 있는 컬럼만 선택
  const firstRow = rows[0] as Record<string, unknown>;
  const usedCols = COLS.filter(
    (c) => firstRow[c.key] != null && String(firstRow[c.key]).trim() !== "",
  );
  // 없으면 아무 컬럼이나 8개까지
  const finalCols = usedCols.length >= 2
    ? usedCols
    : Object.keys(firstRow)
        .filter((k) => !["rcept_no", "reprt_code", "corp_code", "corp_name", "bsns_year"].includes(k))
        .slice(0, 8)
        .map((k) => ({ key: k, label: k }));

  const head = `| ${finalCols.map((c) => c.label).join(" | ")} |`;
  const sep  = `| ${finalCols.map(() => "---").join(" | ")} |`;
  const body = rows.slice(0, 20).map((row) => {
    const r = row as Record<string, unknown>;
    const cells = finalCols.map((c) => {
      const v = r[c.key];
      return v == null ? "" : String(v).replace(/\|/g, "/").slice(0, 60);
    });
    return `| ${cells.join(" | ")} |`;
  });
  return ["### 임원 현황 (사업보고서 기준)", "", head, sep, ...body, ""].join("\n");
}

/** 직원 현황 (empSttus) → 깔끔한 마크다운 표 */
function empToMarkdown(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const COLS: Array<{ key: string; label: string }> = [
    { key: "fo_bbm",                  label: "사업부문" },
    { key: "sexdstn",                 label: "성별" },
    { key: "empCntCo",               label: "직원수" },
    { key: "sfml_lbr_co_cnt",         label: "정규직" },
    { key: "tmp_lbr_co_cnt",          label: "계약직" },
    { key: "avg_bsns_term",           label: "평균근속(년)" },
    { key: "annlsal_ttlamnt",         label: "급여합계(백만원)" },
    { key: "of_avrg_annual_salary",   label: "1인평균급여(백만원)" },
  ];

  const firstRow = rows[0] as Record<string, unknown>;
  const usedCols = COLS.filter((c) => firstRow[c.key] != null);
  const finalCols = usedCols.length >= 2
    ? usedCols
    : Object.keys(firstRow)
        .filter((k) => !["rcept_no", "reprt_code", "corp_code", "corp_name", "bsns_year"].includes(k))
        .slice(0, 8)
        .map((k) => ({ key: k, label: k }));

  const head = `| ${finalCols.map((c) => c.label).join(" | ")} |`;
  const sep  = `| ${finalCols.map(() => "---").join(" | ")} |`;
  const body = rows.slice(0, 20).map((row) => {
    const r = row as Record<string, unknown>;
    const cells = finalCols.map((c) => {
      const v = r[c.key];
      if (v == null) return "";
      // 금액 필드 자동 포맷
      if (c.key === "annlsal_ttlamnt" || c.key === "of_avrg_annual_salary") {
        const n = parseFloat(String(v).replace(/[,\s]/g, ""));
        if (!isNaN(n)) return formatAmountKorean(String(v));
      }
      return String(v).replace(/\|/g, "/").slice(0, 60);
    });
    return `| ${cells.join(" | ")} |`;
  });
  return ["### 직원 현황 (사업보고서 기준)", "", head, sep, ...body, ""].join("\n");
}

export type DartBundle = {
  corp: DartCorp;
  bsns_year: string;
  reprt_code: string;
  reprt_label: string;
  cfs: FnlttRow[];
  ofs: FnlttRow[];
  exctv: Record<string, unknown>[];
  emp: Record<string, unknown>[];
};

/** DART 금액 문자열 → 숫자 (백만원 단위, 실패 시 null) */
function parseAmount(s: string | undefined): number | null {
  if (!s || s === "—" || s.trim() === "") return null;
  const cleaned = s.replace(/[,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

/** 계정명에서 차트 카테고리 추론 */
function inferCategory(nm: string): FinancialMetric["category"] {
  if (/매출|Revenue|revenue/i.test(nm)) return "income";
  if (/영업이익|당기순이익|법인세|이자비용/i.test(nm)) return "income";
  if (/현금흐름|현금및현금성/i.test(nm)) return "cashflow";
  if (/자산|부채|자본/i.test(nm)) return "balance";
  if (/급여|인건비|보수|직원|임원/i.test(nm)) return "hr";
  if (/이익률|비율|율/i.test(nm)) return "ratio";
  return "income";
}

/** fnltt 행 배열에서 특정 계정명을 찾아 수치 반환 */
function findAmount(rows: FnlttRow[], patterns: RegExp[]): number | null {
  for (const pat of patterns) {
    for (const r of rows) {
      const nm = (r.account_nm || "").replace(/\s/g, "");
      if (pat.test(nm)) {
        const v = parseAmount(r.thstrm_amount);
        if (v !== null) return v;
      }
    }
  }
  return null;
}

function findAmountTriple(
  rows: FnlttRow[],
  accountIds: string[],
  namePatterns: RegExp[],
): [number | null, number | null, number | null] {
  // 1차: IFRS 표준 account_id로 정확 매칭 (회사·계정명 무관)
  for (const id of accountIds) {
    for (const r of rows) {
      if ((r.account_id || "").trim() === id) {
        const v = parseAmount(r.thstrm_amount);
        if (v !== null) {
          return [v, parseAmount(r.frmtrm_amount), parseAmount(r.bfefrmtrm_amount)];
        }
      }
    }
  }
  // 2차: account_id 없거나 불일치 시 계정명 패턴으로 폴백
  for (const pat of namePatterns) {
    for (const r of rows) {
      const nm = (r.account_nm || "").replace(/\s/g, "");
      if (pat.test(nm)) {
        return [
          parseAmount(r.thstrm_amount),
          parseAmount(r.frmtrm_amount),
          parseAmount(r.bfefrmtrm_amount),
        ];
      }
    }
  }
  return [null, null, null];
}

/**
 * DartBundle → FinancialChartData
 * 차트·HR KPI 계산에 필요한 구조화 데이터를 추출합니다.
 */
export function bundleToChartData(b: DartBundle): FinancialChartData {
  const rows = b.cfs.length > 0 ? b.cfs : b.ofs;
  const year = b.bsns_year;
  const priorYear = String(parseInt(year) - 1);
  const priorPriorYear = String(parseInt(year) - 2);

  // --- 주요 손익 ---
  // accountIds: IFRS 표준 코드 (1차), namePatterns: 계정명 폴백 (2차)
  const KEY_METRICS: Array<{
    label: string;
    accountIds: string[];
    namePatterns: RegExp[];
    category: FinancialMetric["category"];
    unit: string;
  }> = [
    {
      label: "매출액",
      accountIds: [
        "ifrs-full_Revenue",
        "ifrs-full_RevenueFromContractsWithCustomers",
        "dart_Revenue",
        "ifrs-full_OperatingRevenue",
      ],
      namePatterns: [/^매출액$/, /^수익\(매출액\)$/, /^영업수익$/, /매출액/],
      category: "income",
      unit: "백만원",
    },
    {
      label: "매출총이익",
      accountIds: ["ifrs-full_GrossProfit"],
      namePatterns: [/^매출총이익$/],
      category: "income",
      unit: "백만원",
    },
    {
      label: "영업이익",
      accountIds: [
        "ifrs-full_ProfitLossFromOperatingActivities",
        "dart_OperatingIncomeLoss",
        "ifrs-full_OperatingProfit",
      ],
      namePatterns: [/^영업이익$/, /^영업이익\(손실\)$/, /^영업손익$/],
      category: "income",
      unit: "백만원",
    },
    {
      label: "당기순이익",
      accountIds: [
        "ifrs-full_ProfitLoss",
        "ifrs-full_ProfitLossAttributableToOwnersOfParent",
      ],
      namePatterns: [/^당기순이익$/, /^당기순이익\(손실\)$/, /^분기순이익$/],
      category: "income",
      unit: "백만원",
    },
    {
      label: "이자비용",
      accountIds: [
        "ifrs-full_FinanceCosts",
        "ifrs-full_InterestExpense",
        "dart_InterestExpense",
      ],
      namePatterns: [/^이자비용$/, /^금융비용$/, /이자비용/],
      category: "income",
      unit: "백만원",
    },
    {
      label: "영업활동현금흐름",
      accountIds: [
        "ifrs-full_CashFlowsFromUsedInOperatingActivities",
        "ifrs-full_CashFlowsFromOperatingActivities",
      ],
      namePatterns: [/^영업활동.*현금흐름$/, /영업활동으로인한현금흐름/],
      category: "cashflow",
      unit: "백만원",
    },
    {
      label: "투자활동현금흐름",
      accountIds: [
        "ifrs-full_CashFlowsFromUsedInInvestingActivities",
        "ifrs-full_CashFlowsFromInvestingActivities",
      ],
      namePatterns: [/^투자활동.*현금흐름$/, /투자활동으로인한현금흐름/],
      category: "cashflow",
      unit: "백만원",
    },
    {
      label: "재무활동현금흐름",
      accountIds: [
        "ifrs-full_CashFlowsFromUsedInFinancingActivities",
        "ifrs-full_CashFlowsFromFinancingActivities",
      ],
      namePatterns: [/^재무활동.*현금흐름$/, /재무활동으로인한현금흐름/],
      category: "cashflow",
      unit: "백만원",
    },
    {
      label: "총자산",
      accountIds: ["ifrs-full_Assets"],
      namePatterns: [/^자산총계$/, /^총자산$/],
      category: "balance",
      unit: "백만원",
    },
    {
      label: "총부채",
      accountIds: ["ifrs-full_Liabilities"],
      namePatterns: [/^부채총계$/, /^총부채$/],
      category: "balance",
      unit: "백만원",
    },
    {
      label: "자본총계",
      accountIds: [
        "ifrs-full_Equity",
        "ifrs-full_EquityAttributableToOwnersOfParent",
      ],
      namePatterns: [/^자본총계$/, /^자기자본$/],
      category: "balance",
      unit: "백만원",
    },
    {
      label: "단기차입금",
      accountIds: [
        "ifrs-full_ShorttermBorrowings",
        "ifrs-full_CurrentBorrowings",
      ],
      namePatterns: [/^단기차입금$/, /단기차입금/],
      category: "balance",
      unit: "백만원",
    },
    {
      label: "장기차입금",
      accountIds: [
        "ifrs-full_NoncurrentBorrowings",
        "ifrs-full_LongtermBorrowingsClassifiedAsNoncurrent",
      ],
      namePatterns: [/^장기차입금$/, /장기차입금/],
      category: "balance",
      unit: "백만원",
    },
  ];

  const metrics: FinancialMetric[] = KEY_METRICS.map((m) => {
    const [c, p, pp] = findAmountTriple(rows, m.accountIds, m.namePatterns);
    return {
      label: m.label,
      current: c,
      prior: p,
      priorPrior: pp,
      unit: m.unit,
      category: m.category,
    };
  });

  // --- HR 지표 ---
  const hrMetrics = extractHrMetrics(b, metrics);

  return {
    corp: b.corp.corp_name,
    currentYear: year,
    priorYear,
    priorPriorYear,
    metrics,
    hrMetrics,
    unitNote: "단위: 백만원 (DART 공시 기준, 원단위 확인 필요)",
  };
}

/**
 * DART 수치 자동 스케일: 원 단위가 섞일 경우 백만원으로 정규화
 * fnlttSinglAcnt는 보통 백만원, empSttus 급여는 백만원 또는 원
 */
function normalizeToMillion(v: number): number {
  // 10^9(= 10억 백만원 = 10경원)를 넘으면 원 단위 → 백만원
  return v > 1_000_000_000 ? v / 1_000_000 : v;
}

/** 직원·임원 현황에서 HR 지표 추출 (DART empSttus / exctvSttus 필드 기준) */
function extractHrMetrics(
  b: DartBundle,
  metrics: FinancialMetric[],
): HrMetrics {
  const hr: HrMetrics = {};

  // ── 직원 현황 (empSttus) ─────────────────────────────────────────────────
  if (b.emp.length > 0) {
    // 성별 합계 행 우선 (sexdstn === '합계' or '전체')
    const empRows = b.emp as Record<string, unknown>[];
    const totalRow = empRows.find(
      (r) => /합계|전체/i.test(String(r["sexdstn"] ?? "")),
    ) ?? empRows[0];

    // 직원수: empCntCo → sfml_lbr_co_cnt + tmp_lbr_co_cnt 합산
    const hc =
      pNum(totalRow["empCntCo"]) ??
      addNulls(pNum(totalRow["sfml_lbr_co_cnt"]), pNum(totalRow["tmp_lbr_co_cnt"]));
    if (hc !== null && hc > 0) hr.headcount = hc;

    // 직원수 — 성별별 행이 여러 개인 경우 합산
    if (!hr.headcount) {
      let sum = 0;
      for (const row of empRows) {
        const n = pNum(row["empCntCo"]);
        if (n !== null) sum += n;
      }
      if (sum > 0) hr.headcount = sum;
    }

    // 1인 평균 급여 (백만원) — of_avrg_annual_salary 우선
    const avgSalRaw =
      pNum(totalRow["of_avrg_annual_salary"]) ??
      pNum(totalRow["avrg_annual_salary"]);
    if (avgSalRaw !== null && avgSalRaw > 0) {
      hr.avgSalaryMillion = normalizeToMillion(avgSalRaw);
    }

    // 평균 급여가 없으면 급여합계 / 직원수로 계산
    if (!hr.avgSalaryMillion && hr.headcount && hr.headcount > 0) {
      const ttl = pNum(totalRow["annlsal_ttlamnt"]);
      if (ttl !== null && ttl > 0) {
        hr.avgSalaryMillion = normalizeToMillion(ttl) / hr.headcount;
      }
    }
  }

  // ── 임원 현황 (exctvSttus) — 보수 정보 없음, 등기임원 수만 ──────────────
  if (b.exctv.length > 0) {
    const exctvRows = b.exctv as Record<string, unknown>[];
    // 등기임원 수 (비상근 사외이사 포함)
    hr.execCount = exctvRows.length;
    // 등기임원만 카운트 (rglytn_at === 'Y')
    const registered = exctvRows.filter(
      (r) => String(r["rglytn_at"] ?? "").toUpperCase() === "Y",
    );
    if (registered.length > 0) hr.execCount = registered.length;
  }

  // ── fnlttSinglAcnt에서 임원보수 집계 찾기 ─────────────────────────────────
  const allRows = [...b.cfs, ...b.ofs];
  const execPayRaw = findAmountByAccount(allRows, [
    /^임원보수$/, /^임원급여$/, /^임원에대한급여$/, /임원보수/,
  ]);
  if (execPayRaw !== null && hr.execCount && hr.execCount > 0) {
    // fnltt는 백만원 단위이므로 normalizeToMillion 불필요 (이미 백만원)
    hr.execTotalPayMillion = execPayRaw;
    hr.execMaxPayMillion = execPayRaw / hr.execCount; // 1인 평균 (최대값 근사)
  }

  // ── 파생 지표 계산 ─────────────────────────────────────────────────────────
  const revMetric = metrics.find((m) => m.label === "매출액");
  const opMetric  = metrics.find((m) => m.label === "영업이익");
  const rev = revMetric?.current ?? null;
  const op  = opMetric?.current ?? null;

  if (hr.headcount && hr.headcount > 0) {
    if (rev !== null && rev > 0) hr.revenuePerEmployee    = Math.round(rev / hr.headcount);
    if (op  !== null)             hr.opIncomePerEmployee  = Math.round(op  / hr.headcount);
  }

  if (hr.avgSalaryMillion && hr.avgSalaryMillion > 0 && hr.headcount) {
    const laborCost = hr.avgSalaryMillion * hr.headcount;
    if (rev !== null && rev > 0) {
      hr.laborToRevenueRatio = Math.round((laborCost / rev) * 1000) / 10;
    }
  }

  // Pay Ratio: 임원 평균보수 / 직원 평균급여
  if (hr.execMaxPayMillion && hr.avgSalaryMillion && hr.avgSalaryMillion > 0) {
    hr.payRatio = Math.round((hr.execMaxPayMillion / hr.avgSalaryMillion) * 10) / 10;
  }

  return hr;
}

/** pNum: unknown → number | null */
function pNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(/[,\s]/g, ""));
  return isNaN(n) ? null : n;
}

/** null-safe 덧셈 */
function addNulls(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  return (a ?? 0) + (b ?? 0);
}

/** fnltt 행에서 계정명 패턴으로 당기 금액 찾기 */
function findAmountByAccount(rows: FnlttRow[], patterns: RegExp[]): number | null {
  for (const pat of patterns) {
    for (const r of rows) {
      const nm = (r.account_nm || "").replace(/\s/g, "");
      if (pat.test(nm)) {
        const v = parseAmount(r.thstrm_amount);
        if (v !== null) return v;
      }
    }
  }
  return null;
}


export async function fetchDartFinancialBundle(
  crtfc_key: string,
  corp: DartCorp,
): Promise<DartBundle> {
  const reprt_code = "11011"; // 사업보고서
  const reprt_label = "사업보고서";

  // 최근 3년치만 시도 (y-1, y-2, y-3)
  const y = new Date().getFullYear();
  const yearsToTry = [y - 1, y - 2, y - 3].map(String);

  let lastErr: Error | null = null;
  for (const bsns_year of yearsToTry) {
    // 캐시 확인
    const cacheKey = getBundleCacheKey(corp.corp_code, bsns_year);
    const cached = getCachedBundle(cacheKey);
    if (cached) return cached;

    try {
      // CFS + OFS 병렬 호출
      const [cfsResult, ofsResult] = await Promise.allSettled([
        fetchFnlttSinglAcntAll(crtfc_key, corp.corp_code, bsns_year, reprt_code, "CFS"),
        fetchFnlttSinglAcntAll(crtfc_key, corp.corp_code, bsns_year, reprt_code, "OFS"),
      ]);

      const cfs = cfsResult.status === "fulfilled" ? cfsResult.value : [];
      const ofs = ofsResult.status === "fulfilled" ? ofsResult.value : [];

      if (cfs.length > 0 || ofs.length > 0) {
        // 임원·직원 현황도 병렬 호출
        const [exctvResult, empResult] = await Promise.allSettled([
          fetchOptionalList("exctvSttus.json", crtfc_key, {
            corp_code: corp.corp_code,
            bsns_year,
            reprt_code,
          }),
          fetchOptionalList("empSttus.json", crtfc_key, {
            corp_code: corp.corp_code,
            bsns_year,
            reprt_code,
          }),
        ]);

        const bundle: DartBundle = {
          corp,
          bsns_year,
          reprt_code,
          reprt_label,
          cfs,
          ofs,
          exctv: exctvResult.status === "fulfilled" ? exctvResult.value : [],
          emp: empResult.status === "fulfilled" ? empResult.value : [],
        };

        // 캐시 저장
        setCachedBundle(cacheKey, bundle);
        return bundle;
      }
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr ?? new Error("해당 기업의 재무제표를 찾지 못했습니다.");
}

export function bundleToMarkdown(b: DartBundle): string {
  const parts: string[] = [
    `## 오픈다트에서 불러온 공시 수치`,
    "",
    `- **기업**: ${b.corp.corp_name} (종목코드 ${b.corp.stock_code}, 고유번호 ${b.corp.corp_code})`,
    `- **기준**: ${b.bsns_year}년 ${b.reprt_label} (연결=CFS / 별도=OFS)`,
    `- **출처**: 금융감독원 오픈다트 단일회사 주요계정(fnlttSinglAcnt), 임원·직원 현황`,
    `- **선별**: 재무상태표·손익·현금흐름(BS/IS/CIS/CF) 계정만, 핵심·인건비 관련 우선. 3년치 표시.`,
    "",
    `> 교육용 요약입니다. 전체 계정·원문은 DART에서 확인하세요.`,
    "",
  ];

  if (b.cfs.length) {
    parts.push(
      fnlttToMarkdown(b.cfs, "연결 — 재무상태·손익·현금흐름 (학습용 선별)", 130),
      "",
    );
  }
  if (b.ofs.length) {
    parts.push(
      fnlttToMarkdown(b.ofs, "별도 — 재무상태·손익·현금흐름 (학습용 선별)", 130),
      "",
    );
  }
  if (b.exctv.length) {
    parts.push(exctvToMarkdown(b.exctv));
  }
  if (b.emp.length) {
    parts.push(empToMarkdown(b.emp));
  }

  return parts.join("\n");
}

export function bundleToPromptSnippet(b: DartBundle, maxChars = 7000): string {
  const full = bundleToMarkdown(b);
  if (full.length <= maxChars) return full;
  return `${full.slice(0, maxChars)}\n\n…(이하 생략)…`;
}
