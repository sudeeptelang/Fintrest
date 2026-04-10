"use client";

import { motion } from "framer-motion";
import type { SignalBreakdown } from "@/lib/api";

interface FactorGaugeProps {
  label: string;
  score: number;
  weight: string;
  source: string;
  delay?: number;
}

function FactorGauge({ label, score, weight, source, delay = 0 }: FactorGaugeProps) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color =
    score >= 70 ? "#00b87c" : score >= 50 ? "#d97706" : "#d94f3d";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="rounded-xl border border-border bg-card p-4 flex flex-col items-center"
    >
      {/* Gauge */}
      <div className="relative w-20 h-20">
        <svg width="80" height="80" viewBox="0 0 80 80">
          {/* Background arc */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-muted/20"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={0}
            transform="rotate(-90 40 40)"
          />
          {/* Progress arc */}
          <motion.circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ delay: delay + 0.2, duration: 0.8, ease: "easeOut" }}
            transform="rotate(-90 40 40)"
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-[var(--font-mono)] text-lg font-bold"
            style={{ color }}
          >
            {Math.round(score)}
          </span>
        </div>
      </div>

      {/* Label */}
      <p className="text-xs font-semibold mt-2 text-center">{label}</p>
      <p className="text-[10px] text-muted-foreground text-center">{weight} weight</p>
      <p className="text-[10px] text-muted-foreground/60 text-center mt-0.5">{source}</p>
    </motion.div>
  );
}

interface FactorGaugesProps {
  breakdown: SignalBreakdown;
}

export function FactorGauges({ breakdown }: FactorGaugesProps) {
  const factors = [
    { label: "Momentum", score: breakdown.momentumScore, weight: "25%", source: "MACD, RSI, MAs" },
    { label: "Rel. Volume", score: breakdown.relVolumeScore, weight: "15%", source: "Vol vs 20d avg" },
    { label: "News", score: breakdown.newsScore, weight: "15%", source: "Sentiment + recency" },
    { label: "Fundamentals", score: breakdown.fundamentalsScore, weight: "15%", source: "EPS, P/E, growth" },
    { label: "Sentiment", score: breakdown.sentimentScore, weight: "10%", source: "Social + analyst" },
    { label: "Trend", score: breakdown.trendScore, weight: "10%", source: "MA alignment" },
    { label: "Risk", score: breakdown.riskScore, weight: "10%", source: "Volatility, beta" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {factors.map((f, i) => (
        <FactorGauge key={f.label} {...f} delay={i * 0.06} />
      ))}
    </div>
  );
}
