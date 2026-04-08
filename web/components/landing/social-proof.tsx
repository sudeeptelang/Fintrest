"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Marcus T.",
    role: "Swing Trader",
    content:
      "Fintrest replaced 3 hours of morning research with one glance at my dashboard. The signal explanations actually make me a better trader.",
    rating: 5,
  },
  {
    name: "Sarah K.",
    role: "Part-time Investor",
    content:
      "I love that every pick tells me WHY it scored high. No other platform does this with such clarity. The alerts before market open are a game changer.",
    rating: 5,
  },
  {
    name: "James L.",
    role: "Day Trader",
    content:
      "The 7-factor breakdown is brilliant. I can see exactly what's driving each signal — momentum, catalysts, sentiment — all in one view.",
    rating: 5,
  },
];

export function SocialProof() {
  return (
    <section className="relative py-24 sm:py-32 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-block text-sm font-semibold text-primary mb-4 tracking-wide uppercase">
            Trusted by Traders
          </span>
          <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl font-bold tracking-tight">
            What our users{" "}
            <span className="gradient-text">are saying</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="rounded-2xl border border-border/60 bg-card p-6"
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star
                    key={j}
                    className="h-4 w-4 fill-primary text-primary"
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                &ldquo;{t.content}&rdquo;
              </p>
              <div>
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
