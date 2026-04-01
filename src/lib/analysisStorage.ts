import type { AnalyzeResponse } from "../types";
import { getSupabase, isSupabaseConfigured } from "./supabase";

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
  };
  return {
    source: row.source as AnalyzeResponse["source"],
    query: String(row.query),
    reportMarkdown: String(row.report_markdown),
    quiz: Array.isArray(row.quiz) ? (row.quiz as AnalyzeResponse["quiz"]) : [],
    groundingQueries: Array.isArray(meta.groundingQueries)
      ? meta.groundingQueries
      : [],
    sources: Array.isArray(meta.sources) ? meta.sources : [],
    model: typeof meta.model === "string" ? meta.model : "",
  };
}

function saveLocalReport(trimmed: AnalyzeResponse) {
  const id = crypto.randomUUID();
  const entries = [
    { id, at: Date.now(), data: trimmed },
    ...loadLocalEntries().filter((e) => e.id !== id),
  ];
  saveLocalEntries(entries);
}

/** 분석 성공 후 전체 리포트 저장 */
export async function saveReport(data: AnalyzeResponse): Promise<void> {
  const trimmed = { ...data, query: data.query.trim() };

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
  return found ? found.data : null;
}
