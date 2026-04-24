"use client";

import { Check, X, Flame } from "lucide-react";
import { useEarningsSurprises } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * Earnings-surprises card — a single punch-line at the top ("beats 7
 * of last 10 · 3-quarter streak") plus a dense per-quarter row list
 * below it. Lives in the Fundamentals deep-dive next to DCF + quant
 * scores. Silently hides if FMP has no surprise history for the ticker.
 *
 * This is the card that earns Lens thesis lines like "beats 8 of last
 * 10 quarters" — that narrative is a first-class moat vs. Danelfin /
 * Kavout who only surface aggregate AI scores.
 */
export function EarningsSurprisesCard({ ticker, className }: { ticker: string; className?: string }) {
  const { data } = useEarningsSurprises(ticker, 10);
  if (!data || data.quartersReviewed === 0) return null;

  const { beats, misses, quartersReviewed, beatRatePct, avgSurprisePct, streak, quarters } = data;
  const streakTone = streak >= 3 ? "text-up" : streak <= -2 ? "text-down" : "text-ink-600";
  const beatTone = beatRatePct >= 70 ? "text-up" : beatRatePct >= 50 ? "text-ink-900" : "text-down";

  return (
    <div className={cn("rounded-[10px] border border-ink-200 bg-ink-0 p-4 md:p-5", className)}>
      <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600 mb-3">
        Earnings surprises · last {quartersReviewed} quarters
      </div>

      {/* Punch line */}
      <div className="flex items-baseline gap-3 flex-wrap mb-4">
        <div className={cn("font-[var(--font-heading)] text-[22px] font-bold leading-none tracking-[-0.01em]", beatTone)}>
          {beats} <span className="text-ink-500 font-normal text-[14px]">of {quartersReviewed} beats</span>
        </div>
        <span className={cn("font-mono text-[13px] font-semibold", beatTone)}>
          {beatRatePct.toFixed(0)}% beat rate
        </span>
        <span className="text-ink-400 text-[12px]">·</span>
        <span className="font-mono text-[12px] text-ink-700">
          avg surprise {avgSurprisePct >= 0 ? "+" : ""}{avgSurprisePct.toFixed(1)}%
        </span>
      </div>

      {/* Streak callout */}
      {Math.abs(streak) >= 2 && (
        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3 font-mono text-[11px] font-semibold",
          streak > 0 ? "bg-up/10" : "bg-down/10", streakTone)}>
          {streak > 0 ? <Flame className="h-3 w-3" strokeWidth={2} /> : <X className="h-3 w-3" strokeWidth={2} />}
          {streak > 0 ? `${streak}-quarter beat streak` : `Missed ${Math.abs(streak)} in a row`}
        </div>
      )}

      {/* Per-quarter rows */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
        {quarters.slice().reverse().map((q) => (
          <QuarterCell key={q.reportDate} row={q} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-ink-500 font-mono mt-1.5">
        <span>{formatShortDate(quarters[quarters.length - 1]?.reportDate)}</span>
        <span>{formatShortDate(quarters[0]?.reportDate)} (latest)</span>
      </div>

      <p className="mt-3 text-[10px] text-ink-500 leading-tight">
        Quarterly estimate vs. actual, sourced from FMP. Each cell tinted green
        when actual &gt; estimate, red when missed. Educational reference only.
      </p>
    </div>
  );
}

function QuarterCell({ row }: { row: { reportDate: string; surprisePct: number | null; beat: boolean } }) {
  const pct = row.surprisePct;
  const tone = row.beat ? "bg-up text-ink-0" : "bg-down text-ink-0";
  const title = pct != null
    ? `${formatShortDate(row.reportDate)} · ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`
    : formatShortDate(row.reportDate);
  return (
    <div
      className={cn("aspect-square rounded-[4px] grid place-items-center font-mono text-[10px] font-semibold", tone)}
      title={title}
    >
      {row.beat ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <X className="h-3.5 w-3.5" strokeWidth={3} />}
    </div>
  );
}

function formatShortDate(d: string | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-US", { year: "2-digit", month: "short" });
}
