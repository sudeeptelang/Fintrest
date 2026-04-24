"use client";

import { cn } from "@/lib/utils";

/**
 * Dual-display composite score: letter grade (A–F) on the left for
 * at-a-glance, numeric 0-100 on the right for granularity, optional
 * delta-since-yesterday chip underneath. One source of truth for every
 * place a score shows up — Today grid, ticker hero, watchlist row,
 * portfolio holdings.
 *
 * Bands map per UX_AUDIT Part 1 observation #10 resolution:
 *   85-100 A · 70-84 B · 55-69 C · 40-54 D · <40 F
 */

type GradeBand = "A" | "B" | "C" | "D" | "F";

function bandFor(score: number): GradeBand {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

// Band → tile background class. A = up-green (high-score = good),
// B = sky-blue (brand — good but not top), C = neutral ink, D = muted,
// F = down. Keeps A and F the strongest signals; B / C / D read as
// progressively quieter. No near-black tiles (the old B=bg-navy looked
// like a black pill and clashed with the sky-brand palette).
const BAND_STYLE: Record<GradeBand, { bg: string; text: string }> = {
  A: { bg: "bg-up", text: "text-ink-0" },
  B: { bg: "bg-forest", text: "text-ink-0" },
  C: { bg: "bg-ink-200", text: "text-ink-700" },
  D: { bg: "bg-ink-300", text: "text-ink-700" },
  F: { bg: "bg-down", text: "text-ink-0" },
};

const SIZE_MAP = {
  sm: { letterBox: 24, letterFont: "text-[13px]", numFont: "text-[11px]", deltaFont: "text-[10px]" },
  md: { letterBox: 32, letterFont: "text-[18px]", numFont: "text-[13px]", deltaFont: "text-[11px]" },
  lg: { letterBox: 56, letterFont: "text-[32px]", numFont: "text-[20px]", deltaFont: "text-[13px]" },
} as const;

export function ScoreGradeChip({
  score,
  delta = null,
  size = "md",
  showNum = true,
  showDelta = true,
  className,
}: {
  /** Composite 0-100 */
  score: number | null | undefined;
  /** Delta vs. yesterday, positive or negative; null = hide */
  delta?: number | null;
  size?: keyof typeof SIZE_MAP;
  showNum?: boolean;
  showDelta?: boolean;
  className?: string;
}) {
  const s = SIZE_MAP[size];

  if (score == null) {
    return (
      <div className={cn("inline-flex items-center gap-2", className)}>
        <div
          className={cn("grid place-items-center rounded-md bg-ink-100 text-ink-400 font-display font-bold", s.letterFont)}
          style={{ width: s.letterBox, height: s.letterBox }}
        >—</div>
      </div>
    );
  }

  const rounded = Math.round(score);
  const band = bandFor(rounded);
  const style = BAND_STYLE[band];

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div
        className={cn(
          "grid place-items-center rounded-md font-display font-bold leading-none",
          style.bg,
          style.text,
          s.letterFont,
        )}
        style={{ width: s.letterBox, height: s.letterBox }}
        aria-label={`Grade ${band}, score ${rounded} of 100`}
      >
        {band}
      </div>
      {(showNum || (showDelta && delta != null)) && (
        <div className="flex flex-col leading-none gap-[2px]">
          {showNum && (
            <span className={cn("font-mono font-medium text-ink-700", s.numFont)}>{rounded}</span>
          )}
          {showDelta && delta != null && (
            <span
              className={cn(
                "font-mono",
                s.deltaFont,
                delta > 0 ? "text-up" : delta < 0 ? "text-down" : "text-ink-500",
              )}
            >
              {delta > 0 ? "+" : ""}{delta}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
