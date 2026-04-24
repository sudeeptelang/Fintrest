"use client";

import { cn } from "@/lib/utils";
import type { SignalBreakdown } from "@/lib/api";

/**
 * "What's driving today" — horizontal chip row showing per-factor
 * contribution to the composite, ranked by impact. Appears between
 * the ticker hero and the factor breakdown panel. The strip turns
 * the static 8-factor radar into a daily narrative: which factors
 * are carrying the score, which are dragging it.
 *
 * For MVP we approximate "contribution vs. baseline (50)" since the
 * backend doesn't yet persist yesterday's per-factor scores.
 * Swaps to real day-over-day delta once score_history ships.
 */

type Family = "technical" | "fundamentals" | "sentiment" | "smart";

type FactorContribution = {
  label: string;
  delta: number;
  family: Family;
};

const FAMILY_STYLE: Record<Family, { chipPos: string; chipNeg: string }> = {
  technical:    { chipPos: "bg-navy-light text-navy border-navy",        chipNeg: "bg-ink-50 text-ink-700 border-ink-300" },
  fundamentals: { chipPos: "bg-amber-light text-amber border-amber",     chipNeg: "bg-ink-50 text-ink-700 border-ink-300" },
  sentiment:    { chipPos: "bg-plum-light text-plum border-plum",        chipNeg: "bg-ink-50 text-ink-700 border-ink-300" },
  smart:        { chipPos: "bg-teal-light text-teal border-teal",        chipNeg: "bg-ink-50 text-ink-700 border-ink-300" },
};

export function DrivingToday({
  breakdown,
  composite,
  className,
}: {
  breakdown: SignalBreakdown;
  composite: number;
  className?: string;
}) {
  // Contribution = factor score - 50 (baseline). Positive → pushing
  // composite up, negative → dragging it down. Sorted by absolute
  // magnitude so the biggest story is first.
  const contribs: FactorContribution[] = ([
    { label: "Momentum",  delta: breakdown.momentumScore     - 50, family: "technical" as const },
    { label: "Trend",     delta: breakdown.trendScore        - 50, family: "technical" as const },
    { label: "Rel Vol",   delta: breakdown.relVolumeScore    - 50, family: "technical" as const },
    { label: "News",      delta: breakdown.newsScore         - 50, family: "sentiment" as const },
    { label: "Sentiment", delta: breakdown.sentimentScore    - 50, family: "sentiment" as const },
    { label: "Earnings",  delta: breakdown.fundamentalsScore - 50, family: "fundamentals" as const },
    { label: "Risk",      delta: breakdown.riskScore         - 50, family: "smart" as const },
  ])
    .filter((c) => Math.abs(c.delta) >= 5) // hide near-neutral factors
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  if (contribs.length === 0) return null;

  return (
    <section className={cn("rounded-[10px] border border-ink-200 bg-ink-0 p-4 md:p-5", className)}>
      <div className="flex items-baseline justify-between mb-3">
        <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600">
          What&apos;s driving today
        </div>
        <div className="font-mono text-[11px] text-ink-500">
          composite <span className="text-ink-900 font-medium">{Math.round(composite)}</span> / 100
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {contribs.map((c) => {
          const positive = c.delta > 0;
          const style = FAMILY_STYLE[c.family];
          return (
            <span
              key={c.label}
              className={cn(
                "flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border",
                "font-mono text-[11px] font-semibold whitespace-nowrap",
                positive ? style.chipPos : style.chipNeg,
              )}
            >
              <span className="font-[var(--font-sans)] font-medium">{c.label}</span>
              <span>
                {positive ? "+" : ""}
                {Math.round(c.delta)}
              </span>
            </span>
          );
        })}
      </div>
    </section>
  );
}
