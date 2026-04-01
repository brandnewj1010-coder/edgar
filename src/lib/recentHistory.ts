import { getSupabase, isSupabaseConfigured } from "./supabase";

const KEY = "insight-analyzer:recent";

export type RecentItem = {
  id: string;
  source: "dart" | "edgar";
  query: string;
  at: number;
};

function loadLocal(): RecentItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocal(items: RecentItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 12)));
}

function dedupeRecent(rows: RecentItem[]): RecentItem[] {
  const map = new Map<string, RecentItem>();
  for (const r of rows) {
    const k = `${r.source}:${r.query}`;
    const prev = map.get(k);
    if (!prev || r.at > prev.at) map.set(k, r);
  }
  return [...map.values()].sort((a, b) => b.at - a.at).slice(0, 12);
}

/** Supabase 미설정 시 또는 폴백 */
export function getRecentLocal(): RecentItem[] {
  return loadLocal().sort((a, b) => b.at - a.at);
}

export async function loadRecent(): Promise<RecentItem[]> {
  if (!isSupabaseConfigured()) {
    return getRecentLocal();
  }
  const sb = getSupabase();
  if (!sb) return getRecentLocal();

  const { data, error } = await sb
    .from("search_history")
    .select("source, query, created_at")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    console.warn("[InsightAnalyzer] Supabase search_history:", error.message);
    return getRecentLocal();
  }

  const fromDb: RecentItem[] = (data ?? []).map((row) => {
    const source = row.source as "dart" | "edgar";
    const query = String(row.query ?? "");
    const at = new Date(String(row.created_at)).getTime();
    return {
      id: `${source}:${query}`,
      source,
      query,
      at: Number.isFinite(at) ? at : Date.now(),
    };
  });

  if (fromDb.length === 0) return getRecentLocal();
  return dedupeRecent(fromDb);
}

export function pushRecentLocal(item: Omit<RecentItem, "id" | "at">) {
  const id = `${item.source}:${item.query.trim()}`;
  const next: RecentItem = {
    id,
    ...item,
    query: item.query.trim(),
    at: Date.now(),
  };
  const rest = loadLocal().filter((x) => x.id !== id);
  saveLocal([next, ...rest]);
}

export async function pushRecent(
  item: Omit<RecentItem, "id" | "at">,
): Promise<void> {
  pushRecentLocal(item);

  if (!isSupabaseConfigured()) return;
  const sb = getSupabase();
  if (!sb) return;

  const { error } = await sb.from("search_history").insert({
    source: item.source,
    query: item.query.trim(),
  });

  if (error) {
    console.warn("[InsightAnalyzer] Supabase insert:", error.message);
  }
}
