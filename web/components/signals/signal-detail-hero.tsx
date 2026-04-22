"use client";

import { cn } from "@/lib/utils";
import type { Signal, StockInfo } from "@/lib/api";
import { ScoreRing } from "@/components/signals/score-ring";
import { SignalBadge } from "@/components/signals/signal-badge";

// Non-directive variant per QA-P0-4 + docs/DESIGN_TICKER_DEEP_DIVE.md.
// "BUY TODAY" reads like investment advice; "In research set" reads like an
// editorial label. Avoid / setup / high-score cover the other buckets.
function researchSetVariant(signalType: string, scoreTotal: number) {
  const t = signalType.toUpperCase();
  if (t === "AVOID" || t === "HIGH_RISK") return "avoid" as const;
  if (scoreTotal >= 85) return "high-score" as const;
  if (t === "BUY_TODAY" || t === "BUY") return "setup" as const;
  return "research" as const;
}

// Signal horizon is a single int on the wire today; the UI presents it as a
// range because the scoring engine writes the center of a window. Soft range
// of ±25% around the center — replace with real horizonMin/horizonMax when
// the DTO picks them up.
function formatHorizon(horizonDays: number | null): string | null {
  if (horizonDays == null || horizonDays <= 0) return null;
  const lo = Math.max(1, Math.round(horizonDays * 0.8));
  const hi = Math.max(lo + 1, Math.round(horizonDays * 1.25));
  return `${lo}–${hi} day horizon`;
}

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
  const variant = signal
    ? researchSetVariant(signal.signalType, signal.scoreTotal)
    : "research";

  const horizonLabel = signal ? formatHorizon(signal.horizonDays) : null;
  // Company + signal meta on one line, mockup order:
  //   Microsoft Corp · Signal #106 · 15–20 day horizon
  // Sector + exchange move into the Fundamentals deep-dive row — keeps the
  // hero tight on the ticker identity.
  const metaParts = [
    stock?.name,
    signal ? `Signal #${signal.id}` : null,
    horizonLabel,
  ].filter((v): v is string => !!v);
  const companyLine = metaParts.join(" · ");

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
