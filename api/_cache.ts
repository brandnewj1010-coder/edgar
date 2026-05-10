import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AnalyzeResponse } from "../src/types.js";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1시간

function getServerSupabase(): SupabaseClient | null {
  const url = process.env.VITE_SUPABASE_URL?.trim();
  const key = process.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

type Cacheable = Pick<
  AnalyzeResponse,
  "reportMarkdown" | "headline" | "quiz" | "reflectionPrompts" | "sources" | "model" | "chartData"
>;

function normalizeKey(query: string): string {
  return query.toLowerCase().trim();
}

export async function getCached(source: string, query: string): Promise<Cacheable | null> {
  try {
    const sb = getServerSupabase();
    if (!sb) return null;
    const since = new Date(Date.now() - CACHE_TTL_MS).toISOString();
    const { data, error } = await sb
      .from("analysis_reports")
      .select("report_markdown, quiz, meta")
      .eq("source", source)
      .eq("query", normalizeKey(query))
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return null;
    const m = (data.meta as Record<string, unknown>) ?? {};
    return {
      reportMarkdown: data.report_markdown as string,
      quiz: (data.quiz as AnalyzeResponse["quiz"]) ?? [],
      headline: typeof m.headline === "string" ? m.headline : "",
      reflectionPrompts: Array.isArray(m.reflectionPrompts) ? (m.reflectionPrompts as AnalyzeResponse["reflectionPrompts"]) : [],
      sources: Array.isArray(m.sources) ? (m.sources as AnalyzeResponse["sources"]) : [],
      model: typeof m.model === "string" ? `${m.model} (캐시)` : "캐시",
      chartData: m.chartData as AnalyzeResponse["chartData"] ?? null,
    };
  } catch {
    return null;
  }
}

export async function setCached(source: string, query: string, result: Cacheable): Promise<void> {
  try {
    const sb = getServerSupabase();
    if (!sb) return;
    await sb.from("analysis_reports").insert({
      source,
      query: normalizeKey(query),
      report_markdown: result.reportMarkdown,
      quiz: result.quiz,
      meta: {
        headline: result.headline,
        reflectionPrompts: result.reflectionPrompts,
        sources: result.sources,
        model: result.model,
        chartData: result.chartData ?? null,
      },
    });
  } catch (e) {
    console.warn("[cache set]", e instanceof Error ? e.message : e);
  }
}
