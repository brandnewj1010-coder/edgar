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

let corpListCache: DartCorp[] | null = null;
let corpListCacheKey = "";

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : "";
}

function parseCorpXml(xml: string): DartCorp[] {
  const rows: DartCorp[] = [];
  const re = /<list[^>]*>([\s\S]*?)<\/list>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    const corp_code = extractTag(block, "corp_code");
    const corp_name = extractTag(block, "corp_name");
    const stock_code = extractTag(block, "stock_code").trim();
    if (!corp_code || !corp_name) continue;
    if (!/^\d{6}$/.test(stock_code)) continue;
    rows.push({ corp_code, corp_name, stock_code });
  }
  return rows;
}

const CORP_FETCH_MS = 45_000;

export async function loadCorpList(crtfc_key: string): Promise<DartCorp[]> {
  if (corpListCache && corpListCacheKey === crtfc_key) return corpListCache;
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
  const corps = parseCorpXml(xml);
  corpListCache = corps;
  corpListCacheKey = crtfc_key;
  return corps;
}

export function findCorp(query: string, corps: DartCorp[]): DartCorp | null {
  const q = query.trim();
  if (!q) return null;
  if (/^\d{1,6}$/.test(q)) {
    const code = q.padStart(6, "0");
    const hit = corps.find((c) => c.stock_code === code);
    if (hit) return hit;
  }
  const compact = q.replace(/\s+/g, "");
  const nameHits = corps.filter(
    (c) =>
      c.corp_name === q ||
      c.corp_name.includes(q) ||
      c.corp_name.replace(/\s+/g, "") === compact,
  );
  if (nameHits.length === 1) return nameHits[0];
  if (nameHits.length > 1) {
    const exact = nameHits.find((c) => c.corp_name === q);
    return exact ?? nameHits[0];
  }
  return null;
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

export async function fetchFnlttSinglAcntAll(
  crtfc_key: string,
  corp_code: string,
  bsns_year: string,
  reprt_code: string,
  fs_div: "CFS" | "OFS",
): Promise<FnlttRow[]> {
  const r = await dartGet("fnlttSinglAcntAll.json", crtfc_key, {
    corp_code,
    bsns_year,
    reprt_code,
    fs_div,
  });
  if (r.status === "013") return [];
  if (r.status !== "000") {
    throw new Error(`fnlttSinglAcntAll ${fs_div}: ${r.message} (${r.status})`);
  }
  const list = r.list;
  if (!Array.isArray(list)) return [];
  return list as FnlttRow[];
}

function sortFnlttRows(rows: FnlttRow[]): FnlttRow[] {
  const order = (s: string | undefined) => {
    const sj = s ?? "";
    const idx = ["BS", "IS", "CIS", "CF", "SCE"].indexOf(sj);
    return idx >= 0 ? idx : 99;
  };
  return [...rows].sort((a, b) => {
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
  maxRows = 220,
): string {
  if (!rows.length) return "";
  const sorted = sortFnlttRows(rows);
  const slice = sorted.slice(0, maxRows);
  const more =
    sorted.length > maxRows
      ? `\n\n_*총 ${sorted.length}개 계정 중 상위 ${maxRows}개만 표시했습니다. 전체는 DART 원문을 보세요.*_\n`
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
  return Array.isArray(list) ? (list as Record<string, unknown>[]) : [];
}

function recordsToMarkdown(title: string, rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]).filter((k) => !k.startsWith("_"));
  const head = `| ${keys.join(" | ")} |`;
  const sep = `| ${keys.map(() => "---").join(" | ")} |`;
  const body = rows.slice(0, 80).map((row) => {
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
      const [cfs, ofs] = await Promise.all([
        fetchFnlttSinglAcntAll(crtfc_key, corp.corp_code, bsns_year, reprt_code, "CFS"),
        fetchFnlttSinglAcntAll(crtfc_key, corp.corp_code, bsns_year, reprt_code, "OFS"),
      ]);
      if (cfs.length > 0 || ofs.length > 0) {
        const [exctv, emp] = await Promise.all([
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
    `- **출처**: 금융감독원 전자공시 오픈다트 API (fnlttSinglAcntAll, 임원·직원 현황)`,
    "",
    `> 교육용 요약입니다. 투자 판단은 원문 공시와 감사보고서를 확인하세요.`,
    "",
  ];

  if (b.cfs.length) {
    parts.push(
      fnlttToMarkdown(b.cfs, "연결재무제표 (손익·재무상태표·현금흐름 등 통합)", 240),
      "",
    );
  }
  if (b.ofs.length) {
    parts.push(
      fnlttToMarkdown(b.ofs, "별도재무제표 (지배회사 단독)", 240),
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
export function bundleToPromptSnippet(b: DartBundle, maxChars = 10000): string {
  const full = bundleToMarkdown(b);
  if (full.length <= maxChars) return full;
  return `${full.slice(0, maxChars)}\n\n…(이하 생략)…`;
}
