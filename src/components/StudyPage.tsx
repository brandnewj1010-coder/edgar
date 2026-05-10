import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle,
  XCircle,
  RotateCcw,
  Trash2,
  ChevronRight,
  Trophy,
  Clock,
  HelpCircle,
  ArrowLeft,
} from "lucide-react";
import type { QuizItem, QuizSession, DisclosureSource } from "../types";
import {
  calcScore,
  createQuizSession,
  deleteQuizSession,
  loadQuizSessions,
  saveQuizSession,
} from "../lib/studyStorage";

// ─── 퀴즈 플레이어 ──────────────────────────────────────────────────────────────
function QuizPlayer({
  session,
  onComplete,
  onBack,
}: {
  session: QuizSession;
  onComplete: (updated: QuizSession) => void;
  onBack: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    session.answers.length === session.questions.length
      ? [...session.answers]
      : new Array(session.questions.length).fill(null),
  );
  const [showResult, setShowResult] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const q = session.questions[current];
  const isAnswered = answers[current] !== null;
  const isCorrect = isAnswered && answers[current] === q.correctIndex;
  const isLast = current === session.questions.length - 1;

  const selectAnswer = (idx: number) => {
    if (answers[current] !== null) return;
    const next = [...answers];
    next[current] = idx;
    setAnswers(next);
    setRevealed(true);
  };

  const handleNext = () => {
    setRevealed(false);
    if (isLast) {
      const updated: QuizSession = {
        ...session,
        answers,
        score: calcScore({ ...session, answers }),
      };
      onComplete(updated);
      setShowResult(true);
    } else {
      setCurrent((c) => c + 1);
    }
  };

  const score = calcScore({ ...session, answers });
  const correctCount = session.questions.filter(
    (q2, i) => answers[i] === q2.correctIndex,
  ).length;

  if (showResult) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Trophy className="mx-auto mb-4 h-12 w-12 text-amber-400" />
          <h3 className="text-2xl font-bold text-slate-900">퀴즈 완료!</h3>
          <p className="mt-1 text-slate-500">
            {session.query} ({session.source.toUpperCase()})
          </p>
          <div className="mt-6 flex justify-center gap-8">
            <div className="text-center">
              <p className="text-4xl font-bold text-indigo-600">{score}점</p>
              <p className="mt-1 text-sm text-slate-500">총점</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-emerald-600">
                {correctCount}/{session.questions.length}
              </p>
              <p className="mt-1 text-sm text-slate-500">정답</p>
            </div>
          </div>

          <div className="mt-8 space-y-3 text-left">
            {session.questions.map((q2, i) => {
              const ans = answers[i];
              const ok = ans === q2.correctIndex;
              return (
                <div
                  key={i}
                  className={`rounded-xl border p-4 ${ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}
                >
                  <div className="flex gap-2">
                    {ok ? (
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{q2.question}</p>
                      {!ok && ans !== null && (
                        <p className="mt-1 text-xs text-rose-700">
                          내 답: {q2.choices[ans]}
                        </p>
                      )}
                      <p className={`mt-1 text-xs ${ok ? "text-emerald-700" : "text-slate-600"}`}>
                        정답: {q2.choices[q2.correctIndex]}
                      </p>
                      {q2.explanation && (
                        <p className="mt-1 text-xs text-slate-500">{q2.explanation}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={onBack}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <ArrowLeft className="h-4 w-4" />
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* 진행 상황 */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          목록
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">
            {current + 1} / {session.questions.length}
          </span>
          <div className="flex gap-1">
            {session.questions.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-6 rounded-full transition-colors ${
                  i < current
                    ? answers[i] === session.questions[i].correctIndex
                      ? "bg-emerald-400"
                      : "bg-rose-400"
                    : i === current
                      ? "bg-indigo-500"
                      : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 질문 카드 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-indigo-400" />
          <span className="text-xs font-medium uppercase tracking-wide text-indigo-600">
            Q{current + 1}
          </span>
        </div>
        <p className="mt-2 text-base font-semibold leading-relaxed text-slate-900">
          {q.question}
        </p>

        <div className="mt-5 space-y-2.5">
          {q.choices.map((choice, idx) => {
            let cls =
              "flex w-full items-start gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-all ";
            if (!isAnswered) {
              cls += "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer";
            } else if (idx === q.correctIndex) {
              cls += "border-emerald-400 bg-emerald-50 text-emerald-800";
            } else if (idx === answers[current]) {
              cls += "border-rose-400 bg-rose-50 text-rose-800";
            } else {
              cls += "border-slate-200 bg-slate-50 text-slate-400";
            }
            return (
              <button
                key={idx}
                onClick={() => selectAnswer(idx)}
                disabled={isAnswered}
                className={cls}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    !isAnswered
                      ? "bg-slate-100 text-slate-600"
                      : idx === q.correctIndex
                        ? "bg-emerald-400 text-white"
                        : idx === answers[current]
                          ? "bg-rose-400 text-white"
                          : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {["A", "B", "C", "D"][idx]}
                </span>
                <span className="leading-relaxed">{choice}</span>
              </button>
            );
          })}
        </div>

        {revealed && isAnswered && (
          <div
            className={`mt-4 rounded-xl p-3 text-sm ${
              isCorrect ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            <p className="font-medium">
              {isCorrect ? "✓ 정답입니다!" : `✗ 오답 — 정답: ${q.choices[q.correctIndex]}`}
            </p>
            {q.explanation && (
              <p className="mt-1 text-xs opacity-80">{q.explanation}</p>
            )}
          </div>
        )}

        {isAnswered && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {isLast ? "결과 보기" : "다음"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 아카이브 목록 ──────────────────────────────────────────────────────────────
function ArchiveList({
  sessions,
  onPlay,
  onDelete,
  onRetake,
}: {
  sessions: QuizSession[];
  onPlay: (s: QuizSession) => void;
  onDelete: (id: string) => void;
  onRetake: (s: QuizSession) => void;
}) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-8 py-16 text-center">
        <BookOpen className="mb-3 h-10 w-10 text-slate-300" />
        <p className="text-base font-medium text-slate-600">아직 퀴즈 기록이 없습니다</p>
        <p className="mt-1 text-sm text-slate-400">
          메인 화면에서 기업을 조회하면 퀴즈가 자동 생성됩니다
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((s) => {
        const isDone = s.score !== null;
        const answered = s.answers.filter((a) => a !== null).length;
        const date = new Date(s.at).toLocaleDateString("ko-KR", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div
            key={s.id}
            className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-indigo-700">
                  {s.source}
                </span>
                {isDone ? (
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      (s.score ?? 0) >= 70
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {s.score}점
                  </span>
                ) : answered > 0 ? (
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    진행 중 {answered}/{s.questions.length}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                {s.query}
              </p>
              <p className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="h-3 w-3" />
                {date} · {s.questions.length}문제
              </p>
            </div>

            <div className="flex gap-2">
              {isDone ? (
                <>
                  <button
                    onClick={() => onPlay(s)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    결과 보기
                  </button>
                  <button
                    onClick={() => onRetake(s)}
                    className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                  >
                    <RotateCcw className="h-3 w-3" />
                    다시 풀기
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onPlay(s)}
                  className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  풀기 시작
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => onDelete(s.id)}
                className="rounded-lg border border-rose-200 px-2 py-1.5 text-xs text-rose-500 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 통계 요약 ─────────────────────────────────────────────────────────────────
function StudyStats({ sessions }: { sessions: QuizSession[] }) {
  const done = sessions.filter((s) => s.score !== null);
  if (done.length === 0) return null;
  const avgScore = Math.round(done.reduce((sum, s) => sum + (s.score ?? 0), 0) / done.length);
  const totalQ = done.reduce((sum, s) => sum + s.questions.length, 0);
  const totalCorrect = done.reduce((sum, s) => {
    const correct = s.questions.filter((q, i) => s.answers[i] === q.correctIndex).length;
    return sum + correct;
  }, 0);

  return (
    <div className="mb-5 grid grid-cols-3 gap-3">
      {[
        { label: "완료한 퀴즈", value: `${done.length}회` },
        { label: "평균 점수", value: `${avgScore}점` },
        { label: "누적 정답률", value: `${Math.round((totalCorrect / totalQ) * 100)}%` },
      ].map((stat) => (
        <div key={stat.label} className="rounded-xl bg-indigo-50 px-4 py-3 text-center">
          <p className="text-xl font-bold text-indigo-700">{stat.value}</p>
          <p className="mt-0.5 text-xs text-slate-500">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── 메인 StudyPage ────────────────────────────────────────────────────────────
interface StudyPageProps {
  /** 메인 화면에서 방금 생성된 퀴즈 (있으면 자동으로 새 세션 추가) */
  pendingQuiz?: { source: DisclosureSource; query: string; questions: QuizItem[] } | null;
  onClearPending?: () => void;
}

export function StudyPage({ pendingQuiz, onClearPending }: StudyPageProps) {
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [activeSession, setActiveSession] = useState<QuizSession | null>(null);
  const [loading, setLoading] = useState(true);

  // 초기 로드
  useEffect(() => {
    setLoading(true);
    loadQuizSessions().then((s) => {
      setSessions(s);
      setLoading(false);
    });
  }, []);

  // 메인에서 넘어온 퀴즈 처리
  useEffect(() => {
    if (!pendingQuiz || pendingQuiz.questions.length === 0) return;
    const session = createQuizSession(
      pendingQuiz.source,
      pendingQuiz.query,
      pendingQuiz.questions,
    );
    saveQuizSession(session).then(() => {
      setSessions((prev) => [session, ...prev]);
      setActiveSession(session);
      onClearPending?.();
    });
  }, [pendingQuiz, onClearPending]);

  const handleComplete = useCallback(async (updated: QuizSession) => {
    await saveQuizSession(updated);
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setActiveSession(updated);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await deleteQuizSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleRetake = useCallback(
    async (s: QuizSession) => {
      const fresh = createQuizSession(s.source, s.query, s.questions);
      await saveQuizSession(fresh);
      setSessions((prev) => [fresh, ...prev]);
      setActiveSession(fresh);
    },
    [],
  );

  if (activeSession) {
    return (
      <div className="min-h-full px-4 py-6 md:px-8 md:py-8">
        <QuizPlayer
          session={activeSession}
          onComplete={handleComplete}
          onBack={() => setActiveSession(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900">스터디 아카이브</h2>
          <p className="mt-1 text-sm text-slate-500">
            조회한 기업의 퀴즈를 풀고 학습 기록을 쌓아 보세요
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">불러오는 중…</div>
        ) : (
          <>
            <StudyStats sessions={sessions} />
            <ArchiveList
              sessions={sessions}
              onPlay={setActiveSession}
              onDelete={handleDelete}
              onRetake={handleRetake}
            />
          </>
        )}
      </div>
    </div>
  );
}
