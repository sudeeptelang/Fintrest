"use client";

import { cn } from "@/lib/utils";
import type { Signal, StockInfo } from "@/lib/api";
import { ScoreRing } from "@/components/signals/score-ring";
import { SignalBadge, signalTypeToVariant } from "@/components/signals/signal-badge";

/**
 * Signal/Ticker detail hero — ticker + badge, company, price/change, action
 * buttons on the left; 140px composite score ring on the right.
 *
 * The hero is deliberately flat (no card surrounding the whole thing) because
 * it's the page's title area. The score ring is the only chrome-heavy element.
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
  /** Pre-formatted market cap string, e.g. "$2.18T" */
  marketCap?: string;
  /** Pre-formatted volume string, e.g. "28.4M" */
  volume?: string;
  /** Optional action buttons (Pin, Add to watchlist, etc.) */
  actions?: React.ReactNode;
  className?: string;
}) {
  const up = (signal?.changePct ?? 0) >= 0;
  const variant = signal ? signalTypeToVariant(signal.signalType) : "watch";

  const companyLine = [
    stock?.name,
    stock?.sector,
    stock?.exchange,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      className={cn(
        "grid gap-8 items-start rounded-[10px] border border-ink-200 bg-ink-0 p-8",
        "grid-cols-1 lg:grid-cols-[1fr_140px]",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3 mb-1.5">
          <h1 className="font-[var(--font-heading)] text-[36px] leading-none font-bold text-ink-950 tracking-[-0.02em]">
            {ticker.toUpperCase()}
          </h1>
          {signal && <SignalBadge variant={variant} />}
        </div>

        <p className="font-[var(--font-sans)] text-[14px] text-ink-500 mb-5">
          {companyLine || "—"}
        </p>

        <div className="flex flex-wrap items-baseline gap-3">
          {signal?.currentPrice != null && (
            <div className="font-[var(--font-mono)] text-[28px] font-medium text-ink-950 tracking-[-0.02em] leading-none">
              ${formatPrice(signal.currentPrice)}
            </div>
          )}
          {signal?.changePct != null && (
            <div
              className={cn(
                "font-[var(--font-mono)] text-[15px] font-medium leading-none",
                up ? "text-up" : "text-down",
              )}
            >
              {up ? "▲" : "▼"} {up ? "+" : ""}{signal.changePct.toFixed(2)}% today
            </div>
          )}
          {(marketCap || volume) && (
            <div className="font-[var(--font-mono)] text-[12px] text-ink-500">
              {marketCap && `Market cap ${marketCap}`}
              {marketCap && volume && " · "}
              {volume && `Vol ${volume}`}
            </div>
          )}
        </div>

        {actions && <div className="mt-6 flex flex-wrap gap-2">{actions}</div>}
      </div>

      {signal && (
        <div className="justify-self-center lg:justify-self-end">
          <ScoreRing
            score={signal.scoreTotal}
            segments={
              signal.breakdown
                ? [
                    signal.breakdown.momentumScore,
                    signal.breakdown.relVolumeScore,
                    signal.breakdown.newsScore,
                    signal.breakdown.fundamentalsScore,
                    signal.breakdown.sentimentScore,
                    signal.breakdown.trendScore,
                    signal.breakdown.riskScore,
                  ]
                : undefined
            }
          />
        </div>
      )}
    </section>
  );
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return p.toFixed(2);
}
