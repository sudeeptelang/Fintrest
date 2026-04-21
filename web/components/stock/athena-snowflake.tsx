"use client";

import type { StockSnapshot, SignalBreakdown } from "@/lib/api";

// v2 atom 8h — Fundamental scorecard
// Ported from the v1 radar "snowflake" to the v2 bar-row layout. The 5 scoring
// functions are preserved; only presentation changes. Axis rename:
//   Value → Valuation · Growth → Growth · Past → Performance
//   Health → Fin. health · Income → Dividend
// Scores are normalized from the old 0–6 scale to 0–100 for display.
//
// Peer markers are placeholder (at sector median ≈ 55% of bar) until sector-peer
// medians are wired from the backend. Marker can be hidden via peerMedian=null.

type ScorecardInput = {
  snapshot: StockSnapshot;
  breakdown?: SignalBreakdown | null;
  dividendYield?: number | null;
};

function scoreValuation(s: StockSnapshot): number {
  const pe = s.peRatio ?? s.forwardPe;
  const pb = s.priceToBook;
  const peg = s.pegRatio;
  let score = 0;
  if (pe !== null && pe !== undefined) {
    if (pe < 12) score += 2;
    else if (pe < 20) score += 1.5;
    else if (pe < 30) score += 0.75;
  }
  if (peg !== null && peg !== undefined) {
    if (peg < 1) score += 2;
    else if (peg < 1.5) score += 1.25;
    else if (peg < 2) score += 0.5;
  }
  if (pb !== null && pb !== undefined) {
    if (pb < 2) score += 2;
    else if (pb < 4) score += 1;
    else if (pb < 8) score += 0.25;
  }
  return Math.min(6, score);
}

function scoreGrowth(s: StockSnapshot): number {
  let score = 0;
  if (s.revenueGrowth !== null) {
    if (s.revenueGrowth > 25) score += 3;
    else if (s.revenueGrowth > 10) score += 2;
    else if (s.revenueGrowth > 0) score += 1;
  }
  if (s.epsGrowth !== null) {
    if (s.epsGrowth > 25) score += 3;
    else if (s.epsGrowth > 10) score += 2;
    else if (s.epsGrowth > 0) score += 1;
  }
  return Math.min(6, score);
}

function scorePerformance(s: StockSnapshot): number {
  let score = 0;
  if (s.perfYear !== null) {
    if (s.perfYear > 30) score += 3;
    else if (s.perfYear > 10) score += 2;
    else if (s.perfYear > 0) score += 1;
  }
  if (s.perfQuarter !== null) {
    if (s.perfQuarter > 10) score += 2;
    else if (s.perfQuarter > 0) score += 1;
  }
  if (s.week52RangePct !== null && s.week52RangePct > 70) score += 1;
  return Math.min(6, score);
}

function scoreFinHealth(s: StockSnapshot): number {
  let score = 0;
  if (s.debtToEquity !== null) {
    if (s.debtToEquity < 0.5) score += 2;
    else if (s.debtToEquity < 1) score += 1.25;
    else if (s.debtToEquity < 2) score += 0.5;
  }
  if (s.operatingMargin !== null) {
    if (s.operatingMargin > 0.25) score += 2;
    else if (s.operatingMargin > 0.12) score += 1.25;
    else if (s.operatingMargin > 0) score += 0.5;
  }
  if (s.returnOnEquity !== null) {
    if (s.returnOnEquity > 0.2) score += 2;
    else if (s.returnOnEquity > 0.1) score += 1.25;
    else if (s.returnOnEquity > 0) score += 0.5;
  }
  return Math.min(6, score);
}

function scoreDividend(dividendYield: number | null | undefined): number {
  const y = dividendYield ?? 0;
  if (y >= 5) return 6;
  if (y >= 4) return 5;
  if (y >= 3) return 4;
  if (y >= 2) return 3;
  if (y >= 1) return 2;
  if (y > 0) return 1;
  return 0;
}

type VerdictTone = "strong" | "med" | "weak";

function verdictFor(axis: string, score: number): { label: string; tone: VerdictTone } {
  // score is 0–6; threshold mapping mirrors v2 preview (Elite/Strong/Average/Stretched/Low).
  if (score >= 4.5) return { label: axis === "Dividend" ? "Strong yield" : "Elite", tone: "strong" };
  if (score >= 3.5) return { label: "Strong", tone: "strong" };
  if (score >= 2.5) return { label: "Average", tone: "med" };
  if (score >= 1.5) return { label: axis === "Valuation" ? "Stretched" : "Mixed", tone: "weak" };
  return { label: axis === "Dividend" ? "Low yield" : "Weak", tone: "weak" };
}

export function AthenaSnowflake({ snapshot, dividendYield }: ScorecardInput) {
  const rows = [
    { axis: "Valuation",   score: scoreValuation(snapshot) },
    { axis: "Growth",      score: scoreGrowth(snapshot) },
    { axis: "Performance", score: scorePerformance(snapshot) },
    { axis: "Fin. health", score: scoreFinHealth(snapshot) },
    { axis: "Dividend",    score: scoreDividend(dividendYield) },
  ];

  return (
    <div className="rounded-xl border border-ink-200 bg-ink-0 p-6 sm:p-7">
      {/* Header — Sora 600 14px / body-sm 12/18 */}
      <div className="mb-5">
        <h3 className="font-[var(--font-heading)] text-[14px] font-semibold text-ink-900 leading-none mb-1">
          Fundamental scorecard
        </h3>
        <p className="text-[12px] leading-[18px] text-ink-500">
          Five-dimensional profile · bar = score · peer marker = sector median
        </p>
      </div>

      <div className="space-y-0">
        {rows.map((r, i) => {
          const pct = Math.round((r.score / 6) * 100);
          const tone: VerdictTone =
            r.score >= 4 ? "strong" : r.score >= 2.5 ? "med" : "weak";
          const verdict = verdictFor(r.axis, r.score);
          const barFill =
            tone === "strong"
              ? "bg-[color:var(--up)]"
              : tone === "med"
              ? "bg-ink-500"
              : "bg-ink-300";
          const verdictColor =
            verdict.tone === "strong"
              ? "text-[color:var(--up)]"
              : verdict.tone === "weak"
              ? "text-[color:var(--down)]"
              : "text-ink-500";
          return (
            <div
              key={r.axis}
              className="grid grid-cols-[120px_1fr_48px_72px] sm:grid-cols-[140px_1fr_60px_80px] gap-5 items-center py-2.5"
              style={i > 0 ? { borderTop: "1px solid var(--ink-100)" } : undefined}
            >
              {/* Label — DM Sans 600 11px/0.08em UPPERCASE ink-700 */}
              <div className="text-[11px] font-semibold leading-none text-ink-700 tracking-[0.08em] uppercase">
                {r.axis}
              </div>
              {/* Bar + peer marker */}
              <div className="relative h-2 bg-ink-100 rounded">
                <div
                  className={`absolute inset-y-0 left-0 rounded ${barFill}`}
                  style={{ width: `${pct}%` }}
                />
                {/* Peer marker at ~55% (placeholder until sector median wired) */}
                <div
                  className="absolute -top-1 -bottom-1 w-[2px] bg-ink-800 rounded-[1px]"
                  style={{ left: "55%" }}
                  aria-hidden
                />
              </div>
              {/* Score — DM Mono 500 14px ink-900 right-align */}
              <div className="font-[var(--font-mono)] text-[14px] font-medium text-ink-900 text-right tabular-nums">
                {pct}/100
              </div>
              {/* Verdict — DM Sans 600 10px/0.12em UPPERCASE */}
              <div className={`text-[10px] font-semibold tracking-[0.12em] uppercase text-right ${verdictColor}`}>
                {verdict.label}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-ink-500 leading-relaxed mt-5 pt-4 border-t border-ink-100">
        Derived from fundamentals, growth, performance, health &amp; income signals. Peer marker is a placeholder until sector median is wired.
      </p>
    </div>
  );
}
