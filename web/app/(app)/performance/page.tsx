"use client";

import Link from "next/link";
import { TrendingUp, Target, AlertTriangle, BarChart3, LineChart, Info } from "lucide-react";
import { usePerformanceOverview } from "@/lib/hooks";

export default function PerformancePage() {
  const { data: perf, isLoading } = usePerformanceOverview();

  const total = perf?.totalSignals ?? 0;
  const noData = !isLoading && total === 0;

  const stats = [
    { label: "Total Signals", value: perf?.totalSignals ?? 0, icon: BarChart3, sub: "closed + tracked" },
    { label: "Win Rate", value: total > 0 ? `${perf?.winRate ?? 0}%` : "—", icon: TrendingUp, sub: "% with positive return" },
    { label: "Avg Return", value: total > 0 ? `${perf?.avgReturn ?? 0}%` : "—", icon: Target, sub: "per closed signal" },
    { label: "Avg Drawdown", value: total > 0 ? `${perf?.avgDrawdown ?? 0}%` : "—", icon: AlertTriangle, sub: "max adverse move" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold">Performance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Full transparency. Every signal tracked from entry to exit.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="font-[var(--font-heading)] text-2xl font-bold">
              {isLoading ? "..." : stat.value}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {noData ? (
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-primary/[0.02] p-8">
          <div className="flex items-start gap-4">
            <div className="shrink-0 h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
              <LineChart className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-3 max-w-2xl">
              <div>
                <h2 className="font-[var(--font-heading)] text-lg font-semibold">No closed signals yet</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Performance data appears here once signals hit their target, stop, or expire —
                  typically within 5-30 days of being published.
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <p className="font-medium">How it works:</p>
                <ul className="space-y-1.5 text-muted-foreground">
                  <li className="flex gap-2"><span className="text-primary mt-0.5">1.</span> Every published signal gets entry, target, and stop-loss prices.</li>
                  <li className="flex gap-2"><span className="text-primary mt-0.5">2.</span> We track daily whether price has hit target (win) or stop (loss).</li>
                  <li className="flex gap-2"><span className="text-primary mt-0.5">3.</span> Once a signal closes, its return + max drawdown go into these stats.</li>
                  <li className="flex gap-2"><span className="text-primary mt-0.5">4.</span> Win rate, avg return, and the equity curve update in real time.</li>
                </ul>
              </div>
              <div className="pt-2 flex gap-2">
                <Link
                  href="/picks"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  See today&apos;s signals →
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-[var(--font-heading)] text-lg font-semibold mb-4">Equity Curve</h2>
          <div className="h-48 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Chart renders once more signals close.</p>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
        <Info className="h-3 w-3" />
        Past performance does not guarantee future results. Signals are for educational purposes only.
      </p>
    </div>
  );
}
