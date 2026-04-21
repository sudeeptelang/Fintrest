"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

// FTC 16 CFR § 255 requires each testimonial to carry a compensation disclosure
// adjacent to the testimonial — not in a footnote.
const testimonials = [
  {
    name: "Marcus T.",
    role: "Swing Trader",
    content:
      "Fintrest replaced 3 hours of morning research with one glance at my dashboard. The Lens explanations walk me through what the model saw and why — the research is the value, not just the list.",
    rating: 5,
    compensated: false,
  },
  {
    name: "Sarah K.",
    role: "Part-time Investor",
    content:
      "I love that every signal tells me why it scored high. No other platform does this with such clarity. The research drop before the open is the part I never miss.",
    rating: 5,
    compensated: false,
  },
  {
    name: "James L.",
    role: "Day Trader",
    content:
      "The 7-factor breakdown is brilliant. I can see exactly what's driving each signal — momentum, catalysts, sentiment — all in one view. It's the quality-assurance layer I used to build myself in a spreadsheet.",
    rating: 5,
    compensated: false,
  },
];

export function SocialProof() {
  return (
    <section className="relative py-24 sm:py-32 bg-ink-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-block text-xs font-semibold text-forest mb-4 tracking-[0.1em] uppercase">
            What Fintrest users say
          </span>
          <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl font-bold tracking-[-0.015em] text-ink-950">
            What users say about{" "}
            <span className="gradient-text">the research</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="rounded-lg border border-ink-200 bg-ink-0 p-6 flex flex-col hover:border-ink-300 hover:shadow-e1 transition-all"
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star
                    key={j}
                    className="h-4 w-4 fill-[color:var(--up)] text-[color:var(--up)]"
                  />
                ))}
              </div>
              <p className="text-sm text-ink-700 leading-relaxed mb-5 flex-1">
                &ldquo;{t.content}&rdquo;
              </p>
              <div>
                <p className="text-sm font-semibold text-ink-950">{t.name}</p>
                <p className="text-xs text-ink-500 mt-0.5">{t.role}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-ink-200 text-[11px] leading-snug text-ink-500">
                <p className="font-medium text-ink-700">
                  Testimonial from a Fintrest.ai user.{" "}
                  {t.compensated ? (
                    <span>
                      Compensated — this user received consideration in
                      exchange for this testimonial.
                    </span>
                  ) : (
                    <span>
                      Not compensated — this user was not paid for this
                      testimonial.
                    </span>
                  )}
                </p>
                <p className="mt-1">
                  Individual results vary. This testimonial reflects one
                  user&apos;s experience and is not representative of all
                  users. Past results do not guarantee future results.
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
