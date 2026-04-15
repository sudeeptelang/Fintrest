"use client";

import Link from "next/link";
import { Zap, TrendingUp, Sparkles, Gem, Calendar, Shield, ArrowRight } from "lucide-react";
import { useMarketScreener } from "@/lib/hooks";
import type { ScreenerRow } from "@/lib/api";

/**
 * Compact "Today's Setups" strip for the dashboard: one tile per lens (verdict category)
 * showing the count of stocks matching it today. Each tile deep-links to /picks?lens=...
 * so the full board lands pre-filtered. This replaces the full AthenaBoard on the dashboard —
 * dashboard = at-a-glance, /picks = deep data view.
 */
const LENS_TILES = [
  { key: "buythedip", label: "Buy the Dip",   match: (r: ScreenerRow) => r.verdict === "Buy the Dip",   icon: TrendingUp, color: "#00b87c" },
  { key: "breakout",  label: "Breakout",      match: (r: ScreenerRow) => r.verdict === "Breakout Setup", icon: Zap,        color: "#3b6fd4" },
  { key: "momentum",  label: "Momentum Run",  match: (r: ScreenerRow) => r.verdict === "Momentum Run",   icon: Sparkles,   color: "#00b87c" },
  { key: "value",     label: "Value Setup",   match: (r: ScreenerRow) => r.verdict === "Value Setup",    icon: Gem,        color: "#7c5fd4" },
  { key: "event",     label: "Event-Driven",  match: (r: ScreenerRow) => r.verdict === "Event-Driven",   icon: Calendar,   color: "#c084fc" },
  { key: "defensive", label: "Defensive",     match: (r: ScreenerRow) => r.verdict === "Defensive Hold", icon: Shield,     color: "#64748b" },
];

export function SetupLensTiles() {
  const { data, isLoading } = useMarketScreener(100);
  const rows = data ?? [];
  const total = rows.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Today&apos;s Setups
        </h2>
        <Link href="/picks" className="text-xs text-primary hover:underline flex items-center gap-1">
          View all {total > 0 && `(${total})`} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {LENS_TILES.map((t) => {
          const count = rows.filter(t.match).length;
          const Icon = t.icon;
          return (
            <Link
              key={t.key}
              href={`/picks?lens=${t.key}`}
              className="group rounded-xl border border-border bg-card p-3 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="flex items-center justify-center h-6 w-6 rounded-md"
                  style={{ backgroundColor: `${t.color}1a`, color: t.color }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                  {t.label}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span
                  className="font-[var(--font-heading)] text-2xl font-bold leading-none"
                  style={{ color: count > 0 ? t.color : undefined }}
                >
                  {isLoading ? "—" : count}
                </span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                  {count === 1 ? "stock" : "stocks"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
