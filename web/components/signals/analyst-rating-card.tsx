import { cn } from "@/lib/utils";
import type { AnalystConsensus } from "@/lib/api";

/**
 * Analyst rating card — consensus rating, price target, buy/hold/sell split.
 * v2-styled. Shows nothing when there are no analysts covering.
 */
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
    targetConsensus != null && currentPrice != null
      ? ((targetConsensus - currentPrice) / currentPrice) * 100
      : null;

  const bars: { label: string; count: number; color: string }[] = [
    { label: "Strong Buy",  count: strongBuy,   color: "bg-up" },
    { label: "Buy",         count: buy,         color: "bg-[#4DA67A]" },
    { label: "Hold",        count: hold,        color: "bg-ink-400" },
    { label: "Sell",        count: sell,        color: "bg-[#9E8570]" },
    { label: "Strong Sell", count: strongSell,  color: "bg-down" },
  ];

  return (
    <section className={cn("rounded-[10px] border border-ink-200 bg-ink-0 px-7 py-6", className)}>
      <div className="flex items-baseline gap-3 mb-5">
        <h3 className="font-[var(--font-heading)] text-[14px] font-semibold text-ink-900">
          Analyst rating
        </h3>
        <span className="font-[var(--font-mono)] text-[12px] text-ink-500">
          {total} covering
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-start">
        <div>
          <div className="font-[var(--font-mono)] text-[36px] font-medium text-ink-950 tracking-[-0.02em] leading-none">
            {rating.toFixed(1)}
          </div>
          <div
            className={cn(
              "mt-2 font-[var(--font-sans)] text-[11px] font-semibold uppercase tracking-[0.12em]",
              rating >= 3.5 ? "text-up" : rating >= 2.5 ? "text-ink-600" : "text-down",
            )}
          >
            {ratingLabel}
          </div>
          {targetConsensus != null && (
            <div className="mt-5">
              <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500 mb-1">
                Target consensus
              </div>
              <div className="font-[var(--font-mono)] text-[20px] font-medium text-ink-950 tracking-[-0.01em] leading-none">
                ${targetConsensus.toFixed(2)}
              </div>
              {upside != null && (
                <div
                  className={cn(
                    "mt-1 font-[var(--font-mono)] text-[12px] font-medium leading-none",
                    upside >= 0 ? "text-up" : "text-down",
                  )}
                >
                  {upside >= 0 ? "+" : ""}{upside.toFixed(1)}% from current
                </div>
              )}
              {targetHigh != null && targetLow != null && (
                <div className="mt-2 font-[var(--font-mono)] text-[11px] text-ink-500">
                  Range ${targetLow.toFixed(0)}–${targetHigh.toFixed(0)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          {bars.map((b) => {
            const pct = total > 0 ? (b.count / total) * 100 : 0;
            return (
              <div key={b.label} className="grid grid-cols-[100px_1fr_40px] items-center gap-3">
                <span className="font-[var(--font-sans)] text-[12px] text-ink-700">{b.label}</span>
                <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                  <div className={cn("h-full rounded-full", b.color)} style={{ width: `${pct}%` }} />
                </div>
                <span className="font-[var(--font-mono)] text-[12px] text-ink-600 text-right">{b.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function labelFor(rating: number): string {
  if (rating >= 4.5) return "Strong Buy";
  if (rating >= 3.5) return "Buy";
  if (rating >= 2.5) return "Hold";
  if (rating >= 1.5) return "Sell";
  return "Strong Sell";
}
