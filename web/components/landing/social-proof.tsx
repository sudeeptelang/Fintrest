"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

// Honest trust block — replaces the old fake-testimonial layout per
// FINTREST_UX_SPEC §20 rule 1. We don't have named beta users with
// linkable profiles yet, and shipping generic "Marcus T., Swing Trader"
// testimonials is an FTC 16 CFR § 255 risk even with disclosure.
//
// Instead: the audit log IS the proof. Three stats + a link to the
// public log that includes wins AND losses. When we have real named
// beta users later, a testimonial row can slot in above this block.
//
// File name kept as social-proof.tsx so app/page.tsx imports don't
// break. The section is "audit log preview" in spirit; the export
// stays `SocialProof` for stability.

export function SocialProof() {
  return (
    <section className="relative py-24 sm:py-32 bg-ink-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <span className="inline-block text-xs font-semibold text-forest mb-4 tracking-[0.1em] uppercase">
            The trust mechanism
          </span>
          <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl font-semibold tracking-[-0.015em] text-ink-950">
            Every signal is public —
            <span className="gradient-text"> wins and losses.</span>
          </h2>
          <p className="mt-4 text-base text-ink-600">
            We don&apos;t hide the losers. Every signal Fintrest has ever
            published lives in the audit log, with its entry, exit, and
            outcome. This is how you tell a research platform that&apos;s
            earned your attention from one that hasn&apos;t.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="rounded-[12px] border border-ink-200 bg-ink-0 p-8 shadow-e1 max-w-3xl mx-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <TrustStat label="Losers not hidden" value="100%" sub="Every stopped-out signal published" />
            <TrustStat label="Factor scores shown" value="All 8" sub="Every factor that drove the composite" />
            <TrustStat label="Data provenance" value="Every row" sub="Source + staleness disclosed" />
          </div>
          <div className="border-t border-ink-100 pt-5 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-ink-600">
              Read the methodology, then open the audit log. Decide for yourself.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/methodology"
                className="text-sm font-semibold text-ink-700 hover:text-ink-950"
              >
                Methodology
              </Link>
              <Link
                href="/audit"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:text-forest-dark"
              >
                See the audit log
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function TrustStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">
        {label}
      </p>
      <p className="mt-2 font-[var(--font-heading)] text-[28px] leading-none font-semibold text-ink-950">
        {value}
      </p>
      <p className="mt-1.5 text-[12px] text-ink-500 leading-snug">{sub}</p>
    </div>
  );
}
