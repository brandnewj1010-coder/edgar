import type { ReactNode } from "react";

/** 인쇄물·브로슈어 느낌의 리포트 용지 */
export function ReportDocument({ children }: { children: ReactNode }) {
  return (
    <div className="report-sheet group">
      {/* 미세 노이즈 질감 */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[0.35]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-[1.35rem] border border-stone-200/90 bg-[#fcfbfa] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_28px_64px_-20px_rgba(15,23,42,0.12)]">
        <div
          className="h-[5px] w-full bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600"
          aria-hidden
        />
        <div className="relative px-7 py-10 md:px-12 md:py-12 lg:px-14 lg:py-14">
          {/* 상단 장식 라인 */}
          <div
            className="pointer-events-none absolute left-8 right-8 top-0 h-px bg-gradient-to-r from-transparent via-stone-300/60 to-transparent md:left-12 md:right-12"
            aria-hidden
          />
          <div className="relative">{children}</div>
        </div>
      </div>
    </div>
  );
}
