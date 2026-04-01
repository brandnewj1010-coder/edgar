import { ChevronDown, ChevronUp, Coins, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatKrwCompact, formatKrwWon } from "../lib/formatKrw";
import { extractUsdAmounts } from "../lib/usdExtract";

async function fetchKrwPerUsd(): Promise<{
  krwPerUsd: number;
  source: string;
} | null> {
  try {
    const r = await fetch("/api/fx");
    if (r.ok) {
      const j = (await r.json()) as {
        krwPerUsd?: number;
        source?: string;
      };
      if (typeof j.krwPerUsd === "number" && j.krwPerUsd > 100) {
        return { krwPerUsd: j.krwPerUsd, source: j.source ?? "api" };
      }
    }
  } catch {
    /* 로컬 Vite만 쓸 때 등 */
  }

  try {
    const r = await fetch(
      "https://api.exchangerate.host/latest?base=USD&symbols=KRW",
    );
    if (r.ok) {
      const j = (await r.json()) as { rates?: { KRW?: number } };
      const k = j.rates?.KRW;
      if (typeof k === "number" && k > 100) {
        return { krwPerUsd: k, source: "exchangerate.host" };
      }
    }
  } catch {
    /* ignore */
  }

  return null;
}

export function KrwAssistView({ reportMarkdown }: { reportMarkdown: string }) {
  const [open, setOpen] = useState(true);
  const [rate, setRate] = useState<number | null>(null);
  const [rateSource, setRateSource] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRate = useCallback(async () => {
    setLoading(true);
    setError(null);
    const got = await fetchKrwPerUsd();
    if (got) {
      setRate(got.krwPerUsd);
      setRateSource(got.source);
    } else {
      setError("시세를 불러오지 못했습니다. 아래에 환율을 직접 입력해 보세요.");
      setRate(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRate();
  }, [loadRate]);

  const effectiveRate = useMemo(() => {
    const m = manual.trim().replace(/,/g, "");
    const n = parseFloat(m);
    if (Number.isFinite(n) && n > 100 && n < 50000) return n;
    return rate;
  }, [manual, rate]);

  const items = useMemo(
    () => extractUsdAmounts(reportMarkdown, 35),
    [reportMarkdown],
  );

  if (!items.length) {
    return (
      <div className="mb-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-xs leading-relaxed text-slate-500">
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
          <Coins className="h-3.5 w-3.5 text-amber-600" />
          한화 환산
        </span>
        <p className="mt-1.5">
          이 리포트에서 달러($ / USD) 표기를 찾지 못했습니다. EDGAR 등 달러
          단위 본문이 있으면 자동으로 목록을 만듭니다.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-amber-50/80"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-amber-950">
          <Coins className="h-4 w-4 shrink-0 text-amber-600" />
          달러 → 한화 보기
          <span className="text-[11px] font-normal text-amber-800/90">
            (익숙한 금액 감각용)
          </span>
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-amber-700" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-amber-700" />
        )}
      </button>

      {open ? (
        <div className="space-y-3 border-t border-amber-100/90 px-4 pb-4 pt-1">
          <div className="flex flex-wrap items-end gap-3 text-xs">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="fx-manual"
                className="mb-1 block font-medium text-slate-600"
              >
                적용 환율 (원화 ÷ 1달러)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id="fx-manual"
                  type="text"
                  inputMode="decimal"
                  placeholder={
                    effectiveRate
                      ? String(Math.round(effectiveRate))
                      : "예: 1380"
                  }
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  className="w-36 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
                />
                <button
                  type="button"
                  onClick={() => void loadRate()}
                  disabled={loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
                  />
                  시세 다시
                </button>
              </div>
              {loading ? (
                <p className="mt-1 text-[11px] text-slate-400">시세 조회 중…</p>
              ) : effectiveRate ? (
                <p className="mt-1 text-[11px] text-slate-500">
                  1 USD ≈{" "}
                  <span className="font-mono font-medium text-slate-700">
                    {Math.round(effectiveRate).toLocaleString("ko-KR")}
                  </span>
                  원
                  {manual.trim() ? (
                    <span className="text-amber-700"> · 직접 입력값</span>
                  ) : rateSource ? (
                    <span> · {rateSource}</span>
                  ) : null}
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-rose-600">{error}</p>
              )}
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500">
            아래 금액은 본문에서 <strong className="text-slate-600">자동 추출</strong>
            한 것입니다. 표 제목에 “in millions”처럼 단위가 따로 있으면 실제와
            다를 수 있으니, 원문 표기와 함께 확인해 주세요.
          </p>

          <ul className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-slate-100 bg-white/90 p-3 text-xs">
            {items.map((it, i) => {
              const krw =
                effectiveRate != null ? it.usd * effectiveRate : null;
              return (
                <li
                  key={i}
                  className="border-b border-slate-50 pb-2 last:border-0 last:pb-0"
                >
                  <p className="font-mono text-[11px] text-slate-500">
                    {it.raw}
                  </p>
                  {krw != null ? (
                    <p className="mt-1 font-medium text-slate-900">
                      ≈ {formatKrwCompact(krw)}{" "}
                      <span className="text-[11px] font-normal text-slate-500">
                        ({formatKrwWon(krw)})
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 text-amber-800">
                      환율을 입력하면 한화로 표시됩니다.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
