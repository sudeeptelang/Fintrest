"use client";

import { useMarketIndices } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * Regime strip — top of Today screen. Shows regime indicator (neutral/risk-on/
 * risk-off) + SPY + VIX + next scan time. Pulls live data from useMarketIndices.
 */
export function RegimeStrip({
  regime = "Neutral",
  nextScan = "Tomorrow 6:30 AM",
  className,
}: {
  regime?: "Neutral" | "Risk-on" | "Risk-off";
  nextScan?: string;
  className?: string;
}) {
  const { data: indices } = useMarketIndices();
  const spy = indices?.find((i) => i.ticker === "SPY");
  const vix = indices?.find((i) => i.ticker === "VIX");

  return (
    <div
      className={cn(
        "flex items-center gap-8 px-6 py-4 rounded-[10px] border border-ink-200 bg-ink-0",
        className,
      )}
    >
      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-forest-light font-[var(--font-sans)] text-[13px] font-semibold text-forest-dark">
        <span className="relative h-2 w-2 rounded-full bg-forest">
          <span className="absolute inset-0 rounded-full bg-forest/30 animate-[ping_2.4s_ease-in-out_infinite]" />
        </span>
        {regime} regime
      </div>

      <Stat label="SPY" value={formatIndex(spy?.changePct)} tone={toneFor(spy?.changePct)} />
      <Stat label="VIX" value={vix?.price != null ? vix.price.toFixed(1) : "—"} />

      <div className="flex-1" />

      <Stat label="Next scan" value={nextScan} align="right" />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  align,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
  align?: "right";
}) {
  return (
    <div className={cn("flex flex-col gap-1", align === "right" && "text-right")}>
      <span className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">
        {label}
      </span>
      <span
        className={cn(
          "font-[var(--font-mono)] text-[16px] font-medium leading-none",
          tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-ink-900",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function formatIndex(pct: number | null | undefined): string {
  if (pct == null) return "—";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function toneFor(pct: number | null | undefined): "up" | "down" | undefined {
  if (pct == null) return undefined;
  return pct >= 0 ? "up" : "down";
}
