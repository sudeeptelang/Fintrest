"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  ArrowUpRight,
} from "lucide-react";

const summaryCards = [
  {
    title: "Top Signal Today",
    value: "NVDA",
    subtitle: "Score: 92 / 100",
    change: "+3.2%",
    up: true,
    icon: TrendingUp,
  },
  {
    title: "Active Signals",
    value: "12",
    subtitle: "5 Buy · 4 Watch · 3 Avoid",
    change: "+2 new",
    up: true,
    icon: Activity,
  },
  {
    title: "Watchlist Alerts",
    value: "3",
    subtitle: "2 breakouts, 1 stop-loss",
    change: "Since 6:30 AM",
    up: true,
    icon: BarChart3,
  },
  {
    title: "Portfolio Signal Avg",
    value: "78.4",
    subtitle: "Across 8 watched stocks",
    change: "-1.2",
    up: false,
    icon: TrendingDown,
  },
];

const recentSignals = [
  { ticker: "NVDA", score: 92, type: "BUY TODAY", time: "6:30 AM" },
  { ticker: "AAPL", score: 87, type: "BUY TODAY", time: "6:30 AM" },
  { ticker: "MSFT", score: 84, type: "WATCH", time: "6:30 AM" },
  { ticker: "AMZN", score: 81, type: "WATCH", time: "6:30 AM" },
  { ticker: "TSLA", score: 78, type: "WATCH", time: "6:30 AM" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Good morning. Here&apos;s your market overview for today.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">
                {card.title}
              </span>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="font-[var(--font-heading)] text-2xl font-bold">
              {card.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {card.subtitle}
            </p>
            <p
              className={`text-xs font-medium mt-2 ${card.up ? "text-emerald-500" : "text-red-500"}`}
            >
              {card.change}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Recent signals */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-[var(--font-heading)] text-lg font-semibold">
            Today&apos;s Signals
          </h2>
          <a
            href="/picks"
            className="text-sm text-primary font-medium hover:text-primary/80 flex items-center gap-1"
          >
            View all <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
        <div className="divide-y divide-border">
          {recentSignals.map((signal) => (
            <div
              key={signal.ticker}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="font-[var(--font-mono)] text-xs font-bold text-primary">
                    {signal.ticker.slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold font-[var(--font-mono)]">
                    {signal.ticker}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {signal.time}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    signal.type === "BUY TODAY"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-amber-500/10 text-amber-500"
                  }`}
                >
                  {signal.type}
                </span>
                <span className="font-[var(--font-mono)] text-sm font-bold w-8 text-right">
                  {signal.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
