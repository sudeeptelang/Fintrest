"use client";

import { motion } from "framer-motion";
import { TrendingUp, Target, AlertTriangle, BarChart3 } from "lucide-react";

const overviewStats = [
  { label: "Total Signals", value: "2,438", icon: BarChart3 },
  { label: "Win Rate", value: "73.2%", icon: TrendingUp },
  { label: "Avg Return", value: "+12.4%", icon: Target },
  { label: "Avg Drawdown", value: "-2.8%", icon: AlertTriangle },
];

const recentResults = [
  { ticker: "NVDA", entry: "$845", exit: "$912", returnPct: "+7.9%", result: "win", days: 6 },
  { ticker: "AAPL", entry: "$188", exit: "$198", returnPct: "+5.3%", result: "win", days: 8 },
  { ticker: "TSLA", entry: "$182", exit: "$175", returnPct: "-3.8%", result: "loss", days: 4 },
  { ticker: "MSFT", entry: "$410", exit: "$432", returnPct: "+5.4%", result: "win", days: 10 },
  { ticker: "META", entry: "$495", exit: "$520", returnPct: "+5.1%", result: "win", days: 7 },
  { ticker: "AMZN", entry: "$178", exit: "$186", returnPct: "+4.5%", result: "win", days: 9 },
  { ticker: "GOOGL", entry: "$152", exit: "$148", returnPct: "-2.6%", result: "loss", days: 5 },
  { ticker: "AMD", entry: "$155", exit: "$168", returnPct: "+8.4%", result: "win", days: 11 },
];

export default function PerformancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold">
          Performance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Full transparency. Every signal tracked from entry to exit.
        </p>
      </div>

      {/* Overview stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="font-[var(--font-heading)] text-2xl font-bold">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Equity curve placeholder */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-[var(--font-heading)] text-lg font-semibold mb-4">
          Equity Curve
        </h2>
        <div className="h-48 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Cumulative return chart — will render here
          </p>
        </div>
      </div>

      {/* Recent results */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-[var(--font-heading)] text-lg font-semibold">
            Recent Signal Results
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Stock</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Entry</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Exit</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Return</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Result</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Days Held</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentResults.map((r, i) => (
                <motion.tr
                  key={`${r.ticker}-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-muted/20 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <span className="font-[var(--font-mono)] font-semibold">{r.ticker}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-[var(--font-mono)] text-muted-foreground">{r.entry}</td>
                  <td className="px-5 py-3.5 text-right font-[var(--font-mono)] text-muted-foreground">{r.exit}</td>
                  <td className={`px-5 py-3.5 text-right font-[var(--font-mono)] font-medium ${r.result === "win" ? "text-emerald-500" : "text-red-500"}`}>
                    {r.returnPct}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      r.result === "win" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    }`}>
                      {r.result === "win" ? "Win" : "Loss"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-[var(--font-mono)] text-muted-foreground">{r.days}d</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Based on backtested and live signals from Jan 2024 – Apr 2026. Past performance does not guarantee future results.
      </p>
    </div>
  );
}
