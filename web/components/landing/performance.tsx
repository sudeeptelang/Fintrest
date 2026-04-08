"use client";

import { motion } from "framer-motion";
import { STATS } from "@/lib/constants";

export function Performance() {
  return (
    <section id="performance" className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-navy" />
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-block text-sm font-semibold text-primary mb-4 tracking-wide uppercase">
            Performance
          </span>
          <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Signals you can{" "}
            <span className="gradient-text">verify</span>
          </h2>
          <p className="mt-4 text-white/50 text-lg">
            We track every signal&apos;s outcome. Full transparency — no
            cherry-picking, no hidden losses.
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="text-center rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-8"
            >
              <p className="font-[var(--font-heading)] text-4xl sm:text-5xl font-extrabold text-white">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-white/40">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-xs text-white/25"
        >
          Based on backtested signals from Jan 2024 – Mar 2026. Past
          performance does not guarantee future results.
        </motion.p>
      </div>
    </section>
  );
}
