"use client";

import { motion } from "framer-motion";
import {
  Brain,
  BarChart3,
  Bell,
  Target,
  TrendingUp,
  LayoutGrid,
} from "lucide-react";
import { FEATURES } from "@/lib/constants";

const iconMap = {
  brain: Brain,
  chart: BarChart3,
  bell: Bell,
  target: Target,
  trending: TrendingUp,
  grid: LayoutGrid,
} as const;

export function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-32 bg-ink-0">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-block text-xs font-semibold text-forest mb-4 tracking-[0.1em] uppercase">
            Research engine
          </span>
          <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl font-bold tracking-[-0.015em] text-ink-950">
            A research layer for{" "}
            <span className="gradient-text">self-directed traders</span>
          </h2>
          <p className="mt-4 text-ink-600 text-base leading-relaxed">
            Data-driven research with a full audit trail. Every score is
            explainable, every signal is traceable, every outcome is logged —
            losers included.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature, i) => {
            const Icon = iconMap[feature.icon];
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="group relative rounded-lg border border-ink-200 bg-ink-0 p-6 hover:border-ink-300 hover:shadow-e1 transition-all"
              >
                <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-md bg-forest-light text-forest-dark">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="font-[var(--font-heading)] text-lg font-semibold text-ink-950 mb-2 leading-snug">
                  {feature.title}
                </h3>
                <p className="text-sm text-ink-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
