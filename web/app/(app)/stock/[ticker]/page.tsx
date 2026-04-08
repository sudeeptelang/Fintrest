"use client";

import { use } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  ArrowUpRight,
  BarChart3,
  Brain,
  Target,
  Shield,
  Newspaper,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const scoreBreakdown = [
  { label: "Momentum", score: 95, weight: "25%", color: "bg-emerald-500" },
  { label: "Rel. Volume", score: 88, weight: "15%", color: "bg-emerald-500" },
  { label: "News Catalyst", score: 92, weight: "15%", color: "bg-emerald-500" },
  { label: "Fundamentals", score: 85, weight: "15%", color: "bg-emerald-400" },
  { label: "Sentiment", score: 78, weight: "10%", color: "bg-amber-400" },
  { label: "Trend Strength", score: 90, weight: "10%", color: "bg-emerald-500" },
  { label: "Risk Filter", score: 72, weight: "10%", color: "bg-amber-400" },
];

const news = [
  { title: "NVIDIA beats Q4 estimates, raises guidance on AI demand", time: "2h ago", sentiment: "positive" },
  { title: "Analyst upgrades NVDA to Overweight, $1000 target", time: "5h ago", sentiment: "positive" },
  { title: "Data center revenue up 409% year-over-year", time: "1d ago", sentiment: "positive" },
];

interface StockDetailPageProps {
  params: Promise<{ ticker: string }>;
}

export default function StockDetailPage({ params }: StockDetailPageProps) {
  const { ticker } = use(params);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="font-[var(--font-mono)] text-sm font-bold text-primary">
              {ticker.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase">
                {ticker}
              </h1>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500">
                BUY TODAY
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              NVIDIA Corporation &middot; NASDAQ
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Add to Watchlist
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
            Set Alert
          </Button>
        </div>
      </div>

      {/* Price + Score row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Current Price</p>
          <p className="font-[var(--font-mono)] text-2xl font-bold">$892.40</p>
          <p className="text-xs text-emerald-500 font-medium mt-1 flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3" />
            +3.2% today
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Signal Score</p>
          <p className="font-[var(--font-heading)] text-2xl font-bold">92 <span className="text-sm font-normal text-muted-foreground">/ 100</span></p>
          <p className="text-xs text-emerald-500 font-medium mt-1">Top 3% today</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Trade Zone</p>
          <div className="space-y-1">
            <p className="text-sm"><span className="text-muted-foreground">Entry:</span> <span className="font-[var(--font-mono)] font-semibold">$892</span></p>
            <p className="text-sm"><span className="text-muted-foreground">Target:</span> <span className="font-[var(--font-mono)] font-semibold text-emerald-500">$945</span></p>
            <p className="text-sm"><span className="text-muted-foreground">Stop:</span> <span className="font-[var(--font-mono)] font-semibold text-red-500">$865</span></p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Risk / Reward</p>
          <p className="font-[var(--font-mono)] text-2xl font-bold">2.1 : 1</p>
          <p className="text-xs text-muted-foreground mt-1">Favorable setup</p>
        </div>
      </div>

      {/* Chart placeholder */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[var(--font-heading)] text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-4.5 w-4.5 text-muted-foreground" />
            Price Chart
          </h2>
          <div className="flex gap-1">
            {["1D", "1W", "1M", "3M", "1Y"].map((range) => (
              <button
                key={range}
                className="px-3 py-1 text-xs rounded-md font-medium text-muted-foreground hover:bg-muted transition-colors data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                data-active={range === "3M"}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            TradingView Lightweight Chart — will render here
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Score breakdown */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-[var(--font-heading)] text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-4.5 w-4.5 text-muted-foreground" />
            Score Breakdown
          </h2>
          <div className="space-y-3">
            {scoreBreakdown.map((factor, i) => (
              <motion.div
                key={factor.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">{factor.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{factor.weight}</span>
                    <span className="font-[var(--font-mono)] text-sm font-bold w-7 text-right">
                      {factor.score}
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${factor.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${factor.score}%` }}
                    transition={{ delay: 0.2 + i * 0.05, duration: 0.5 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* AI Explanation + News */}
        <div className="space-y-6">
          {/* AI Explanation */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-[var(--font-heading)] text-lg font-semibold mb-3 flex items-center gap-2">
              <Brain className="h-4.5 w-4.5 text-muted-foreground" />
              AI Analysis
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              NVDA ranks in the <strong className="text-foreground">top 3%</strong> of all scanned
              stocks today. The primary driver is exceptional <strong className="text-foreground">momentum</strong> — price
              is trading well above its 20, 50, and 200-day moving averages with accelerating
              rate of change. <strong className="text-foreground">Relative volume</strong> is 2.8x the 30-day average,
              confirming institutional interest. A strong earnings catalyst (Q4 beat + raised
              guidance) provides fundamental support. The risk profile is moderate with ATR-based
              stop placement at $865.
            </p>
          </div>

          {/* News */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-[var(--font-heading)] text-lg font-semibold mb-3 flex items-center gap-2">
              <Newspaper className="h-4.5 w-4.5 text-muted-foreground" />
              Recent News
            </h2>
            <div className="space-y-3">
              {news.map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
