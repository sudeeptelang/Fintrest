"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Regime pill — small visible signal that Fintrest is gating on macro
 * regime, not just picking stocks. Format: `Risk-on regime · VIX 14.2`.
 *
 * Three states mapped from a simple classifier on 10Y yield, VIX, DXY
 * (lives in the Macro & regime context deep-dive row and the daily scan
 * pipeline). When no regime data is available yet, render nothing.
 */
export type MarketRegime = {
  state: "risk-on" | "neutral" | "risk-off";
  vix: number | null;
};

export function RegimePill({ regime, className }: { regime: MarketRegime | null | undefined; className?: string }) {
  if (!regime) return null;

  const label =
    regime.state === "risk-on"
      ? "Risk-on regime"
      : regime.state === "risk-off"
      ? "Risk-off regime"
      : "Neutral regime";

  const dotClass =
    regime.state === "risk-on"
      ? "bg-forest"
      : regime.state === "risk-off"
      ? "bg-rust"
      : "bg-ink-400";

  return (
    <Link
      href="/markets"
      className={cn(
        "hidden md:inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-ink-200 bg-ink-50",
        "font-[var(--font-sans)] text-[11px] text-ink-700 hover:bg-ink-100 transition-colors",
        className,
      )}
      title="Macro regime · updated at 6 AM ET from FRED + Cboe"
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
      <span>{label}</span>
      {regime.vix != null && (
        <>
          <span className="text-ink-400">·</span>
          <span className="font-[var(--font-mono)]">VIX {regime.vix.toFixed(1)}</span>
        </>
      )}
    </Link>
  );
}
