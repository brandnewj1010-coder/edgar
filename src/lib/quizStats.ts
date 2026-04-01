const KEY = "insight-analyzer:quiz-stats-v1";

type Stats = {
  totalCorrect: number;
  totalQuestions: number;
  rounds: number;
};

function load(): Stats {
  try {
    const r = localStorage.getItem(KEY);
    if (!r) return { totalCorrect: 0, totalQuestions: 0, rounds: 0 };
    const p = JSON.parse(r) as Stats;
    return {
      totalCorrect: Number(p.totalCorrect) || 0,
      totalQuestions: Number(p.totalQuestions) || 0,
      rounds: Number(p.rounds) || 0,
    };
  } catch {
    return { totalCorrect: 0, totalQuestions: 0, rounds: 0 };
  }
}

function save(s: Stats) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

/** 정답 공개 시 호출: 맞춘 개수 / 전체 문항 */
export function recordQuizRound(correct: number, total: number) {
  if (total <= 0) return;
  const s = load();
  s.totalCorrect += correct;
  s.totalQuestions += total;
  s.rounds += 1;
  save(s);
}

export function getQuizStats(): Stats {
  return load();
}
