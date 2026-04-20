"use client";

import { motion } from "framer-motion";
import { STEPS } from "@/lib/constants";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-32 bg-ink-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header — centered editorial intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-block text-xs font-semibold text-forest mb-4 tracking-[0.1em] uppercase">
            How it works
          </span>
          <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl font-bold tracking-[-0.015em] text-ink-950">
            From raw data to{" "}
            <span className="gradient-text">stress-tested research</span>
          </h2>
          <p className="mt-4 text-ink-600 text-base leading-relaxed">
            A transparent four-step process that runs every morning before the
            open. Market data goes in; a ranked, stress-tested research set
            comes out.
          </p>
        </motion.div>

        {/* Steps — 4-col grid of white cards with a small forest step label */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="rounded-lg border border-ink-200 bg-ink-0 p-6 hover:border-ink-300 hover:shadow-e1 transition-all"
            >
              {/* Small monospace step number — v2 lens-step-num style.
                  Solid forest, 13px, not a giant ghost glyph. */}
              <p className="font-[var(--font-mono)] text-[13px] font-medium text-forest tracking-wide mb-4">
                {step.step}
              </p>
              <h3 className="font-[var(--font-heading)] text-lg font-semibold text-ink-950 mb-3 leading-snug">
                {step.title}
              </h3>
              <p className="text-sm text-ink-600 leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
