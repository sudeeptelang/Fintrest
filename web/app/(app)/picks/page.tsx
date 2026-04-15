"use client";

import { AthenaBoard } from "@/components/dashboard/athena-board";

/**
 * Unified picks page — covers both "Top Picks" and "Swing Trades" in one table.
 * Lens chips let users filter by setup type (Buy the Dip / Breakout / Momentum Run /
 * Value / Event-Driven / Defensive). Swing traders pick "Momentum Run"; dip-buyers
 * pick "Buy the Dip"; event-driven traders pick "Event-Driven". One source of truth.
 */
export default function PicksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold">Athena&apos;s Picks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every signal from today&apos;s scan, ranked by composite score. Filter by setup type
          with the lens chips — Buy the Dip, Breakout, Momentum Run, Value Setup, Event-Driven,
          or Defensive. Tap any ticker for Athena&apos;s full thesis.
        </p>
      </div>
      <AthenaBoard limit={100} defaultLens="all" title="All Signals" syncUrl />
    </div>
  );
}
