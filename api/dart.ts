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

  // 원 단위 자동 감지: 10^10(= 100억 백만원=100조) 초과면 원→백만원 변환
  if (v > 10_000_000_000) {
    v = v / 1_000_000;
  }

  if (v >= 1_000_000) return `${sign}${(v / 1_000_000).toFixed(1)}조`;
  if (v >= 10_000)    return `${sign}${Math.round(v / 10_000).toLocaleString()}억`;
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
      label: "이자비용",
      patterns: [/^이자비용$/, /^금융비용$/, /이자비용/],
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
      label: "투자활동현금흐름",
      patterns: [/^투자활동.*현금흐름$/, /투자활동으로인한현금흐름/],
      category: "cashflow",
      unit: "백만원",
    },
    {
      label: "재무활동현금흐름",
      patterns: [/^재무활동.*현금흐름$/, /재무활동으로인한현금흐름/],
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
    {
      label: "단기차입금",
      patterns: [/^단기차입금$/, /단기차입금/],
      category: "balance",
      unit: "백만원",
    },
    {
      label: "장기차입금",
      patterns: [/^장기차입금$/, /장기차입금/],
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
