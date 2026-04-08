/**
 * 금융감독원 전자공시 오픈다트 Open API
 * https://opendart.fss.or.kr/
 * 인증키 발급: 홈페이지 회원가입 → 인증키 신청 (무료)
 */
import { strFromU8, unzipSync } from "fflate";

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

/** 전체 상장사를 객체 배열로 만들면 Vercel 메모리 한도(OOM)로 FUNCTION_INVOCATION_FAILED 가 납니다. XML 문자열만 캐시합니다. */
let corpXmlCache: string | null = null;
let corpXmlCacheKey = "";

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : "";
}

const CORP_FETCH_MS = 45_000;

/**
 * corpCode.xml 전체는 수십 MB로 Vercel OOM을 유발할 수 있음.
 * 자주 쓰는 종목은 고유번호를 고정해 두고 XML 다운로드를 건너뜀 (오픈다트 공시 기준).
 * 출처: opendart 고유번호 체계와 동일한 8자리.
 */
const DART_CORP_BY_STOCK: Record<string, DartCorp> = {
  "005930": {
    corp_code: "00126380",
    corp_name: "삼성전자",
    stock_code: "005930",
  },
  "000660": {
    corp_code: "00164779",
    corp_name: "SK하이닉스",
    stock_code: "000660",
  },
};

/** 정확히 일치할 때만 XML 생략 (기업명 → 종목코드) */
const DART_CORP_NAME_ALIAS: Record<string, string> = {
  삼성전자: "005930",
  SK하이닉스: "000660",
};

/**
 * 기업 해석: 먼저 소량 정적 매핑 → 실패 시에만 corpCode.xml.
 * 005930/삼성전자 등은 대용량 XML 없이 동작해 FUNCTION_INVOCATION_FAILED 를 줄입니다.
 */
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

/** 고유번호 CORPCODE.xml 내용(한 번만 내려받아 재사용) */
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

/** 배열을 만들지 않고 `<list>` 블록만 순회해 기업 1건을 찾습니다. */
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

/** API는 전 계정을 주므로, 서버에서 학습용으로만 골라 씁니다. */
const SJ_FOR_STUDY = new Set(["BS", "IS", "CIS", "CF"]);
/** 자본변동표(SCE) 등은 제외 — 재무상태·손익·현금흐름 중심 */
const MAX_FNLTT_ROWS_STUDY = 200;

/** 요약 손익·재무·현금흐름에 자주 쓰는 계정 */
const RE_CORE_ACCOUNT =
  /매출|영업이익|법인세|당기순이익|총자산|총부채|자본총계|부채총계|유동자산|유동부채|비유동|영업활동|투자활동|재무활동|현금및현금성|이자비용|법인세비용|매출총이익|매출액/;
/** 인건비·보수·판관비 등 직원·임원 비용 관련 */
const RE_LABOR_ACCOUNT =
  /급여|퇴직|임원|보수|복리후생|사외이사|스톡|주식보상|상여|퇴직급여|연금|인건비|판매비와관리비|경상연구개발|판매비|관리비/;

function accountStudyScore(r: FnlttRow): number {
  const nm = (r.account_nm || "").replace(/\s/g, "");
  let s = 0;
  if (RE_CORE_ACCOUNT.test(nm)) s += 4;
  if (RE_LABOR_ACCOUNT.test(nm)) s += 3;
  return s;
}

/**
 * 재무상태표·손익·현금흐름만 남기고, 핵심·인건비/보수 계정을 우선해 상한까지 선택합니다.
 */
function filterFnlttForStudy(rows: FnlttRow[]): FnlttRow[] {
  const only = rows.filter((r) =>
    SJ_FOR_STUDY.has(String(r.sj_div || "").trim()),
  );
  /** 주요계정 API는 간혹 sj_div 표기가 비어 있을 수 있음 → 전체를 대상으로 점수만 매김 */
  const base = only.length > 0 ? only : rows;
  if (base.length === 0) return [];
  const scored = base.map((r, i) => ({ r, i, s: accountStudyScore(r) }));
  scored.sort((a, b) => {
    if (b.s !== a.s) return b.s - a.s;
    return a.i - b.i;
  });
  const picked = scored
    .slice(0, MAX_FNLTT_ROWS_STUDY)
    .map(({ r }) => r);
  sortFnlttRowsInPlace(picked);
  return picked;
}

/**
 * `fnlttSinglAcntAll` 은 삼성급 기업에서 JSON이 수십 MB → `res.json()` 만으로 Vercel OOM·FUNCTION_INVOCATION_FAILED.
 * **단일회사 주요계정** API만 사용 (재무상태·손익·현금흐름 핵심 계정, 건수 작음).
 * @see https://opendart.fss.or.kr/ → 재무정보 → 단일회사 주요계정
 */
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

/** 임원·직원 공시 JSON에서 보수·인력 관련 열만 우선 표시 */
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

export async function fetchDartFinancialBundle(
  crtfc_key: string,
  corp: DartCorp,
): Promise<DartBundle> {
  const reprt_code = "11011";
  const reprt_label = "사업보고서";
  const yearsToTry: string[] = [];
  const y = new Date().getFullYear();
  for (let i = 1; i <= 4; i++) {
    yearsToTry.push(String(y - i));
  }

  let lastErr: Error | null = null;
  for (const bsns_year of yearsToTry) {
    try {
      const cfs = await fetchFnlttSinglAcntAll(
        crtfc_key,
        corp.corp_code,
        bsns_year,
        reprt_code,
        "CFS",
      );
      const ofs = await fetchFnlttSinglAcntAll(
        crtfc_key,
        corp.corp_code,
        bsns_year,
        reprt_code,
        "OFS",
      );
      if (cfs.length > 0 || ofs.length > 0) {
        const exctv = await fetchOptionalList("exctvSttus.json", crtfc_key, {
          corp_code: corp.corp_code,
          bsns_year,
          reprt_code,
        });
        const emp = await fetchOptionalList("empSttus.json", crtfc_key, {
          corp_code: corp.corp_code,
          bsns_year,
          reprt_code,
        });
        return {
          corp,
          bsns_year,
          reprt_code,
          reprt_label,
          cfs,
          ofs,
          exctv,
          emp,
        };
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
    `- **출처**: 금융감독원 오픈다트 **단일회사 주요계정**(fnlttSinglAcnt), 임원·직원 현황`,
    `- **선별**: 재무상태표·손익·현금흐름(BS/IS/CIS/CF) 계정만 사용하고, 핵심 지표·인건비·보수 관련 계정을 우선합니다. 자본변동표 등은 생략합니다.`,
    "",
    `> 교육용 요약입니다. 전체 계정·원문은 DART에서 확인하세요.`,
    "",
  ];

  if (b.cfs.length) {
    parts.push(
      fnlttToMarkdown(
        b.cfs,
        "연결 — 재무상태·손익·현금흐름 (학습용 선별)",
        130,
      ),
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

/** LLM에 넣을 때 토큰 절약용 요약본 */
export function bundleToPromptSnippet(b: DartBundle, maxChars = 7000): string {
  const full = bundleToMarkdown(b);
  if (full.length <= maxChars) return full;
  return `${full.slice(0, maxChars)}\n\n…(이하 생략)…`;
}
