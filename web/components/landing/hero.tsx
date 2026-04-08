"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play, TrendingUp, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

const mockSignals = [
  { ticker: "NVDA", score: 92, type: "BUY TODAY", change: "+3.2%" },
  { ticker: "AAPL", score: 87, type: "BUY TODAY", change: "+1.8%" },
  { ticker: "MSFT", score: 84, type: "WATCH", change: "+0.9%" },
  { ticker: "TSLA", score: 78, type: "WATCH", change: "+2.4%" },
  { ticker: "META", score: 71, type: "WATCH", change: "+1.1%" },
];

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-navy" />
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-32 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — copy */}
          <div>
            <motion.div
              custom={0}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-sm font-medium text-primary">
                Live signals updated daily
              </span>
            </motion.div>

            <motion.h1
              custom={1}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="font-[var(--font-heading)] text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight"
            >
              Pick Winning Stocks{" "}
              <span className="gradient-text">Before The Market Does</span>
            </motion.h1>

            <motion.p
              custom={2}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-6 text-lg text-white/60 max-w-lg leading-relaxed"
            >
              AI-powered swing trade discovery with explainable signals.
              Transparent scoring, daily research delivered before the open.
              No black boxes.
            </motion.p>

            <motion.div
              custom={3}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-8 flex flex-col sm:flex-row gap-4"
            >
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-white h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25"
              >
                Start Free Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/20 text-white hover:bg-white/10 h-12 px-8 text-base"
              >
                <Play className="mr-2 h-4 w-4" />
                Watch Demo
              </Button>
            </motion.div>

            <motion.div
              custom={4}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-10 flex items-center gap-6 text-sm text-white/40"
            >
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-primary" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary" />
                Setup in 30 seconds
              </span>
            </motion.div>
          </div>

          {/* Right — live signal preview */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-primary/5 blur-xl" />
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-[var(--font-heading)] text-sm font-semibold text-white">
                    Today&apos;s Top Signals
                  </h3>
                  <p className="text-xs text-white/40 mt-0.5 font-[var(--font-mono)]">
                    Apr 8, 2026 &middot; Pre-Market
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-primary text-xs font-medium">
                  <TrendingUp className="h-3.5 w-3.5" />
                  5 signals
                </div>
              </div>

              {/* Signal list */}
              <div className="space-y-2">
                {mockSignals.map((signal, i) => (
                  <motion.div
                    key={signal.ticker}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.08 }}
                    className="flex items-center justify-between rounded-xl bg-white/[0.04] border border-white/[0.06] px-4 py-3 hover:bg-white/[0.07] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="font-[var(--font-heading)] text-xs font-bold text-primary">
                          {signal.ticker.slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white font-[var(--font-mono)]">
                          {signal.ticker}
                        </p>
                        <p className="text-xs text-white/40">{signal.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-white/10 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${signal.score}%` }}
                            transition={{ delay: 0.8 + i * 0.08, duration: 0.6 }}
                          />
                        </div>
                        <span className="text-sm font-bold text-white font-[var(--font-mono)] w-7 text-right">
                          {signal.score}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-400 mt-0.5 font-[var(--font-mono)]">
                        {signal.change}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-xs text-white/30">
                  Refreshed every trading day at 6:30 AM ET
                </span>
                <span className="text-xs text-primary font-medium cursor-pointer hover:text-primary/80 transition-colors">
                  View all &rarr;
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
