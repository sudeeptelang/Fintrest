"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Lock, Zap } from "lucide-react";
import { useTopPicks, useMarketIndices, usePlan, planMeets } from "@/lib/hooks";
import { SetupLensTiles } from "@/components/dashboard/setup-lens-tiles";
import { HeroSignalCard } from "@/components/dashboard/hero-signal-card";
import { AthenaPulse } from "@/components/dashboard/athena-pulse";
import { TrendingLists } from "@/components/dashboard/trending-lists";
import type { ScreenerKey } from "@/components/dashboard/trending-lists";
import { MoversTable } from "@/components/dashboard/movers-table";

export default function DashboardPage() {
  const { data: picks } = useTopPicks(20);
  const { data: indices } = useMarketIndices();
  const { plan } = usePlan();
  const isPro = planMeets(plan, "pro");

  const signals = picks?.signals ?? [];
  // Free users see top 3; Pro+ see top 5.
  const visibleSignals = isPro ? signals.slice(0, 5) : signals.slice(0, 3);
  const lockedSignalsCount = isPro ? 0 : Math.max(0, Math.min(signals.length, 5) - 3);

  const [activeScreener, setActiveScreener] = useState<ScreenerKey | null>(null);

  return (
    <div className="space-y-8">
      {/* Athena's Pulse — regime + narrative + top picks. Replaces static KPI strip. */}
      <AthenaPulse />

      {/* Index ticker strip — clickable, shows ticker + % change + price. Each cell links to /markets. */}
      {indices && indices.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-4 md:grid-cols-8">
            {indices
              .filter((idx) => ["SPY","QQQ","DIA","IWM","GLD","TLT","IBIT","VWO"].includes(idx.ticker))
              .map((idx, i, arr) => {
                const positive = (idx.changePct ?? 0) >= 0;
                const change = idx.changePct === null
                  ? null
                  : `${positive ? "+" : ""}${idx.changePct.toFixed(2)}%`;
                return (
                  <Link
                    key={idx.ticker}
                    href="/markets"
                    className={`group flex flex-col gap-0.5 px-3 py-2.5 transition-colors hover:bg-muted/40 ${
                      i < arr.length - 1 ? "md:border-r border-border" : ""
                    } ${i < 4 ? "border-b md:border-b-0 border-border" : ""}`}
                  >
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-[var(--font-mono)] text-xs font-bold group-hover:text-primary transition-colors">
                        {idx.ticker}
                      </span>
                      <span
                        className={`font-[var(--font-mono)] text-[10px] font-semibold ${
                          positive ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        {change ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                        {idx.label}
                      </span>
                      <span className="font-[var(--font-mono)] text-[10px] text-muted-foreground">
                        {idx.price?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "—"}
                      </span>
                    </div>
                  </Link>
                );
              })}
          </div>
          <div className="border-t border-border px-3 py-1.5 text-right">
            <Link href="/markets" className="text-[10px] text-primary hover:underline">
              View all markets →
            </Link>
          </div>
        </div>
      )}

      {/* Today's Top Signals — Free sees top 3, Pro+ sees top 5 */}
      {signals.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wider">
                Today&apos;s Top Signals
              </h2>
              {!isPro && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  · Free preview: top 3
                </span>
              )}
            </div>
            <Link href="/picks" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {visibleSignals.map((s, i) => (
              <HeroSignalCard key={s.id} signal={s} rank={i + 1} />
            ))}
            {lockedSignalsCount > 0 && (
              <Link
                href="/pricing"
                className="flex flex-col items-center justify-center rounded-xl border border-dashed border-primary/40 bg-primary/[0.04] p-4 text-center hover:bg-primary/[0.08] transition-colors"
              >
                <Lock className="h-5 w-5 text-primary mb-2" />
                <p className="text-sm font-semibold text-primary">
                  +{lockedSignalsCount} more with Pro
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  See every signal + Athena thesis
                </p>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Popular Screeners — clicking a pill repopulates the MoversTable below */}
      <TrendingLists activeKey={activeScreener} onSelect={setActiveScreener} />

      {/* Movers — Top Gainers / Losers / Most Active / All Signals, OR driven by screener pill */}
      <MoversTable limit={10} screenerKey={activeScreener} />

      {/* Today's Setups — compact lens-tile strip. Each tile deep-links to /picks?lens=... */}
      <SetupLensTiles />

    </div>
  );
}

