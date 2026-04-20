"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

/**
 * Marketing hero — v2 Forest & Rust. Single column over ink-0 white, with
 * a score-ring demo panel underneath. Per docs/fintrest_screens_v2_preview.html.
 *
 * The old two-column hero with a navy CapabilityInfographic on the right is
 * gone; the Lens 4-step flow it used to carry now lives in the dedicated
 * Lens section below (how-it-works / lens-steps).
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink-0">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 lg:pt-32 pb-16 lg:pb-24">
        {/* Badge */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="inline-flex items-center gap-2 rounded-full bg-forest-light border border-forest/20 px-3.5 py-2 mb-8"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest opacity-40" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-forest" />
          </span>
          <span className="text-xs font-medium text-forest-dark tracking-wide">
            Research layer · Updated every morning before the open
          </span>
        </motion.div>

        {/* H1 */}
        <motion.h1
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="font-[var(--font-heading)] text-4xl sm:text-5xl lg:text-[64px] xl:text-[72px] font-bold text-ink-950 leading-[1.05] tracking-[-0.025em] max-w-[900px]"
        >
          Every stock idea,{" "}
          <span className="gradient-text">stress-tested before the open.</span>
        </motion.h1>

        {/* Subcopy */}
        <motion.p
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-6 text-base sm:text-lg text-ink-600 max-w-[680px] leading-relaxed"
        >
          Fintrest runs 500+ US stocks through a 7-factor research engine every
          morning. You see which setups passed the test, exactly why they
          passed, and the full audit trail — including the losers.{" "}
          <span className="text-ink-900 font-medium">
            Research, not recommendations.
          </span>
        </motion.p>

        {/* CTAs */}
        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-10 flex flex-col sm:flex-row gap-3"
        >
          <Link href="/auth/signup">
            <Button
              size="lg"
              className="bg-forest hover:bg-forest-dark text-ink-0 h-12 px-7 text-sm font-semibold rounded-md"
            >
              Start free
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
          <Link href="#how-it-works">
            <Button
              variant="outline"
              size="lg"
              className="border-ink-300 text-ink-900 hover:border-ink-500 hover:bg-ink-50 h-12 px-7 text-sm font-semibold rounded-md"
            >
              <Play className="mr-1.5 h-4 w-4" />
              See how the engine works
            </Button>
          </Link>
        </motion.div>

        {/* Trust line */}
        <motion.div
          custom={4}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-8 flex items-center gap-4 text-xs text-ink-500"
        >
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-ink-400" />
            No credit card required
          </span>
          <span className="h-0.5 w-0.5 rounded-full bg-ink-400" aria-hidden />
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-ink-400" />
            30-second setup
          </span>
          <span className="h-0.5 w-0.5 rounded-full bg-ink-400" aria-hidden />
          <span className="hidden sm:inline">Cancel anytime</span>
        </motion.div>

        {/* Hero visual — score ring demo panel */}
        <motion.div
          custom={5}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-16 lg:mt-20"
        >
          <HeroScoreRingPanel />
        </motion.div>
      </div>
    </section>
  );
}

/**
 * The signature visual: a 7-segment score ring on a quiet panel, with
 * a short editorial caption on the left. This is the v2 "what makes us
 * different" marker — the ring's job is to telegraph "research has an
 * anatomy" at first glance.
 */
function HeroScoreRingPanel() {
  // 7 segments, one per factor. Each segment is a 51.43° arc with a 2° gap,
  // colored up-green (score ≥ 40) against an ink-100 track. Percentages are
  // purely illustrative — they match a "NVDA 87/100 BUY TODAY" demo state.
  const factors: Array<{ label: string; score: number }> = [
    { label: "Momentum",    score: 92 },
    { label: "Rel Volume",  score: 88 },
    { label: "Catalyst",    score: 76 },
    { label: "Earnings",    score: 81 },
    { label: "Sentiment",   score: 72 },
    { label: "Trend",       score: 94 },
    { label: "Risk",        score: 68 },
  ];

  // Compute arc paths: we render 7 arcs around a 108-radius circle in a 240×240 viewBox.
  const cx = 120, cy = 120, r = 108;
  const gap = 2;                          // degrees between segments
  const segArc = 360 / 7 - gap;           // degrees of each segment
  const startOffset = -90;                // begin at 12 o'clock

  const polar = (angleDeg: number) => {
    const a = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  return (
    <div className="rounded-xl border border-ink-200 bg-ink-50 p-8 lg:p-12 grid lg:grid-cols-[1fr_320px] gap-8 lg:gap-12 items-center">
      <div>
        <p className="text-[11px] font-semibold text-forest tracking-[0.1em] uppercase mb-3">
          The signature
        </p>
        <h2 className="font-[var(--font-heading)] text-2xl lg:text-3xl font-semibold text-ink-950 tracking-[-0.01em] mb-4">
          The 7-factor score, visible at a glance.
        </h2>
        <p className="text-ink-600 text-base leading-relaxed max-w-md">
          Every signal carries a score ring. Seven segments, one per factor.
          Segment length = factor strength. One look tells you whether the
          score is driven by one great factor — or seven good ones.
        </p>
      </div>

      {/* Score ring SVG */}
      <div className="relative w-[240px] h-[240px] mx-auto">
        <svg viewBox="0 0 240 240" className="w-full h-full -rotate-90">
          {factors.map((f, i) => {
            const start = startOffset + i * (segArc + gap);
            const end = start + segArc;
            const s = polar(start);
            const e = polar(end);
            const largeArc = segArc > 180 ? 1 : 0;
            const pathD = `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
            // Fill length scales by score (40-100 maps to 0-100% of arc).
            const fillPct = Math.max(0, Math.min(100, (f.score - 40) * (100 / 60)));
            // Arc length ≈ 2πr × (segArc / 360). Dasharray trick to "fill" proportionally.
            const arcLen = (2 * Math.PI * r * segArc) / 360;
            const dashOn = arcLen * (fillPct / 100);
            const dashOff = arcLen - dashOn;
            return (
              <g key={f.label}>
                {/* track */}
                <path d={pathD} fill="none" stroke="var(--ink-100)" strokeWidth="8" />
                {/* fill */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="var(--up)"
                  strokeWidth="8"
                  strokeDasharray={`${dashOn} ${dashOff}`}
                  strokeLinecap="butt"
                />
              </g>
            );
          })}
        </svg>
        {/* Center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-[var(--font-mono)] text-[56px] leading-none font-medium text-ink-900 tracking-[-0.02em]">
            87
          </span>
          <span className="font-[var(--font-mono)] text-sm text-ink-500 mt-1">
            out of 100
          </span>
          <span className="text-[10px] font-semibold text-forest-dark tracking-[0.1em] uppercase mt-2.5">
            NVDA · BUY TODAY
          </span>
        </div>
      </div>
    </div>
  );
}
