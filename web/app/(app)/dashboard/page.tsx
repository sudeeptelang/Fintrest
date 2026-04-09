"use client";

import Link from "next/link";
import { Activity, BarChart3, TrendingUp, ArrowUpRight } from "lucide-react";
import { useMarketSummary, useTopPicks } from "@/lib/hooks";
import { SignalRow } from "@/components/signals/signal-row";

export default function DashboardPage() {
  const { data: summary } = useMarketSummary();
  const { data: picks, isLoading } = useTopPicks(12);

  const signals = picks?.signals ?? [];
  const buyCount = signals.filter((s) => s.signalType === "BUY_TODAY").length;
  const watchCount = signals.filter((s) => s.signalType === "WATCH").length;
  const topSignal = signals[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {summary?.latestScanAt
            ? `Last scan: ${new Date(summary.latestScanAt).toLocaleString()}`
            : "Good morning. Here's your market overview."}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">Top Signal</span>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="font-[var(--font-heading)] text-2xl font-bold">
            {topSignal?.ticker ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {topSignal ? `Score: ${Math.round(topSignal.scoreTotal)} / 100` : "No signals yet"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">Active Signals</span>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="font-[var(--font-heading)] text-2xl font-bold">
            {summary?.signalsToday ?? 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {buyCount} buy · {watchCount} watch
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">Market Status</span>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="font-[var(--font-heading)] text-2xl font-bold capitalize">
            {summary?.marketStatus?.replace("_", " ") ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">Avg Score</span>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="font-[var(--font-heading)] text-2xl font-bold">
            {signals.length > 0
              ? Math.round(signals.reduce((sum, s) => sum + s.scoreTotal, 0) / signals.length)
              : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Across {signals.length} stocks</p>
        </div>
      </div>

      {/* Signals list */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-[var(--font-heading)] text-lg font-semibold">Today&apos;s Signals</h2>
          <Link
            href="/picks"
            className="text-sm text-primary font-medium hover:text-primary/80 flex items-center gap-1"
          >
            View all <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading signals...</div>
        ) : signals.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No signals yet. Run a scan first.</div>
        ) : (
          <div className="divide-y divide-border">
            {signals.slice(0, 8).map((s) => (
              <SignalRow key={s.id} signal={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
