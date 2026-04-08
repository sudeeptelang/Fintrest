"use client";

import { motion } from "framer-motion";
import { Calendar, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const swingSetups = [
  {
    ticker: "NVDA",
    name: "NVIDIA Corp",
    score: 92,
    thesis: "Strong momentum above 50-day MA with volume expansion. Earnings catalyst on Apr 22. AI infrastructure demand accelerating.",
    entry: "$892",
    target: "$945",
    stop: "$865",
    rr: "2.1:1",
    timeframe: "5–10 days",
    factors: ["Momentum: 95", "Volume: 88", "Catalyst: 92"],
  },
  {
    ticker: "AAPL",
    name: "Apple Inc",
    score: 87,
    thesis: "Breakout above $195 resistance with above-average volume. Positive analyst revisions ahead of WWDC. Strong relative strength vs SPY.",
    entry: "$198",
    target: "$215",
    stop: "$190",
    rr: "2.1:1",
    timeframe: "7–14 days",
    factors: ["Momentum: 88", "Trend: 85", "Sentiment: 82"],
  },
  {
    ticker: "AMZN",
    name: "Amazon.com",
    score: 81,
    thesis: "Consolidation breakout forming above $182. AWS revenue acceleration narrative. Institutional accumulation visible on volume profile.",
    entry: "$186",
    target: "$200",
    stop: "$178",
    rr: "1.8:1",
    timeframe: "7–14 days",
    factors: ["Fundamentals: 86", "Volume: 78", "Trend: 80"],
  },
];

export default function SwingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold">
            Swing Trade Setups
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Weekly trade ideas with full thesis, entry/stop/target, and AI
            explanation.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          Week of Apr 7, 2026
        </div>
      </div>

      <div className="space-y-4">
        {swingSetups.map((setup, i) => (
          <motion.div
            key={setup.ticker}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              {/* Left — info */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="font-[var(--font-mono)] text-xs font-bold text-primary">
                      {setup.ticker.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-[var(--font-mono)] font-bold">
                        {setup.ticker}
                      </p>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                        Score: {setup.score}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {setup.name}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {setup.thesis}
                </p>

                <div className="flex flex-wrap gap-2">
                  {setup.factors.map((f) => (
                    <span
                      key={f}
                      className="text-xs font-[var(--font-mono)] bg-muted px-2.5 py-1 rounded-md"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right — trade zone */}
              <div className="lg:w-64 shrink-0 rounded-xl bg-muted/50 border border-border p-4 space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Trade Zone
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Entry</span>
                    <span className="font-[var(--font-mono)] font-semibold">{setup.entry}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Target</span>
                    <span className="font-[var(--font-mono)] font-semibold text-emerald-500">{setup.target}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Stop-Loss</span>
                    <span className="font-[var(--font-mono)] font-semibold text-red-500">{setup.stop}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">R:R Ratio</span>
                    <span className="font-[var(--font-mono)] font-semibold">{setup.rr}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Timeframe</span>
                    <span className="font-[var(--font-mono)] text-xs">{setup.timeframe}</span>
                  </div>
                </div>
                <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-white mt-2">
                  View Full Analysis
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
