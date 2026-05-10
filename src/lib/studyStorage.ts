import type { QuizItem, QuizSession, DisclosureSource } from "../types";
import { getSupabase, isSupabaseConfigured } from "./supabase";

const LOCAL_QUIZ_KEY = "insight-analyzer:quiz-sessions-v1";

// ── 로컬 스토리지 헬퍼 ─────────────────────────────────────────────────────────
function loadLocalSessions(): QuizSession[] {
  try {
    const raw = localStorage.getItem(LOCAL_QUIZ_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as QuizSession[];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function saveLocalSessions(sessions: QuizSession[]) {
  localStorage.setItem(LOCAL_QUIZ_KEY, JSON.stringify(sessions.slice(0, 50)));
}

// ── 세션 저장 ──────────────────────────────────────────────────────────────────
export async function saveQuizSession(session: QuizSession): Promise<void> {
  // 로컬 저장
  const existing = loadLocalSessions().filter((s) => s.id !== session.id);
  saveLocalSessions([session, ...existing]);

  // Supabase 저장 (설정된 경우)
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from("quiz_sessions").upsert({
        id: session.id,
        source: session.source,
        query: session.query,
        questions: session.questions,
        answers: session.answers,
        score: session.score,
        created_at: new Date(session.at).toISOString(),
      });
      if (error) {
        console.warn("[studyStorage] quiz_sessions upsert:", error.message);
      }
    }
  }
}

// ── 세션 목록 로드 ─────────────────────────────────────────────────────────────
export async function loadQuizSessions(): Promise<QuizSession[]> {
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
        .from("quiz_sessions")
        .select("id, source, query, questions, answers, score, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data?.length) {
        return data.map((row) => ({
          id: String(row.id),
          at: new Date(String(row.created_at)).getTime(),
          source: (row.source as DisclosureSource) ?? "dart",
          query: String(row.query ?? ""),
          questions: Array.isArray(row.questions) ? (row.questions as QuizItem[]) : [],
          answers: Array.isArray(row.answers) ? (row.answers as (number | null)[]) : [],
          score: typeof row.score === "number" ? row.score : null,
        }));
      }
      if (error) console.warn("[studyStorage] quiz_sessions list:", error.message);
    }
  }

  return loadLocalSessions().sort((a, b) => b.at - a.at);
}

// ── 세션 삭제 ──────────────────────────────────────────────────────────────────
export async function deleteQuizSession(id: string): Promise<void> {
  const existing = loadLocalSessions().filter((s) => s.id !== id);
  saveLocalSessions(existing);

  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    if (sb) {
      await sb.from("quiz_sessions").delete().eq("id", id);
    }
  }
}

// ── 퀴즈 세션 생성 헬퍼 ───────────────────────────────────────────────────────
export function createQuizSession(
  source: DisclosureSource,
  query: string,
  questions: QuizItem[],
): QuizSession {
  return {
    id: crypto.randomUUID(),
    at: Date.now(),
    source,
    query,
    questions,
    answers: new Array(questions.length).fill(null),
    score: null,
  };
}

export function calcScore(session: QuizSession): number {
  const answered = session.answers.filter((a) => a !== null).length;
  if (answered === 0) return 0;
  const correct = session.questions.filter(
    (q, i) => session.answers[i] === q.correctIndex,
  ).length;
  return Math.round((correct / session.questions.length) * 100);
}
