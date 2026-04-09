"use client";

import { TrendingUp, Target, AlertTriangle, BarChart3 } from "lucide-react";
import { usePerformanceOverview } from "@/lib/hooks";

export default function PerformancePage() {
  const { data: perf, isLoading } = usePerformanceOverview();

  const stats = [
    { label: "Total Signals", value: perf?.totalSignals ?? 0, icon: BarChart3 },
    { label: "Win Rate", value: `${perf?.winRate ?? 0}%`, icon: TrendingUp },
    { label: "Avg Return", value: `${perf?.avgReturn ?? 0}%`, icon: Target },
    { label: "Avg Drawdown", value: `${perf?.avgDrawdown ?? 0}%`, icon: AlertTriangle },
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
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-[var(--font-heading)] text-lg font-semibold mb-4">Equity Curve</h2>
        <div className="h-48 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Chart will render once signals are closed and tracked.</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Past performance does not guarantee future results. Signals are for educational purposes only.
      </p>
    </div>
  );
}
