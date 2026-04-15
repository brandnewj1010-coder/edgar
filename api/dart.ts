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

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : "";
}

const CORP_FETCH_MS = 45_000;

/**
 * 자주 쓰는 종목은 고유번호를 고정해 두고 XML 다운로드를 건너뜀.
 */
const DART_CORP_BY_STOCK: Record<string, DartCorp> = {
  "005930": { corp_code: "00126380", corp_name: "삼성전자", stock_code: "005930" },
  "000660": { corp_code: "00164779", corp_name: "SK하이닉스", stock_code: "000660" },
  "035720": { corp_code: "00104856", corp_name: "카카오", stock_code: "035720" },
  "035420": { corp_code: "00104204", corp_name: "NAVER", stock_code: "035420" },
  "000270": { corp_code: "00164742", corp_name: "기아", stock_code: "000270" },
  "005380": { corp_code: "00164742", corp_name: "현대자동차", stock_code: "005380" },
  "051910": { corp_code: "00548395", corp_name: "LG화학", stock_code: "051910" },
  "006400": { corp_code: "00126261", corp_name: "삼성SDI", stock_code: "006400" },
  "207940": { corp_code: "01166928", corp_name: "삼성바이오로직스", stock_code: "207940" },
  "373220": { corp_code: "01890562", corp_name: "LG에너지솔루션", stock_code: "373220" },
};

const DART_CORP_NAME_ALIAS: Record<string, string> = {
  삼성전자: "005930",
  SK하이닉스: "000660",
  카카오: "035720",
  NAVER: "035420",
  네이버: "035420",
  기아: "000270",
  현대자동차: "005380",
  현대차: "005380",
  LG화학: "051910",
  삼성SDI: "006400",
  삼성바이오로직스: "207940",
  LG에너지솔루션: "373220",
};

export async function resolveDartCorp(
  query: string,
  crtfc_key: string,
): Promise<DartCorp | null> {
  const q = query.trim();
  if (!q) return null;
  if (/^\d{1,6}$/.test(q)) {
    const code = q.padStart(6, "0");
    const direct = DART_CORP_BY_STOCK[code];
    if (direct) return direct;
  }
  const alias = DART_CORP_NAME_ALIAS[q];
  if (alias) {
    const fromAlias = DART_CORP_BY_STOCK[alias];
    if (fromAlias) return fromAlias;
  }
  const xml = await loadCorpXml(crtfc_key);
  return findCorpInXml(q, xml);
}

export async function loadCorpXml(crtfc_key: string): Promise<string> {
  if (corpXmlCache && corpXmlCacheKey === crtfc_key) return corpXmlCache;
  const url = `${BASE}/corpCode.xml?crtfc_key=${encodeURIComponent(crtfc_key)}`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), CORP_FETCH_MS);
  let res: Response;
  try {
    res = await fetch(url, { signal: ac.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(
        `고유번호 목록 다운로드 시간 초과(${CORP_FETCH_MS / 1000}s). 네트워크·Vercel 함수 한도를 확인하세요.`,
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`고유번호 파일 다운로드 실패 (HTTP ${res.status})`);
  const buf = new Uint8Array(await res.arrayBuffer());
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

  const compact = q.replace(/\s+/g, "");
  const candidates: DartCorp[] = [];
  let m: RegExpExecArray | null;
  while ((m = listRe.exec(xml)) !== null) {
    const block = m[1];
    const corp_code = extractTag(block, "corp_code");
    const corp_name = extractTag(block, "corp_name");
    const stock_code = extractTag(block, "stock_code").trim();
    if (!corp_code || !corp_name || !/^\d{6}$/.test(stock_code)) continue;
    if (
      corp_name === q ||
      corp_name.includes(q) ||
      corp_name.replace(/\s+/g, "") === compact
    ) {
      candidates.push({ corp_code, corp_name, stock_code });
    }
  }
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  const exact = candidates.find((c) => c.corp_name === q);
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

function accountStudyScore(r: FnlttRow): number {
  const nm = (r.account_nm || "").replace(/\s/g, "");
  let s = 0;
  if (RE_CORE_ACCOUNT.test(nm)) s += 4;
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

function formatAmount(s: string | undefined): string {
  if (s == null || s === "") return "—";
  return String(s).trim();
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
      ? `\n\n_*총 ${totalInTable}개 계정 중 상위 ${maxRows}개만 표시했습니다. 전체는 DART 원문을 보세요.*_\n`
      : "";
  const lines = [
    `### ${title}`,
    "",
    "| 재무제표 | 계정과목 | 당기 | 전기 | 전전기 |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const r of slice) {
    const sj = (r.sj_nm || r.sj_div || "").replace(/\|/g, "/");
    const nm = (r.account_nm || "").replace(/\|/g, "/");
    lines.push(
      `| ${sj} | ${nm} | ${formatAmount(r.thstrm_amount)} | ${formatAmount(r.frmtrm_amount)} | ${formatAmount(r.bfefrmtrm_amount)} |`,
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

const EMP_EXCTV_COL =
  /emp|직원|급여|보수|평균|임원|퇴직|연금|사외|스톡|주식|복리|수당|인원|명|연봉|총액|남|여|계|구분|사업|기간|성명|직위|담당|소속|rcept_no|reprt_code|bsns_year/i;

function pickStudyColumns(row: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (EMP_EXCTV_COL.test(k)) picked[k] = v;
  }
  const keys = Object.keys(picked);
  if (keys.length >= 4) return picked;
  const fallback = Object.entries(row).slice(0, 14);
  return Object.fromEntries(fallback);
}

function recordsToMarkdown(title: string, rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const narrowed = rows.map((row) => pickStudyColumns(row));
  const keys = Object.keys(narrowed[0] ?? {}).filter((k) => !k.startsWith("_"));
  if (keys.length === 0) return "";
  const head = `| ${keys.join(" | ")} |`;
  const sep = `| ${keys.map(() => "---").join(" | ")} |`;
  const body = narrowed.slice(0, 20).map((row) => {
    const cells = keys.map((k) => {
      const v = row[k];
      const s =
        v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
      return s.replace(/\|/g, "/").slice(0, 200);
    });
    return `| ${cells.join(" | ")} |`;
  });
  return [`### ${title}`, "", head, sep, ...body, ""].join("\n");
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
  patterns: RegExp[],
): [number | null, number | null, number | null] {
  for (const pat of patterns) {
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
  const KEY_METRICS: Array<{
    label: string;
    patterns: RegExp[];
    category: FinancialMetric["category"];
    unit: string;
  }> = [
    {
      label: "매출액",
      patterns: [/^매출액$/, /^수익\(매출액\)$/, /^영업수익$/, /매출액/],
      category: "income",
      unit: "백만원",
    },
    {
      label: "매출총이익",
      patterns: [/^매출총이익$/, /매출총이익/],
      category: "income",
      unit: "백만원",
    },
    {
      label: "영업이익",
      patterns: [/^영업이익$/, /^영업이익\(손실\)$/, /^영업손익$/],
      category: "income",
      unit: "백만원",
    },
    {
      label: "당기순이익",
      patterns: [/^당기순이익$/, /^당기순이익\(손실\)$/, /^분기순이익$/],
      category: "income",
      unit: "백만원",
    },
    {
      label: "영업활동현금흐름",
      patterns: [/^영업활동.*현금흐름$/, /영업활동으로인한현금흐름/],
      category: "cashflow",
      unit: "백만원",
    },
    {
      label: "총자산",
      patterns: [/^자산총계$/, /^총자산$/],
      category: "balance",
      unit: "백만원",
    },
    {
      label: "총부채",
      patterns: [/^부채총계$/, /^총부채$/],
      category: "balance",
      unit: "백만원",
    },
    {
      label: "자본총계",
      patterns: [/^자본총계$/, /^자기자본$/],
      category: "balance",
      unit: "백만원",
    },
  ];

  const metrics: FinancialMetric[] = KEY_METRICS.map((m) => {
    const [c, p, pp] = findAmountTriple(rows, m.patterns);
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

/** 직원·임원 현황에서 HR 지표 추출 */
function extractHrMetrics(
  b: DartBundle,
  metrics: FinancialMetric[],
): HrMetrics {
  const hr: HrMetrics = {};

  // 직원 현황에서 직원수·평균급여
  if (b.emp.length > 0) {
    const empRow = b.emp[0] as Record<string, unknown>;
    // 전체 직원수: 남+여 합계 또는 총인원 필드
    const totalField = findNumericField(empRow, [
      "남", "여", "합계", "total", "인원수", "직원수",
    ]);
    if (totalField !== null) hr.headcount = totalField;

    // 평균 급여
    const salField = findNumericField(empRow, [
      "평균급여액", "1인평균급여액", "평균연봉", "급여총액",
    ]);
    if (salField !== null) {
      // DART 단위는 백만원이나 천원일 수 있음 — 값이 매우 크면 천원으로 간주
      hr.avgSalaryMillion = salField > 100_000 ? salField / 1_000_000 : salField;
    }

    // 직원 전체 합산 시도 (여러 행 = 사업 부문별)
    let totalHC = 0;
    for (const row of b.emp) {
      const r = row as Record<string, unknown>;
      const m = parseNumericField(r, ["합계", "인원수", "남여합계"]);
      if (m !== null) totalHC += m;
    }
    if (totalHC > 0 && !hr.headcount) hr.headcount = totalHC;
  }

  // 임원 현황에서 임원수·최대보수
  if (b.exctv.length > 0) {
    hr.execCount = b.exctv.length;
    let maxPay = 0;
    let totalPay = 0;
    for (const row of b.exctv) {
      const r = row as Record<string, unknown>;
      const pay = parseNumericField(r, ["보수총액", "급여", "상여", "보수", "총보수"]);
      if (pay !== null) {
        if (pay > maxPay) maxPay = pay;
        totalPay += pay;
      }
    }
    if (maxPay > 0) hr.execMaxPayMillion = maxPay > 10_000 ? maxPay / 1_000_000 : maxPay;
    if (totalPay > 0) hr.execTotalPayMillion = totalPay > 10_000 ? totalPay / 1_000_000 : totalPay;
  }

  // 파생 지표
  const revMetric = metrics.find((m) => m.label === "매출액");
  const opMetric = metrics.find((m) => m.label === "영업이익");
  const rev = revMetric?.current ?? null;
  const op = opMetric?.current ?? null;

  if (hr.headcount && hr.headcount > 0) {
    if (rev !== null) hr.revenuePerEmployee = Math.round(rev / hr.headcount);
    if (op !== null) hr.opIncomePerEmployee = Math.round(op / hr.headcount);
  }

  if (hr.avgSalaryMillion && hr.headcount && rev !== null) {
    const laborCost = hr.avgSalaryMillion * hr.headcount;
    if (rev > 0) hr.laborToRevenueRatio = Math.round((laborCost / rev) * 100 * 10) / 10;
  }

  if (hr.execMaxPayMillion && hr.avgSalaryMillion && hr.avgSalaryMillion > 0) {
    hr.payRatio = Math.round(hr.execMaxPayMillion / hr.avgSalaryMillion);
  }

  return hr;
}

function findNumericField(
  row: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const k of keys) {
    for (const [rk, rv] of Object.entries(row)) {
      if (rk.includes(k)) {
        const n = parseNumericValue(rv);
        if (n !== null) return n;
      }
    }
  }
  return null;
}

function parseNumericField(
  row: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const k of keys) {
    for (const [rk, rv] of Object.entries(row)) {
      if (rk === k || rk.includes(k)) {
        const n = parseNumericValue(rv);
        if (n !== null) return n;
      }
    }
  }
  return null;
}

function parseNumericValue(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).replace(/[,\s]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
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
    parts.push(recordsToMarkdown("임원 현황·보수 등 공시 (사업보고서)", b.exctv));
  }
  if (b.emp.length) {
    parts.push(recordsToMarkdown("직원 현황·급여 등 공시 (사업보고서)", b.emp));
  }

  return parts.join("\n");
}

export function bundleToPromptSnippet(b: DartBundle, maxChars = 7000): string {
  const full = bundleToMarkdown(b);
  if (full.length <= maxChars) return full;
  return `${full.slice(0, maxChars)}\n\n…(이하 생략)…`;
}
