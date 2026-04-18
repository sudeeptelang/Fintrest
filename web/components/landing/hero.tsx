"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight, Play, Shield, Zap, Sparkles,
  Radar, Target, Brain, Landmark, Users, Activity, Database, TrendingUp,
} from "lucide-react";
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

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-navy" />
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 lg:py-28 w-full">
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
                Research layer · Updated every morning before the open
              </span>
            </motion.div>

            <motion.h1
              custom={1}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="font-[var(--font-heading)] text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight"
            >
              Every stock idea,{" "}
              <span className="gradient-text">stress-tested before the open.</span>
            </motion.h1>

            <motion.p
              custom={2}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-6 text-lg text-white/60 max-w-lg leading-relaxed"
            >
              Fintrest runs 500+ US stocks through a 7-factor research engine
              every morning. You see which setups passed the test, exactly why
              they passed, and the full audit trail — including the losers.
              Research, not recommendations.
            </motion.p>

            <motion.div
              custom={3}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-8 flex flex-col sm:flex-row gap-4"
            >
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25"
                >
                  Start free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/20 text-white hover:bg-white/10 h-12 px-8 text-base"
                >
                  <Play className="mr-2 h-4 w-4" />
                  See how the engine works
                </Button>
              </Link>
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
                30-second setup
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-primary" />
                Cancel anytime
              </span>
            </motion.div>
          </div>

          {/* Right — capability infographic (the product stack, not a fake signal list) */}
          <CapabilityInfographic />
        </div>
      </div>
    </section>
  );
}

/**
 * Hero-right infographic showing Fintrest's product stack as four concentric capability rings
 * around a central Athena orb. Each ring represents a stage: Scan → Score → Narrate → Trade.
 * No fake tickers or fabricated data — it's an editorial visual of what the platform does.
 */
function CapabilityInfographic() {
  const rings = [
    {
      label: "Scan",
      color: "#00b87c",
      chips: [
        { icon: Radar,    text: "500+ US stocks scanned every morning" },
        { icon: Database, text: "Prices · fundamentals · news · options flow" },
        { icon: Activity, text: "Regime-aware · intraday drift correction" },
      ],
    },
    {
      label: "Score",
      color: "#3b6fd4",
      chips: [
        { icon: TrendingUp, text: "7-factor quant scoring · 0–100 per factor" },
        { icon: Target,     text: "Cross-sectional percentile rank within sector" },
        { icon: Shield,     text: "Regime-gated weights · bull · bear · chop" },
      ],
    },
    {
      label: "Narrate",
      color: "#00b87c",
      chips: [
        { icon: Brain,     text: "Lens thesis · plain English" },
        { icon: Sparkles,  text: "Setup type · dip · breakout · trend continuation" },
        { icon: Landmark,  text: "Catalysts · congress · insider · ownership" },
      ],
    },
    {
      label: "Review",
      color: "#00b87c",
      chips: [
        { icon: Target,  text: "Reference levels: entry · stop · target · R:R" },
        { icon: Zap,     text: "Real-time research alerts" },
        { icon: Users,   text: "Portfolio factor profile · you decide what to do" },
      ],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-primary/5 blur-xl" />
      <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-8 shadow-2xl overflow-hidden">
        {/* Orbiting decorative rings */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] rounded-full border border-white/[0.03]" />
        </div>

        {/* Athena badge — compact inline header, not a dominant orb */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="relative flex items-center gap-3 mb-5"
        >
          <div className="relative flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] shadow-lg shadow-blue-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Lens
            </p>
            <p className="text-[11px] text-white/50">
              The research layer at the center
            </p>
          </div>
        </motion.div>

        {/* Four capability rings, stacked */}
        <div className="space-y-3 relative">
          {rings.map((ring, i) => (
            <motion.div
              key={ring.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.12, duration: 0.5 }}
              className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${ring.color}22`, color: ring.color }}
                >
                  {i + 1}. {ring.label}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ring.chips.map((chip) => {
                  const Icon = chip.icon;
                  return (
                    <div
                      key={chip.text}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] border border-white/[0.05] px-2.5 py-1 text-[10.5px] text-white/80"
                    >
                      <Icon className="h-3 w-3" style={{ color: ring.color }} />
                      {chip.text}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-white/[0.06] text-center">
          <p className="text-[10px] text-white/40">
            See what passed the test — and exactly why.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
