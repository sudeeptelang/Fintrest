"use client";

import { motion } from "framer-motion";
import { STEPS } from "@/lib/constants";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-32 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-block text-sm font-semibold text-primary mb-4 tracking-wide uppercase">
            How It Works
          </span>
          <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl font-bold tracking-tight">
            From raw data to{" "}
            <span className="gradient-text">actionable signals</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            A transparent, four-step process that turns market data into ranked
            trade ideas — delivered to you every morning.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              className="relative"
            >
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(100%+0.5rem)] w-[calc(100%-1rem)] h-px bg-gradient-to-r from-primary/30 to-transparent" />
              )}

              <div className="relative">
                <span className="font-[var(--font-heading)] text-5xl font-extrabold text-primary/10">
                  {step.step}
                </span>
                <h3 className="font-[var(--font-heading)] text-lg font-semibold mt-2 mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
