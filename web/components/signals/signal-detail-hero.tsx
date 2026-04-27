"use client";

import { cn } from "@/lib/utils";
import type { Signal, StockInfo } from "@/lib/api";
import { useScoreHistory } from "@/lib/hooks";
import { StockLogo } from "@/components/ui/stock-logo";
import { ScoreGradeChip } from "@/components/ui/score-grade-chip";
import { SparklineMini } from "@/components/ui/sparkline-mini";
import { PriceFreshness } from "@/components/ui/price-freshness";

// Signal horizon is a single int on the wire today; the UI presents it as a
// range because the scoring engine writes the center of a window. Soft range
// of ±25% around the center — replace with real horizonMin/horizonMax when
// the DTO picks them up.
function formatHorizon(horizonDays: number | null): string | null {
  if (horizonDays == null || horizonDays <= 0) return null;
  const lo = Math.max(1, Math.round(horizonDays * 0.8));
  const hi = Math.max(lo + 1, Math.round(horizonDays * 1.25));
  return `${lo}–${hi}d horizon`;
}

/**
 * v3 Ticker detail hero. Two stacks:
 *   1. Identity row — logo + ticker + company meta + action buttons
 *   2. Score panel — letter grade (A–F) + numeric composite + delta
 *      alongside price + change + market cap + volume
 *
 * The v2 ScoreRing is retired at the hero level in favor of the letter +
 * numeric dual-display (see UX_AUDIT open question #4 resolution). The
 * full 8-factor radar still renders below the hero via
 * FactorBreakdownPanel — the hero is just the glance surface.
 */
export function SignalDetailHero({
  ticker,
  signal,
  stock,
  marketCap,
  volume,
  actions,
  className,
}: {
  ticker: string;
  signal: Signal | null | undefined;
  stock: StockInfo | null | undefined;
  marketCap?: string;
  volume?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  const up = (signal?.changePct ?? 0) >= 0;
  const horizonLabel = signal ? formatHorizon(signal.horizonDays) : null;
  const metaParts = [
    stock?.name,
    signal ? `Signal #${signal.id}` : null,
    horizonLabel,
  ].filter((v): v is string => !!v);

  // Real 30-day score history for the hero sparkline + day-over-day delta.
  const { data: history } = useScoreHistory(ticker);
  const points = history?.points ?? [];
  const realSpark = points.length >= 2 ? points.map((p) => p.score) : null;
  const scoreDelta = signal && points.length >= 2
    ? Math.round(signal.scoreTotal - points[points.length - 2].score)
    : null;

  return (
    <section
      className={cn(
        "rounded-[12px] border border-ink-200 bg-ink-0 p-6 md:p-8",
        className,
      )}
    >
      {/* Identity row */}
      <div className="flex items-start gap-4 md:gap-5">
        <StockLogo ticker={ticker} size="lg" className="flex-shrink-0" />

        <div className="min-w-0 flex-1">
          <h1 className="font-[var(--font-heading)] text-[28px] md:text-[32px] leading-[1.05] font-bold text-ink-950 tracking-[-0.02em]">
            {ticker.toUpperCase()}
          </h1>
          <p className="font-[var(--font-sans)] text-[13px] text-ink-500 mt-1 truncate">
            {metaParts.join(" · ") || "—"}
          </p>
        </div>

        {actions && (
          <div className="hidden md:flex flex-wrap gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Score panel — wash background so it reads as a distinct focal block */}
      {signal && (
        <div className="mt-5 rounded-[10px] bg-ink-50 p-4 md:p-5 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 md:gap-6 items-center">
          <div className="flex items-center gap-3">
            <ScoreGradeChip
              score={signal.scoreTotal}
              delta={scoreDelta}
              size="lg"
              showNum={true}
              showDelta={scoreDelta != null}
            />
            {realSpark && (
              <SparklineMini
                data={realSpark}
                size="lg"
                tone={scoreDelta != null && scoreDelta < 0 ? "down" : scoreDelta != null && scoreDelta > 0 ? "up" : undefined}
              />
            )}
          </div>
          <div className="min-w-0 flex flex-col gap-1.5">
            {signal.currentPrice != null && (
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-[var(--font-mono)] text-[26px] md:text-[28px] font-medium text-ink-950 tracking-[-0.01em] leading-none">
                  ${formatPrice(signal.currentPrice)}
                </span>
                {signal.changePct != null && (
                  <span
                    className={cn(
                      "font-[var(--font-mono)] text-[14px] font-medium leading-none",
                      up ? "text-up" : "text-down",
                    )}
                  >
                    {up ? "+" : ""}{signal.changePct.toFixed(2)}% today
                  </span>
                )}
              </div>
            )}
            {/* "As of HH:MM EDT · Market open" badge — sits directly
                under the price so users never wonder how fresh it is. */}
            {signal.currentPrice != null && <PriceFreshness />}
            {(marketCap || volume) && (
              <div className="font-[var(--font-mono)] text-[11px] text-ink-500">
                {marketCap && `Market cap ${marketCap}`}
                {marketCap && volume && " · "}
                {volume && `Vol ${volume}`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile action bar (hidden on md+ since actions float in the identity row) */}
      {actions && (
        <div className="mt-4 flex flex-wrap gap-2 md:hidden">{actions}</div>
      )}
    </section>
  );
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return p.toFixed(2);
}
