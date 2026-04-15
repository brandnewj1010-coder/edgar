/**
 * SEC EDGAR Open API
 * https://efts.sec.gov / https://data.sec.gov
 * 인증키 불필요 — User-Agent 헤더 필수
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { EdgarCompany, EdgarFiling, FinancialChartData, FinancialMetric, HrMetrics } from "../src/types.js";

export const config = { maxDuration: 30 };

const SEC_UA = "InsightAnalyzer contact@example.com";

/** SEC API 공통 fetch 래퍼 */
async function secFetch(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": SEC_UA,
      "Accept": "application/json",
    },
  });
  if (!res.ok) throw new Error(`SEC EDGAR HTTP ${res.status}: ${url}`);
  return res.json();
}

/** ── 티커→CIK 매핑 캐시 ── */
let tickerMapCache: Map<string, { cik: string; name: string }> | null = null;

async function getTickerMap(): Promise<Map<string, { cik: string; name: string }>> {
  if (tickerMapCache) return tickerMapCache;
  const data = (await secFetch("https://www.sec.gov/files/company_tickers.json")) as Record<
    string,
    { cik_str: number; ticker: string; title: string }
  >;
  const map = new Map<string, { cik: string; name: string }>();
  for (const entry of Object.values(data)) {
    const cik = String(entry.cik_str).padStart(10, "0");
    map.set(entry.ticker.toUpperCase(), { cik, name: entry.title });
  }
  tickerMapCache = map;
  return map;
}

/** 티커로 CIK 조회 */
export async function resolveEdgarCik(ticker: string): Promise<EdgarCompany | null> {
  const map = await getTickerMap();
  const key = ticker.toUpperCase().trim();
  const entry = map.get(key);
  if (!entry) return null;
  return { cik: entry.cik, name: entry.name, ticker: key };
}

/** 최근 제출 서류 목록 (10-K, DEF 14A 등) */
export async function fetchRecentFilings(
  cik: string,
  forms: string[],
  limit = 5,
): Promise<EdgarFiling[]> {
  const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
  const data = (await secFetch(url)) as {
    filings?: {
      recent?: {
        accessionNumber: string[];
        form: string[];
        filingDate: string[];
        primaryDocument: string[];
        reportDate?: string[];
      };
    };
  };
  const recent = data.filings?.recent;
  if (!recent) return [];

  const results: EdgarFiling[] = [];
  const formSet = new Set(forms.map((f) => f.toUpperCase()));
  for (let i = 0; i < (recent.accessionNumber?.length ?? 0); i++) {
    const form = (recent.form?.[i] ?? "").toUpperCase();
    if (formSet.has(form)) {
      results.push({
        accessionNumber: recent.accessionNumber[i],
        form: recent.form[i],
        filingDate: recent.filingDate[i],
        primaryDocument: recent.primaryDocument[i],
        reportDate: recent.reportDate?.[i],
      });
      if (results.length >= limit) break;
    }
  }
  return results;
}

/** XBRL companyfacts — 주요 재무 수치 추출 (최근 3년) */
export async function fetchEdgarFinancials(cik: string): Promise<FinancialChartData | null> {
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
  let data: {
    entityName?: string;
    facts?: {
      "us-gaap"?: Record<string, {
        label?: string;
        units?: Record<string, Array<{
          end: string;
          val: number;
          form: string;
          filed: string;
          frame?: string;
        }>>;
      }>;
    };
  };
  try {
    data = (await secFetch(url)) as typeof data;
  } catch {
    return null;
  }

  const gaap = data.facts?.["us-gaap"];
  if (!gaap) return null;
  const corpName = data.entityName ?? "";

  // 최근 연간(10-K) 값 추출 헬퍼
  function getAnnualValues(
    conceptKey: string,
  ): Array<{ year: string; val: number }> {
    const concept = gaap[conceptKey];
    if (!concept) return [];
    const usd = concept.units?.USD;
    if (!Array.isArray(usd)) return [];
    // 10-K 연간 보고서만, frame이 있는 것 우선, 최근 3년
    const annual = usd
      .filter((u) => u.form === "10-K" && u.end && u.frame)
      .sort((a, b) => b.end.localeCompare(a.end));

    const seen = new Set<string>();
    const out: Array<{ year: string; val: number }> = [];
    for (const u of annual) {
      const yr = u.end.slice(0, 4);
      if (!seen.has(yr)) {
        seen.add(yr);
        out.push({ year: yr, val: u.val });
      }
      if (out.length >= 3) break;
    }
    return out;
  }

  // 주요 계정 추출 (revenue, operating income, net income, etc.)
  const CONCEPTS: Array<{
    label: string;
    keys: string[];
    category: FinancialMetric["category"];
    unit: string;
  }> = [
    {
      label: "Revenue",
      keys: [
        "Revenues",
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "SalesRevenueNet",
        "RevenueFromContractWithCustomerIncludingAssessedTax",
      ],
      category: "income",
      unit: "USD",
    },
    {
      label: "Operating Income",
      keys: ["OperatingIncomeLoss"],
      category: "income",
      unit: "USD",
    },
    {
      label: "Net Income",
      keys: ["NetIncomeLoss", "ProfitLoss"],
      category: "income",
      unit: "USD",
    },
    {
      label: "Gross Profit",
      keys: ["GrossProfit"],
      category: "income",
      unit: "USD",
    },
    {
      label: "Operating Cash Flow",
      keys: ["NetCashProvidedByUsedInOperatingActivities"],
      category: "cashflow",
      unit: "USD",
    },
    {
      label: "Total Assets",
      keys: ["Assets"],
      category: "balance",
      unit: "USD",
    },
    {
      label: "Total Liabilities",
      keys: ["Liabilities"],
      category: "balance",
      unit: "USD",
    },
    {
      label: "Stockholders Equity",
      keys: ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"],
      category: "balance",
      unit: "USD",
    },
    {
      label: "Labor & Related Expense",
      keys: ["LaborAndRelatedExpense"],
      category: "hr",
      unit: "USD",
    },
    {
      label: "Number of Employees",
      keys: ["EntityNumberOfEmployees"],
      category: "hr",
      unit: "명",
    },
  ];

  const metrics: FinancialMetric[] = [];
  let currentYear = "";
  let priorYear = "";
  let priorPriorYear = "";

  for (const c of CONCEPTS) {
    let vals: Array<{ year: string; val: number }> = [];
    for (const key of c.keys) {
      vals = getAnnualValues(key);
      if (vals.length > 0) break;
    }
    if (vals.length === 0) continue;

    // 연도 설정 (첫 번째 지표에서)
    if (!currentYear && vals[0]) {
      currentYear = vals[0].year;
      priorYear = vals[1]?.year ?? String(parseInt(currentYear) - 1);
      priorPriorYear = vals[2]?.year ?? String(parseInt(currentYear) - 2);
    }

    metrics.push({
      label: c.label,
      current: vals[0]?.val ?? null,
      prior: vals[1]?.val ?? null,
      priorPrior: vals[2]?.val ?? null,
      unit: c.unit,
      category: c.category,
    });
  }

  if (metrics.length === 0) return null;

  // HR 파생 지표
  const hrMetrics: HrMetrics = {};
  const rev = metrics.find((m) => m.label === "Revenue")?.current ?? null;
  const op = metrics.find((m) => m.label === "Operating Income")?.current ?? null;
  const labor = metrics.find((m) => m.label === "Labor & Related Expense")?.current ?? null;
  const emp = metrics.find((m) => m.label === "Number of Employees")?.current ?? null;

  if (emp && emp > 0) {
    hrMetrics.headcount = emp;
    if (rev !== null) hrMetrics.revenuePerEmployee = Math.round(rev / emp);
    if (op !== null) hrMetrics.opIncomePerEmployee = Math.round(op / emp);
    if (labor !== null) hrMetrics.avgSalaryMillion = Math.round(labor / emp);
  }
  if (labor !== null && rev !== null && rev > 0) {
    hrMetrics.laborToRevenueRatio = Math.round((labor / rev) * 100 * 10) / 10;
  }

  return {
    corp: corpName,
    currentYear: currentYear || String(new Date().getFullYear() - 1),
    priorYear: priorYear || String(new Date().getFullYear() - 2),
    priorPriorYear: priorPriorYear || String(new Date().getFullYear() - 3),
    metrics,
    hrMetrics: Object.keys(hrMetrics).length > 0 ? hrMetrics : undefined,
    unitNote: "단위: USD (SEC EDGAR XBRL 기준)",
  };
}

/** EDGAR 데이터를 LLM용 markdown snippet으로 변환 */
export function edgarFinancialsToMarkdown(
  cd: FinancialChartData,
  filings: EdgarFiling[],
): string {
  const lines: string[] = [
    `## SEC EDGAR 공시 수치`,
    "",
    `- **기업**: ${cd.corp}`,
    `- **기준**: ${cd.currentYear}년 / ${cd.priorYear}년 / ${cd.priorPriorYear}년 (10-K 연간보고서)`,
    `- **출처**: SEC EDGAR XBRL (data.sec.gov)`,
    "",
    "> 교육용 요약입니다. 전체 공시 원문은 EDGAR에서 확인하세요.",
    "",
  ];

  // 재무 지표 테이블
  const incomeMetrics = cd.metrics.filter((m) => m.category === "income");
  const balanceMetrics = cd.metrics.filter((m) => m.category === "balance");
  const cfMetrics = cd.metrics.filter((m) => m.category === "cashflow");
  const hrMetricsList = cd.metrics.filter((m) => m.category === "hr");

  function toTable(title: string, ms: FinancialMetric[]) {
    if (ms.length === 0) return "";
    const rows = [
      `### ${title}`,
      "",
      `| 계정 | ${cd.currentYear} | ${cd.priorYear} | ${cd.priorPriorYear} |`,
      "| --- | --- | --- | --- |",
      ...ms.map(
        (m) =>
          `| ${m.label} | ${fmtNum(m.current, m.unit)} | ${fmtNum(m.prior, m.unit)} | ${fmtNum(m.priorPrior, m.unit)} |`,
      ),
      "",
    ];
    return rows.join("\n");
  }

  if (incomeMetrics.length) lines.push(toTable("손익 (Income Statement)", incomeMetrics));
  if (balanceMetrics.length) lines.push(toTable("재무상태 (Balance Sheet)", balanceMetrics));
  if (cfMetrics.length) lines.push(toTable("현금흐름 (Cash Flow)", cfMetrics));
  if (hrMetricsList.length) lines.push(toTable("인력·인건비 (HR)", hrMetricsList));

  // 최근 서류 링크
  if (filings.length > 0) {
    lines.push("### 최근 제출 서류");
    lines.push("");
    for (const f of filings) {
      const accNo = f.accessionNumber.replace(/-/g, "");
      const url = `https://www.sec.gov/Archives/edgar/data/${parseInt(accNo)}/`;
      lines.push(`- **${f.form}** (${f.filingDate}): [EDGAR 원문](${url})`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function fmtNum(v: number | null, unit: string): string {
  if (v === null) return "—";
  if (unit === "USD") {
    if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    return `$${v.toLocaleString()}`;
  }
  if (unit === "명") return `${v.toLocaleString()}명`;
  return v.toLocaleString();
}

/** Vercel 서버리스 핸들러 — /api/edgar */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  let body: { ticker?: string };
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});
  } catch {
    res.status(400).json({ error: "잘못된 JSON 본문" });
    return;
  }

  const ticker = String(body.ticker ?? "").trim().toUpperCase();
  if (!ticker) {
    res.status(400).json({ error: "ticker를 입력하세요." });
    return;
  }

  try {
    const company = await resolveEdgarCik(ticker);
    if (!company) {
      res.status(404).json({ error: `"${ticker}" 티커를 찾지 못했습니다.` });
      return;
    }

    const [financials, filings] = await Promise.allSettled([
      fetchEdgarFinancials(company.cik),
      fetchRecentFilings(company.cik, ["10-K", "DEF 14A"], 6),
    ]);

    res.status(200).json({
      company,
      chartData: financials.status === "fulfilled" ? financials.value : null,
      filings: filings.status === "fulfilled" ? filings.value : [],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(502).json({ error: message });
  }
}
