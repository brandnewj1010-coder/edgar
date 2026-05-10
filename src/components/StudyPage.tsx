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
  BookMarked,
  Layers,
  ChevronDown,
} from "lucide-react";
import type { QuizItem, QuizSession, DisclosureSource, FinancialChartData } from "../types";
import {
  calcScore,
  createQuizSession,
  deleteQuizSession,
  loadQuizSessions,
  saveQuizSession,
} from "../lib/studyStorage";
import { FINANCIAL_TERMS } from "../data/financialTerms";

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
      const updated: QuizSession = { ...session, answers, score: calcScore({ ...session, answers }) };
      onComplete(updated);
      setShowResult(true);
    } else {
      setCurrent((c) => c + 1);
    }
  };

  const score = calcScore({ ...session, answers });
  const correctCount = session.questions.filter((q2, i) => answers[i] === q2.correctIndex).length;

  if (showResult) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Trophy className="mx-auto mb-4 h-12 w-12 text-amber-400" />
          <h3 className="text-2xl font-bold text-slate-900">퀴즈 완료!</h3>
          <p className="mt-1 text-slate-500">{session.query} ({session.source.toUpperCase()})</p>
          <div className="mt-6 flex justify-center gap-8">
            <div className="text-center">
              <p className="text-4xl font-bold text-indigo-600">{score}점</p>
              <p className="mt-1 text-sm text-slate-500">총점</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-emerald-600">{correctCount}/{session.questions.length}</p>
              <p className="mt-1 text-sm text-slate-500">정답</p>
            </div>
          </div>
          <div className="mt-8 space-y-3 text-left">
            {session.questions.map((q2, i) => {
              const ans = answers[i];
              const ok = ans === q2.correctIndex;
              return (
                <div key={i} className={`rounded-xl border p-4 ${ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
                  <div className="flex gap-2">
                    {ok ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{q2.question}</p>
                      {!ok && ans !== null && <p className="mt-1 text-xs text-rose-700">내 답: {q2.choices[ans]}</p>}
                      <p className={`mt-1 text-xs ${ok ? "text-emerald-700" : "text-slate-600"}`}>정답: {q2.choices[q2.correctIndex]}</p>
                      {q2.explanation && <p className="mt-1 text-xs text-slate-500">{q2.explanation}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={onBack} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
            <ArrowLeft className="h-4 w-4" />목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" />목록
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">{current + 1} / {session.questions.length}</span>
          <div className="flex gap-1">
            {session.questions.map((_, i) => (
              <div key={i} className={`h-2 w-6 rounded-full transition-colors ${
                i < current ? answers[i] === session.questions[i].correctIndex ? "bg-emerald-400" : "bg-rose-400"
                  : i === current ? "bg-indigo-500" : "bg-slate-200"
              }`} />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-indigo-400" />
          <span className="text-xs font-medium uppercase tracking-wide text-indigo-600">Q{current + 1}</span>
        </div>
        <p className="mt-2 text-base font-semibold leading-relaxed text-slate-900">{q.question}</p>
        <div className="mt-5 space-y-2.5">
          {q.choices.map((choice, idx) => {
            let cls = "flex w-full items-start gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-all ";
            if (!isAnswered) cls += "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer";
            else if (idx === q.correctIndex) cls += "border-emerald-400 bg-emerald-50 text-emerald-800";
            else if (idx === answers[current]) cls += "border-rose-400 bg-rose-50 text-rose-800";
            else cls += "border-slate-200 bg-slate-50 text-slate-400";
            return (
              <button key={idx} onClick={() => selectAnswer(idx)} disabled={isAnswered} className={cls}>
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  !isAnswered ? "bg-slate-100 text-slate-600"
                    : idx === q.correctIndex ? "bg-emerald-400 text-white"
                    : idx === answers[current] ? "bg-rose-400 text-white"
                    : "bg-slate-200 text-slate-400"
                }`}>{["A","B","C","D"][idx]}</span>
                <span className="leading-relaxed">{choice}</span>
              </button>
            );
          })}
        </div>
        {revealed && isAnswered && (
          <div className={`mt-4 rounded-xl p-3 text-sm ${isCorrect ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            <p className="font-medium">{isCorrect ? "✓ 정답입니다!" : `✗ 오답 — 정답: ${q.choices[q.correctIndex]}`}</p>
            {q.explanation && <p className="mt-1 text-xs opacity-80">{q.explanation}</p>}
          </div>
        )}
        {isAnswered && (
          <div className="mt-4 flex justify-end">
            <button onClick={handleNext} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
              {isLast ? "결과 보기" : "다음"}<ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 아카이브 목록 ──────────────────────────────────────────────────────────────
function ArchiveList({ sessions, onPlay, onDelete, onRetake }: {
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
        <p className="mt-1 text-sm text-slate-400">메인 화면에서 기업을 조회하면 퀴즈가 자동 생성됩니다</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {sessions.map((s) => {
        const isDone = s.score !== null;
        const answered = s.answers.filter((a) => a !== null).length;
        const date = new Date(s.at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
        return (
          <div key={s.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-indigo-700">{s.source}</span>
                {isDone ? (
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${(s.score ?? 0) >= 70 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{s.score}점</span>
                ) : answered > 0 ? (
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">진행 중 {answered}/{s.questions.length}</span>
                ) : null}
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-slate-800">{s.query}</p>
              <p className="flex items-center gap-1 text-xs text-slate-400"><Clock className="h-3 w-3" />{date} · {s.questions.length}문제</p>
            </div>
            <div className="flex gap-2">
              {isDone ? (
                <>
                  <button onClick={() => onPlay(s)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">결과 보기</button>
                  <button onClick={() => onRetake(s)} className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"><RotateCcw className="h-3 w-3" />다시 풀기</button>
                </>
              ) : (
                <button onClick={() => onPlay(s)} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">풀기 시작<ChevronRight className="h-3.5 w-3.5" /></button>
              )}
              <button onClick={() => onDelete(s.id)} className="rounded-lg border border-rose-200 px-2 py-1.5 text-xs text-rose-500 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
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
  const totalCorrect = done.reduce((sum, s) => s.questions.filter((q, i) => s.answers[i] === q.correctIndex).length + sum, 0);
  return (
    <div className="mb-5 grid grid-cols-3 gap-3">
      {[
        { label: "완료한 퀴즈", value: `${done.length}회` },
        { label: "평균 점수", value: `${avgScore}점` },
        { label: "누적 정답률", value: `${Math.round((totalCorrect / totalQ) * 100)}%` },
      ].map((stat) => (
        <div key={stat.label} className="rounded-xl border border-amber-200/70 bg-white/70 px-4 py-3 text-center">
          <p className="text-xl font-bold text-amber-700">{stat.value}</p>
          <p className="mt-0.5 text-xs text-slate-500">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── L.2 오늘의 미션 ────────────────────────────────────────────────────────────
const STATIC_QUIZ: QuizItem = {
  question: '"잉여현금흐름(FCF)"의 일반적 계산식은?',
  choices: ["매출 − 매출원가 − 판관비", "영업활동현금흐름 − CapEx", "당기순이익 + 감가상각비", "영업이익 × (1 − 세율)"],
  correctIndex: 1,
  explanation: "FCF = 영업CF − 설비투자(CapEx). 배당·부채 상환의 실질 여력을 봅니다.",
};

function DailyMission({ pendingQuiz, onStartPendingQuiz, lastQuery }: {
  pendingQuiz?: { source: DisclosureSource; query: string; questions: QuizItem[] } | null;
  onStartPendingQuiz?: () => void;
  lastQuery?: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const quiz = pendingQuiz?.questions[0] ?? STATIC_QUIZ;
  const companyName = pendingQuiz?.query ?? lastQuery ?? null;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700">L.2</span>
        <h2 className="text-[13px] font-semibold text-slate-700">오늘의 미션 — 5분</h2>
        <span className="text-[11px] text-slate-400">개념 한 컷 + 공시 발췌 + 빠른 퀴즈로 마무리</span>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-amber-300 p-6" style={{ background: "linear-gradient(180deg, #fffaf0 0%, #fef3c7 100%)" }}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {companyName && (
              <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                📊 {companyName}
              </span>
            )}
            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">현금흐름</span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">난이도 ★★☆</span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">5분</span>
          </div>
          <h3 className="text-[20px] font-bold leading-snug text-amber-950">
            {pendingQuiz
              ? `"${pendingQuiz.query}" 분석 퀴즈가 도착했어요`
              : companyName
              ? `"${companyName}" 공시로 배우는 재무 핵심`
              : "영업이익 ≠ 영업현금흐름. 왜 둘이 다른가요?"}
          </h3>
          <p className="mt-3 text-[14px] leading-relaxed text-amber-900/90">
            {pendingQuiz
              ? `${pendingQuiz.query} 조회 결과를 바탕으로 AI가 퀴즈를 생성했습니다. ${pendingQuiz.questions.length}문항에 도전해 보세요!`
              : "영업이익과 영업활동현금흐름 사이의 갭 이유 3가지를 알면 발생주의·현금주의의 핵심이 잡힙니다."}
          </p>
          <ol className="mt-5 grid grid-cols-1 gap-2 text-[12px] md:grid-cols-3">
            {[
              { title: "1. 핵심 개념 1컷", sub: "감가상각·운전자본 세 가지" },
              { title: "2. 공시 발췌 보기", sub: "현금흐름표 구조 파악" },
              { title: "3. 빠른 퀴즈 → 한 줄 정리", sub: "아래에서 바로 풀어 보기" },
            ].map((step) => (
              <li key={step.title} className="rounded-lg border border-amber-200 bg-white/80 px-3 py-2">
                <div className="font-semibold text-amber-900">{step.title}</div>
                <div className="mt-0.5 text-slate-600">{step.sub}</div>
              </li>
            ))}
          </ol>

          {/* 빠른 퀴즈 */}
          <div className="mt-5 rounded-xl border border-amber-200 bg-white/90 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[11px] font-semibold text-amber-700">🎯 빠른 퀴즈 1문항</span>
              {companyName && <span className="text-[10px] text-slate-400">{companyName} 공시 기반</span>}
            </div>
            <p className="mb-3 text-[13px] font-semibold text-slate-900">{quiz.question}</p>
            <div className="space-y-1.5">
              {quiz.choices.map((choice, idx) => {
                let cls = "block w-full rounded-lg border px-3 py-2 text-left text-[12.5px] transition-all ";
                if (selected === null) cls += "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 cursor-pointer";
                else if (idx === quiz.correctIndex) cls += "border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold";
                else if (idx === selected) cls += "border-rose-300 bg-rose-50 text-rose-800";
                else cls += "border-slate-200 bg-white text-slate-400";
                return (
                  <button key={idx} className={cls} disabled={selected !== null} onClick={() => setSelected(idx)}>
                    {["①","②","③","④"][idx]} {choice}
                    {selected !== null && idx === quiz.correctIndex && " ✓"}
                  </button>
                );
              })}
            </div>
            {selected !== null && quiz.explanation && (
              <p className={`mt-2 text-[11px] ${selected === quiz.correctIndex ? "text-emerald-700" : "text-rose-700"}`}>
                {selected === quiz.correctIndex ? "✓ 정답! " : `✗ 정답: ${quiz.choices[quiz.correctIndex]}. `}{quiz.explanation}
              </p>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-[12px]">
            {pendingQuiz && onStartPendingQuiz ? (
              <button onClick={onStartPendingQuiz} className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-amber-700">
                ▶ 전체 퀴즈 풀기 ({pendingQuiz.questions.length}문항)
              </button>
            ) : (
              <button className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-amber-700">▶ 미션 시작</button>
            )}
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-500 hover:bg-slate-50">건너뛰기</button>
          </div>
        </div>

        {/* 어제·내일 */}
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="mb-1 text-[11px] font-semibold text-emerald-700">✅ 어제의 미션</div>
            <div className="text-[13px] font-semibold text-slate-800">"감가상각비는 왜 비용인데 현금이 안 나가나?"</div>
            <div className="mt-1 text-[11px] text-emerald-700">3/3 정답</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-1 text-[11px] font-semibold text-amber-700">🔜 내일 예고</div>
            <div className="text-[13px] font-semibold text-slate-800">"운전자본이 늘면 왜 현금이 줄까?"</div>
            <div className="mt-1 text-[11px] text-slate-500">현금흐름 카테고리 · 4분</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── L.4 용어 도감 ─────────────────────────────────────────────────────────────
const TERM_CATS: Record<string, string> = {};
const CAT_RANGES: Array<[string, number, number]> = [
  ["매출·손익", 0, 12],
  ["현금흐름", 13, 17],
  ["재무상태표", 18, 30],
  ["수익성·밸류", 31, 42],
  ["성장·비교", 43, 50],
  ["공시·보고서", 51, 65],
  ["리스크", 66, 80],
];
CAT_RANGES.forEach(([cat, start, end]) => {
  FINANCIAL_TERMS.slice(start, end + 1).forEach((t) => { TERM_CATS[t.term] = cat; });
});

function GlossarySection() {
  const [activeCategory, setActiveCategory] = useState("전체");
  const [expanded, setExpanded] = useState(false);
  const categories = ["전체", ...CAT_RANGES.map(([cat]) => cat)];
  const filtered = activeCategory === "전체" ? FINANCIAL_TERMS : FINANCIAL_TERMS.filter((t) => TERM_CATS[t.term] === activeCategory);
  const visible = expanded ? filtered : filtered.slice(0, 8);

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700">L.4</span>
        <h2 className="text-[13px] font-semibold text-slate-700">용어 도감 · {FINANCIAL_TERMS.length}개</h2>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-1.5 text-[11px]">
          {categories.map((cat) => (
            <button key={cat} onClick={() => { setActiveCategory(cat); setExpanded(false); }}
              className={`rounded-full px-2.5 py-1 font-medium transition-colors ${activeCategory === cat ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {cat}{cat === "전체" ? ` ${FINANCIAL_TERMS.length}` : ""}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((term) => (
            <div key={term.term} className="group cursor-pointer rounded-lg border border-slate-200 p-3 transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50">
              <div className="flex items-start justify-between gap-1">
                <div className="text-[13px] font-bold leading-tight text-slate-900">{term.term}</div>
                {TERM_CATS[term.term] && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">{TERM_CATS[term.term]}</span>
                )}
              </div>
              <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">{term.meaning}</div>
              {term.formula && (
                <div className="mt-1.5 rounded bg-amber-50 px-1.5 py-0.5 font-mono text-[10px] text-amber-800 group-hover:bg-white/70">{term.formula}</div>
              )}
            </div>
          ))}
        </div>
        <button onClick={() => setExpanded((v) => !v)}
          className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg border border-amber-200 bg-amber-50/50 py-2 text-[12px] font-semibold text-amber-800 hover:bg-amber-100">
          {expanded ? "접기" : `전체 용어 도감 열기 (${filtered.length}개) →`}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>
    </section>
  );
}

// ─── L.6 공시 읽기 워크북 ─────────────────────────────────────────────────────
const STEP_REFLECTIONS = [
  {
    question: "영업이익이 전년 대비 어떻게 변했나요? 매출과 비용 중 어느 쪽이 더 영향을 줬을까요?",
    hint: "매출 변화와 비용 변화를 따로 살펴보세요.",
    example: "매출이 소폭 늘었는데 영업이익이 줄었다면, 비용(인건비·원재료·감가상각)이 더 빠르게 늘어난 것입니다. 매출 성장보다 비용 효율이 핵심입니다.",
  },
  {
    question: "영업이익과 영업활동현금흐름 중 어느 쪽이 더 크고, 그 차이는 왜 생길까요?",
    hint: "감가상각비·운전자본 변동을 떠올려 보세요.",
    example: "감가상각 같은 비현금 비용이 크면 영업CF > 영업이익입니다. 반대로 매출채권·재고가 급증했다면 현금이 묶여 영업CF < 영업이익이 됩니다. 두 수치의 차이 = '이익의 현금화율'입니다.",
  },
  {
    question: "재고자산이나 매출채권이 크게 늘었다면, 현금흐름에 어떤 영향을 미칠까요?",
    hint: "재고 증가 = 현금 묶임, 매출채권 증가 = 아직 못 받은 돈",
    example: "재고가 늘면 운전자본 증가 → 영업CF 감소. 매출채권이 늘면 매출은 인식됐지만 현금은 미수 → 역시 영업CF 감소. 반대로 매입채무 증가는 지급 지연 → 영업CF에 긍정적입니다.",
  },
  {
    question: "부채비율과 이자보상배율을 보고, 이 기업의 재무 안정성을 한 문장으로 평가해 보세요.",
    hint: "부채비율 100% 이하 + 이자보상배율 3배 이상이면 일반적으로 안전권입니다.",
    example: "부채비율이 낮고 이자보상배율이 3배 이상이면 '재무 안정성 양호'입니다. 반대로 이자보상배율이 1.5배 이하라면 이자 지급 여력이 부족해 위험 신호로 볼 수 있습니다.",
  },
  {
    question: "수익성·성장성·안정성 키워드를 활용해 이 기업을 한 줄로 요약해 보세요.",
    hint: "핵심 수치 하나씩 + 한계 또는 리스크로 마무리하세요.",
    example: `"(기업)은 (연도) 기준 매출 (성장/감소)세, 영업이익률 (X)%로 (높은/낮은) 수익성을 유지하고 있으나, 부채비율 (Y)%로 (안정적/부담되는) 재무구조를 가지며, 핵심 리스크는 (OOO)입니다."`,
  },
];

function WorkbookSection({ corpName }: { corpName: string }) {
  const [step, setStep] = useState(0);
  const [showExample, setShowExample] = useState(false);

  const steps = [
    { title: `${corpName} 영업이익 흐름 파악`, sub: "손익계산서에서 연도별 영업이익 변화 찾기" },
    { title: "현금흐름 vs 이익 비교", sub: "왜 현금은 무사한가? 감가상각의 마법" },
    { title: "재고자산·비용 구조 발견", sub: "주석에서 핵심 변동 항목 찾기" },
    { title: "재무건전성 진단", sub: "부채비율·이자보상배율로 위기인가 확인" },
    { title: "한 줄 결론 쓰기", sub: "수익성·성장성·안정성 세 키워드 활용" },
  ];
  const reflection = STEP_REFLECTIONS[step];

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700">L.6</span>
        <h2 className="flex items-center gap-1 text-[13px] font-semibold text-slate-700">
          <BookMarked className="h-3.5 w-3.5 text-amber-600" />
          공시 읽기 워크북
        </h2>
        <span className="ml-auto text-[11px] text-slate-400">{corpName} 사업보고서</span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-5">
          {/* 단계 트레이 */}
          <div className="border-b border-amber-100 bg-amber-50/40 p-5 lg:col-span-2 lg:border-b-0 lg:border-r">
            <div className="mb-3 text-[11px] font-semibold text-amber-700">단계 {step + 1} / {steps.length}</div>
            <ol className="space-y-3">
              {steps.map((s, i) => (
                <li key={i} className={`flex cursor-pointer gap-3 rounded-lg p-1.5 transition-colors hover:bg-amber-100/50 ${i !== step ? "opacity-50" : ""}`}
                  onClick={() => { setStep(i); setShowExample(false); }}>
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                    i < step ? "bg-emerald-400 text-white" : i === step ? "bg-amber-600 text-white" : "border border-slate-300 bg-white text-slate-500"
                  }`}>{i < step ? "✓" : i + 1}</div>
                  <div>
                    <div className="text-[13px] font-bold text-amber-950">{s.title}</div>
                    <div className="mt-0.5 text-[11px] text-slate-600">{s.sub}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* 콘텐츠 */}
          <div className="p-6 lg:col-span-3">
            <div className="text-[11px] font-semibold text-amber-700">단계 {step + 1}</div>
            <h3 className="mt-1 text-[18px] font-bold leading-snug text-slate-900">{steps[step].title}</h3>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-700">
              {corpName}의 사업보고서에서 핵심 수치를 찾아봅니다.
              리포트 탭의 차트와 비교하면서 수치의 의미를 해석해 보세요.
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 text-[10px] font-semibold text-slate-500">📄 학습 포인트</div>
              <p className="text-[13px] leading-relaxed text-slate-800">
                <mark className="rounded bg-amber-200/60 px-1">{corpName}</mark>의 차트를 확인하고,
                영업이익·현금흐름·부채비율 세 지표가 어떻게 연결되는지 살펴보세요.
                <mark className="rounded bg-rose-200/60 px-1">전년 대비 큰 변화</mark>가 있다면 이유를 먼저 생각해 보세요.
              </p>
            </div>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="mb-2 text-[12px] font-semibold text-amber-900">🤔 한 번 생각해 봐요</div>
              <p className="mb-1 text-[13px] text-amber-900">{reflection.question}</p>
              <p className="text-[11px] text-amber-700">힌트: {reflection.hint}</p>
              <button
                onClick={() => setShowExample((v) => !v)}
                className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                {showExample ? "▲ 예시 답안 접기" : "▼ 예시 답안 보기"}
              </button>
              {showExample && (
                <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-[12px] leading-relaxed text-indigo-900">
                  {reflection.example}
                </div>
              )}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <button onClick={() => { setStep((s) => Math.max(0, s - 1)); setShowExample(false); }} disabled={step === 0}
                className="rounded-lg px-4 py-2 text-[12px] text-slate-500 hover:bg-slate-100 disabled:opacity-40">← 이전</button>
              <button onClick={() => { setStep((s) => Math.min(steps.length - 1, s + 1)); setShowExample(false); }} disabled={step === steps.length - 1}
                className="rounded-lg bg-amber-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-40">다음 단계 →</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 메인 StudyPage ────────────────────────────────────────────────────────────
interface StudyPageProps {
  pendingQuiz?: { source: DisclosureSource; query: string; questions: QuizItem[] } | null;
  onClearPending?: () => void;
  lastQuery?: string;
  lastChartData?: FinancialChartData | null;
}

export function StudyPage({ pendingQuiz, onClearPending, lastQuery, lastChartData }: StudyPageProps) {
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [activeSession, setActiveSession] = useState<QuizSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showArchive, setShowArchive] = useState(false);

  const corpName = lastChartData?.corp ?? pendingQuiz?.query ?? lastQuery ?? "삼성전자";

  useEffect(() => {
    setLoading(true);
    loadQuizSessions().then((s) => { setSessions(s); setLoading(false); });
  }, []);

  const handleComplete = useCallback(async (updated: QuizSession) => {
    await saveQuizSession(updated);
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setActiveSession(updated);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await deleteQuizSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleRetake = useCallback(async (s: QuizSession) => {
    const fresh = createQuizSession(s.source, s.query, s.questions);
    await saveQuizSession(fresh);
    setSessions((prev) => [fresh, ...prev]);
    setActiveSession(fresh);
  }, []);

  if (activeSession) {
    return (
      <div className="min-h-full bg-[#fdfaf3] px-4 py-6 md:px-8 md:py-8">
        <QuizPlayer session={activeSession} onComplete={handleComplete} onBack={() => setActiveSession(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#fdfaf3] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-5xl">
        {/* 헤더 */}
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
            <BookOpen className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">학습 모드</h1>
            <p className="text-xs text-amber-700">
              {lastQuery ? `"${lastQuery}" 공시 기반 학습` : "DART·EDGAR로 회계 공부"}
            </p>
          </div>
        </div>

        <DailyMission
          pendingQuiz={pendingQuiz ?? null}
          lastQuery={lastQuery}
          onStartPendingQuiz={
            pendingQuiz
              ? () => {
                  const session = createQuizSession(pendingQuiz.source, pendingQuiz.query, pendingQuiz.questions);
                  saveQuizSession(session).then(() => {
                    setSessions((prev) => [session, ...prev]);
                    setActiveSession(session);
                    onClearPending?.();
                  });
                }
              : undefined
          }
        />

        <GlossarySection />
        <WorkbookSection corpName={corpName} />

        {/* 스터디 아카이브 */}
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">불러오는 중…</div>
        ) : (
          <section>
            <button onClick={() => setShowArchive((v) => !v)}
              className="mb-4 flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-left shadow-sm hover:bg-slate-50">
              <Layers className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-semibold text-slate-700">스터디 아카이브</span>
              {sessions.length > 0 && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">{sessions.length}</span>
              )}
              <ChevronDown className={`ml-auto h-4 w-4 text-slate-400 transition-transform ${showArchive ? "rotate-180" : ""}`} />
            </button>
            {showArchive && (
              <div className="space-y-4">
                <StudyStats sessions={sessions} />
                <ArchiveList sessions={sessions} onPlay={setActiveSession} onDelete={handleDelete} onRetake={handleRetake} />
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
