"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useDcf } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * DCF valuation card — FMP-computed fair value paired with the
 * stock's current price to show implied upside/downside. Surfaces in
 * the Fundamentals deep-dive under the Quant-health (Altman / Piotroski)
 * card. Silently hides if FMP has no DCF on file for the ticker.
 *
 * Bands come server-side so the frontend doesn't own thresholds:
 *   undervalued: implied upside >= 20%
 *   fair:        -10% to +20%
 *   overvalued:  < -10%
 */
export function DcfCard({ ticker, className }: { ticker: string; className?: string }) {
  const { data } = useDcf(ticker);
  if (!data) return null;

  const { dcfFairValue, stockPrice, impliedUpsidePct, band } = data;
  const { Icon, tone, bg, label, blurb } =
    band === "undervalued"
      ? { Icon: TrendingUp, tone: "text-up", bg: "bg-up/10", label: "Undervalued", blurb: "trading 20%+ below DCF" }
      : band === "fair"
      ? { Icon: Minus, tone: "text-ink-700", bg: "bg-ink-100", label: "Fair value", blurb: "price within ±20% of DCF" }
      : band === "overvalued"
      ? { Icon: TrendingDown, tone: "text-down", bg: "bg-down/10", label: "Overvalued", blurb: "trading 10%+ above DCF" }
      : { Icon: Minus, tone: "text-ink-500", bg: "bg-ink-50", label: "Unknown", blurb: "no DCF model on file" };

  return (
    <div className={cn("rounded-[10px] border border-ink-200 bg-ink-0 p-4 md:p-5", className)}>
      <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600 mb-3">
        DCF valuation · FMP
      </div>

      <div className={cn("rounded-[8px] p-4 flex items-center gap-4", bg)}>
        <div className={cn("flex-shrink-0 grid place-items-center w-10 h-10 rounded-md bg-ink-0", tone)}>
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={cn("font-[var(--font-sans)] text-[12px] font-semibold uppercase tracking-wide", tone)}>
              {label}
            </span>
            {impliedUpsidePct != null && (
              <span className={cn("font-mono text-[13px] font-semibold", tone)}>
                {impliedUpsidePct > 0 ? "+" : ""}{impliedUpsidePct.toFixed(1)}% implied
              </span>
            )}
          </div>
          <div className="font-[var(--font-sans)] text-[12px] text-ink-600 mt-0.5">{blurb}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="rounded-[6px] border border-ink-200 px-3 py-2">
          <div className="font-[var(--font-sans)] text-[10px] uppercase tracking-wide text-ink-500">DCF fair value</div>
          <div className="font-mono text-[16px] font-medium text-ink-900 mt-0.5">
            ${dcfFairValue.toFixed(2)}
          </div>
        </div>
        <div className="rounded-[6px] border border-ink-200 px-3 py-2">
          <div className="font-[var(--font-sans)] text-[10px] uppercase tracking-wide text-ink-500">Current price</div>
          <div className="font-mono text-[16px] font-medium text-ink-900 mt-0.5">
            {stockPrice != null ? `$${stockPrice.toFixed(2)}` : "—"}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-ink-500 leading-tight">
        Discounted cash flow fair value sourced from FMP. One of many valuation
        approaches — not a price target. Educational reference only.
      </p>
    </div>
  );
}
