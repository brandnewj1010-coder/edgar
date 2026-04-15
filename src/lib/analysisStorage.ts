import type { AnalyzeResponse } from "../types";
import { getSupabase, isSupabaseConfigured } from "./supabase";

function normalizeAnalyzeResponse(
  d: Partial<AnalyzeResponse> | null | undefined,
): AnalyzeResponse {
  const sankey = d?.sankey;
  const okSankey =
    sankey &&
    typeof sankey === "object" &&
    Array.isArray(sankey.nodes) &&
    sankey.nodes.length >= 2
      ? sankey
      : null;
  return {
    reportMarkdown: d?.reportMarkdown ?? "",
    quiz: Array.isArray(d?.quiz) ? d.quiz : [],
    reflectionPrompts: Array.isArray(d?.reflectionPrompts)
      ? d.reflectionPrompts
      : [],
    sankey: okSankey,
    chartData: d?.chartData ?? null,
    groundingQueries: Array.isArray(d?.groundingQueries)
      ? d.groundingQueries
      : [],
    sources: Array.isArray(d?.sources) ? d.sources : [],
    model: d?.model ?? "",
    source: d?.source === "edgar" ? "edgar" : "dart",
    query: d?.query ?? "",
    compareWith: d?.compareWith,
    fiscalYears: Array.isArray(d?.fiscalYears) ? d.fiscalYears : undefined,
  };
}

const LOCAL_STORE_KEY = "insight-analyzer:stored-reports-v1";

type StoredEntry = {
  id: string;
  at: number;
  data: AnalyzeResponse;
};

export type RecentItem = {
  id: string;
  source: "dart" | "edgar";
  query: string;
  at: number;
};

function loadLocalEntries(): StoredEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as StoredEntry[];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function saveLocalEntries(entries: StoredEntry[]) {
  localStorage.setItem(
    LOCAL_STORE_KEY,
    JSON.stringify(entries.slice(0, 25)),
  );
}

type DbReportRow = {
  source: string;
  query: string;
  report_markdown: string;
  quiz: unknown;
  meta: Record<string, unknown> | null;
};

function rowToResponse(row: DbReportRow): AnalyzeResponse {
  const meta = (row.meta || {}) as {
    model?: string;
    groundingQueries?: string[];
    sources?: { title: string; uri: string }[];
    reflectionPrompts?: AnalyzeResponse["reflectionPrompts"];
    sankey?: AnalyzeResponse["sankey"];
    chartData?: AnalyzeResponse["chartData"];
    compareWith?: string;
    fiscalYears?: number[];
  };
  return normalizeAnalyzeResponse({
    source: row.source as AnalyzeResponse["source"],
    query: String(row.query),
    reportMarkdown: String(row.report_markdown),
    quiz: Array.isArray(row.quiz) ? (row.quiz as AnalyzeResponse["quiz"]) : [],
    reflectionPrompts: meta.reflectionPrompts,
    sankey: meta.sankey as AnalyzeResponse["sankey"],
    chartData: meta.chartData,
    groundingQueries: meta.groundingQueries,
    sources: meta.sources,
    model: typeof meta.model === "string" ? meta.model : "",
    compareWith: meta.compareWith,
    fiscalYears: meta.fiscalYears,
  });
}

function saveLocalReport(trimmed: AnalyzeResponse) {
  const id = crypto.randomUUID();
  const data = normalizeAnalyzeResponse(trimmed);
  const entries = [
    { id, at: Date.now(), data },
    ...loadLocalEntries().filter((e) => e.id !== id),
  ];
  saveLocalEntries(entries);
}

/** 분석 성공 후 전체 리포트 저장 */
export async function saveReport(data: AnalyzeResponse): Promise<void> {
  const trimmed = normalizeAnalyzeResponse({
    ...data,
    query: data.query.trim(),
  });

  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from("analysis_reports").insert({
        source: trimmed.source,
        query: trimmed.query,
        report_markdown: trimmed.reportMarkdown,
        quiz: trimmed.quiz,
        meta: {
          model: trimmed.model,
          groundingQueries: trimmed.groundingQueries,
          sources: trimmed.sources,
          reflectionPrompts: trimmed.reflectionPrompts,
          sankey: trimmed.sankey,
          chartData: trimmed.chartData,
          compareWith: trimmed.compareWith,
          fiscalYears: trimmed.fiscalYears,
        },
      });
      if (error) {
        console.warn("[InsightAnalyzer] analysis_reports insert:", error.message);
        saveLocalReport(trimmed);
      }
      return;
    }
  }

  saveLocalReport(trimmed);
}

export async function loadRecentList(): Promise<RecentItem[]> {
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
        .from("analysis_reports")
        .select("id, source, query, created_at")
        .order("created_at", { ascending: false })
        .limit(40);

      if (!error && data?.length) {
        return data.map((row) => ({
          id: String(row.id),
          source: row.source as RecentItem["source"],
          query: String(row.query ?? ""),
          at: new Date(String(row.created_at)).getTime(),
        }));
      }
      if (error) {
        console.warn("[InsightAnalyzer] analysis_reports list:", error.message);
      }
    }
  }

  return loadLocalEntries()
    .map((e) => ({
      id: e.id,
      source: e.data.source,
      query: e.data.query,
      at: e.at,
    }))
    .sort((a, b) => b.at - a.at);
}

export async function loadReportById(id: string): Promise<AnalyzeResponse | null> {
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
        .from("analysis_reports")
        .select("source, query, report_markdown, quiz, meta")
        .eq("id", id)
        .maybeSingle();

      if (!error && data) {
        return rowToResponse(data as DbReportRow);
      }
      if (error) {
        console.warn("[InsightAnalyzer] loadReport:", error.message);
      }
    }
  }

  const found = loadLocalEntries().find((e) => e.id === id);
  return found ? normalizeAnalyzeResponse(found.data) : null;
}
