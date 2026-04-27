import { cn } from "@/lib/utils";
import type { AnalystConsensus } from "@/lib/api";

// Analyst rating — Yahoo Finance-style. Three visual elements stacked:
//   1. Recommendation gauge — big rating number + 5-segment bar with a
//      triangle marker pointing at the consensus position.
//   2. Price target ruler — Low → Avg → High range with the current
//      price as a callout pin so the upside reads at a glance.
//   3. Distribution bar — single stacked bar with a 5-cell legend
//      below (counts per rating bucket).
//
// Our rating convention is FMP's: 5.0 = Strong Buy, 1.0 = Strong Sell.
// We render Strong Buy on the LEFT of the gauge bar so the order matches
// the distribution legend below it (top-down: Strong Buy first), keeping
// the eye flow consistent.
export function AnalystRatingCard({
  data,
  currentPrice,
  className,
}: {
  data: AnalystConsensus | null | undefined;
  currentPrice?: number | null;
  className?: string;
}) {
  if (!data || data.totalAnalysts === 0) return null;

  const { strongBuy, buy, hold, sell, strongSell, totalAnalysts, targetConsensus, targetHigh, targetLow, rating } = data;
  const total = totalAnalysts;
  const ratingLabel = labelFor(rating);
  const upside =
    targetConsensus != null && currentPrice != null && currentPrice > 0
      ? ((targetConsensus - currentPrice) / currentPrice) * 100
      : null;

  return (
    <section className={cn("rounded-[10px] border border-ink-200 bg-ink-0 px-7 py-6", className)}>
      <div className="flex items-baseline justify-between gap-3 mb-6">
        <h3 className="font-[var(--font-sans)] text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">
          Analyst rating
        </h3>
        <span className="font-[var(--font-mono)] text-[11px] text-ink-500">
          {total} covering
        </span>
      </div>

      <div className="space-y-7">
        <RecommendationGauge rating={rating} ratingLabel={ratingLabel} />

        {targetConsensus != null && targetLow != null && targetHigh != null && (
          <PriceTargetRuler
            low={targetLow}
            high={targetHigh}
            avg={targetConsensus}
            current={currentPrice ?? null}
            upside={upside}
          />
        )}

        <RecDistribution
          counts={{ strongBuy, buy, hold, sell, strongSell }}
          total={total}
        />
      </div>
    </section>
  );
}

function RecommendationGauge({
  rating,
  ratingLabel,
}: {
  rating: number;
  ratingLabel: string;
}) {
  // FMP convention: 5 = Strong Buy, 1 = Strong Sell. Marker offset:
  // rating=5 → 0% (left), rating=1 → 100% (right). Clamp to keep the
  // marker on-bar even if a feed glitch returns out-of-range values.
  const clamped = Math.max(1, Math.min(5, rating));
  const pctFromLeft = ((5 - clamped) / 4) * 100;

  const zones = [
    { label: "Strong Buy", color: "bg-up" },
    { label: "Buy", color: "bg-[#4DA67A]" },
    { label: "Hold", color: "bg-ink-400" },
    { label: "Sell", color: "bg-[#9E8570]" },
    { label: "Strong Sell", color: "bg-down" },
  ];

  const labelTone =
    rating >= 4.5 ? "text-up" :
    rating >= 3.5 ? "text-up" :
    rating >= 2.5 ? "text-ink-600" :
    "text-down";

  return (
    <div>
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="font-[var(--font-mono)] text-[36px] font-medium text-ink-950 tracking-[-0.02em] leading-none">
            {rating.toFixed(1)}
          </div>
          <div
            className={cn(
              "mt-1 font-[var(--font-sans)] text-[11px] font-semibold uppercase tracking-[0.12em]",
              labelTone,
            )}
          >
            {ratingLabel}
          </div>
        </div>
        <div className="font-[var(--font-mono)] text-[10px] text-ink-400 leading-none">
          1.0 ← scale → 5.0
        </div>
      </div>
      <div className="relative pb-6">
        <div className="flex h-2 rounded-full overflow-hidden">
          {zones.map((z) => (
            <div key={z.label} className={cn("flex-1", z.color)} />
          ))}
        </div>
        {/* Triangle marker pointing down at consensus. Drawn above the bar
            using a CSS triangle so it inherits the ink-900 fill cleanly. */}
        <div
          className="absolute top-[-5px] -translate-x-1/2"
          style={{ left: `${pctFromLeft}%` }}
        >
          <div
            className="w-0 h-0"
            style={{
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "6px solid #101828",
            }}
          />
        </div>
        {/* Zone labels — micro caps below the bar. */}
        <div className="absolute left-0 right-0 top-[14px] grid grid-cols-5 font-[var(--font-sans)] text-[9px] uppercase tracking-[0.08em] text-ink-400">
          {zones.map((z, i) => (
            <div
              key={z.label}
              className={cn(
                "px-1",
                i === 0 ? "text-left" : i === zones.length - 1 ? "text-right" : "text-center",
              )}
            >
              {z.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PriceTargetRuler({
  low,
  high,
  avg,
  current,
  upside,
}: {
  low: number;
  high: number;
  avg: number;
  current: number | null;
  upside: number | null;
}) {
  // Pad the visualized range a touch on each side so endpoint markers
  // don't crash into the container edge.
  const span = Math.max(0.01, high - low);
  const padded = span * 0.06;
  const visMin = Math.min(low, current ?? low) - padded;
  const visMax = Math.max(high, current ?? high) + padded;
  const range = Math.max(0.01, visMax - visMin);
  const pct = (v: number) => ((v - visMin) / range) * 100;
  const lowPct = pct(low);
  const highPct = pct(high);
  const avgPct = pct(avg);
  const curPct = current != null ? pct(current) : null;
  const upsideTone = (upside ?? 0) >= 0 ? "text-up" : "text-down";

  return (
    <div>
      <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500 mb-3">
        Price target
      </div>
      <div className="relative h-12 mb-1">
        {/* Faint full-width baseline (visMin → visMax) */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[3px] bg-ink-100 rounded-full" />
        {/* Active range (low → high) — emphasized over the baseline */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-[3px] bg-ink-300 rounded-full"
          style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%` }}
        />
        {/* Endpoint dots — small ink-400 */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-ink-400"
          style={{ left: `${lowPct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-ink-400"
          style={{ left: `${highPct}%` }}
        />
        {/* Avg marker — forest filled circle with white halo */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-forest border-2 border-ink-0 shadow-e1"
          style={{ left: `${avgPct}%` }}
        />
        {/* Current price — vertical needle + ink-900 callout pill */}
        {current != null && curPct != null && (
          <>
            <div
              className="absolute top-1 bottom-1 w-px bg-ink-900"
              style={{ left: `${curPct}%` }}
            />
            <div
              className="absolute top-0 -translate-x-1/2 px-1.5 py-0.5 rounded-[3px] bg-ink-900 text-ink-0 font-[var(--font-mono)] text-[10px] font-medium whitespace-nowrap leading-none"
              style={{ left: `${curPct}%` }}
            >
              ${current.toFixed(2)}
            </div>
          </>
        )}
      </div>
      <div className="grid grid-cols-3 font-[var(--font-mono)] text-[11px]">
        <div>
          <div className="font-[var(--font-sans)] text-[9px] uppercase tracking-[0.12em] text-ink-400">Low</div>
          <div className="font-medium text-ink-700">${low.toFixed(0)}</div>
        </div>
        <div className="text-center">
          <div className="font-[var(--font-sans)] text-[9px] uppercase tracking-[0.12em] text-ink-400">Avg</div>
          <div className={cn("font-medium", upside != null ? upsideTone : "text-ink-700")}>
            ${avg.toFixed(0)}
            {upside != null && (
              <span className="ml-1.5 text-[10px]">
                ({upside >= 0 ? "+" : ""}{upside.toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="font-[var(--font-sans)] text-[9px] uppercase tracking-[0.12em] text-ink-400">High</div>
          <div className="font-medium text-ink-700">${high.toFixed(0)}</div>
        </div>
      </div>
    </div>
  );
}

function RecDistribution({
  counts,
  total,
}: {
  counts: { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number };
  total: number;
}) {
  const segments = [
    { label: "Strong Buy", count: counts.strongBuy, color: "bg-up" },
    { label: "Buy", count: counts.buy, color: "bg-[#4DA67A]" },
    { label: "Hold", count: counts.hold, color: "bg-ink-400" },
    { label: "Sell", count: counts.sell, color: "bg-[#9E8570]" },
    { label: "Strong Sell", count: counts.strongSell, color: "bg-down" },
  ];

  return (
    <div>
      <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500 mb-3">
        Distribution
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-ink-100">
        {segments.map((s) => {
          if (s.count === 0 || total === 0) return null;
          const pct = (s.count / total) * 100;
          return (
            <div
              key={s.label}
              className={cn("h-full", s.color)}
              style={{ width: `${pct}%` }}
              title={`${s.label}: ${s.count}`}
            />
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-x-3 gap-y-1.5 text-[11px]">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={cn("inline-block w-1.5 h-1.5 rounded-full shrink-0", s.color)} />
            <span className="text-ink-600 truncate">{s.label}</span>
            <span className="font-[var(--font-mono)] font-medium text-ink-900 ml-auto">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function labelFor(rating: number): string {
  if (rating >= 4.5) return "Strong Buy";
  if (rating >= 3.5) return "Buy";
  if (rating >= 2.5) return "Hold";
  if (rating >= 1.5) return "Sell";
  return "Strong Sell";
}
