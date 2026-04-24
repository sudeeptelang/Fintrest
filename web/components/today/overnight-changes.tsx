"use client";

import Link from "next/link";
import { Plus, Minus, TrendingUp, TrendingDown } from "lucide-react";
import { useOvernightChanges } from "@/lib/hooks";
import type { OvernightMover, OvernightDelta } from "@/lib/api";
import { cn } from "@/lib/utils";
import { StockLogo } from "@/components/ui/stock-logo";

/**
 * Today page "What changed overnight" panel. Compares the latest
 * completed scan to the prior one and surfaces four buckets:
 *
 *   Added overnight — cleared the bar this scan, wasn't in prior
 *   Fell off        — was in prior scan, dropped this time
 *   Biggest jumps   — in both, positive score delta (top 5)
 *   Biggest drops   — in both, negative score delta (top 5)
 *
 * Sits between the Audit strip and the signals list so Today reads
 * as a morning briefing, not just a ranked list.
 */
export function OvernightChanges({ className }: { className?: string }) {
  const { data, isLoading } = useOvernightChanges();

  if (isLoading) {
    return (
      <section className={cn("rounded-[12px] border border-ink-200 bg-ink-0 px-5 py-5", className)}>
        <div className="font-mono text-[12px] text-ink-500">Computing overnight changes…</div>
      </section>
    );
  }

  if (!data || !data.hasComparison) {
    // No comparison available (first scan, or something weird). Quiet exit —
    // don't render anything rather than a confusing empty state.
    return null;
  }

  const empty = data.added.length === 0 && data.fellOff.length === 0 && data.jumps.length === 0 && data.drops.length === 0;
  if (empty) return null;

  return (
    <section className={cn("rounded-[12px] border border-ink-200 bg-ink-0 overflow-hidden", className)}>
      <header className="flex items-baseline justify-between px-5 py-3 border-b border-ink-100 bg-ink-50 gap-3">
        <h2 className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600">
          What changed overnight
        </h2>
        <span className="font-mono text-[11px] text-ink-500">
          +{data.addedCount} added · −{data.fellOffCount} fell off
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-ink-100">
        {/* Jumps column */}
        <Column
          icon={<TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />}
          label="Biggest score jumps"
          tone="up"
          empty="No score jumps today."
        >
          {data.jumps.map((r) => (
            <DeltaRow key={r.ticker} row={r} positive />
          ))}
        </Column>

        {/* Drops column */}
        <Column
          icon={<TrendingDown className="h-3.5 w-3.5" strokeWidth={2} />}
          label="Biggest score drops"
          tone="down"
          empty="No score drops today."
        >
          {data.drops.map((r) => (
            <DeltaRow key={r.ticker} row={r} positive={false} />
          ))}
        </Column>
      </div>

      {(data.added.length > 0 || data.fellOff.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-ink-100 border-t border-ink-100">
          <Column
            icon={<Plus className="h-3.5 w-3.5" strokeWidth={2.5} />}
            label="Added overnight"
            tone="up"
            empty="No new tickers cleared the bar."
          >
            {data.added.map((r) => (
              <MoverRow key={r.ticker} row={r} positive />
            ))}
          </Column>
          <Column
            icon={<Minus className="h-3.5 w-3.5" strokeWidth={2.5} />}
            label="Fell off"
            tone="down"
            empty="Nothing dropped off."
          >
            {data.fellOff.map((r) => (
              <MoverRow key={r.ticker} row={r} positive={false} />
            ))}
          </Column>
        </div>
      )}
    </section>
  );
}

function Column({
  icon,
  label,
  tone,
  empty,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "up" | "down";
  empty: string;
  children: React.ReactNode;
}) {
  const hasRows = Array.isArray(children) ? children.filter(Boolean).length > 0 : !!children;
  return (
    <div className="px-5 py-4">
      <div
        className={cn(
          "font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.1em] mb-3 flex items-center gap-1.5",
          tone === "up" ? "text-up" : "text-down",
        )}
      >
        {icon}
        {label}
      </div>
      {hasRows ? (
        <ul className="space-y-2">{children}</ul>
      ) : (
        <p className="font-[var(--font-sans)] text-[12px] text-ink-500 italic">{empty}</p>
      )}
    </div>
  );
}

function DeltaRow({ row, positive }: { row: OvernightDelta; positive: boolean }) {
  const tone = positive ? "text-up" : "text-down";
  return (
    <li>
      <Link
        href={`/stock/${row.ticker}`}
        className="flex items-center gap-3 hover:bg-ink-50 rounded-md px-2 -mx-2 py-1.5 transition-colors"
      >
        <StockLogo ticker={row.ticker} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="font-[var(--font-heading)] text-[13px] font-bold text-ink-900 leading-tight">
            {row.ticker}
          </div>
          <div className="font-mono text-[10px] text-ink-500 leading-tight mt-0.5">
            {row.previousScore} → {row.currentScore}
          </div>
        </div>
        <span className={cn("font-mono text-[13px] font-semibold whitespace-nowrap", tone)}>
          {positive ? "+" : ""}{row.delta}
        </span>
      </Link>
    </li>
  );
}

function MoverRow({ row, positive }: { row: OvernightMover; positive: boolean }) {
  const tone = positive ? "text-up" : "text-down";
  return (
    <li>
      <Link
        href={`/stock/${row.ticker}`}
        className="flex items-center gap-3 hover:bg-ink-50 rounded-md px-2 -mx-2 py-1.5 transition-colors"
      >
        <StockLogo ticker={row.ticker} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="font-[var(--font-heading)] text-[13px] font-bold text-ink-900 leading-tight">
            {row.ticker}
          </div>
          <div className="font-[var(--font-sans)] text-[10px] text-ink-500 leading-tight mt-0.5 truncate">
            {row.name}
          </div>
        </div>
        <span className={cn("font-mono text-[12px] font-semibold whitespace-nowrap", tone)}>
          {row.score}
        </span>
      </Link>
    </li>
  );
}
