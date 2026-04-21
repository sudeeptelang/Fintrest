"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="relative py-24 sm:py-32 bg-ink-0 overflow-hidden">
      <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-bold tracking-[-0.02em] text-ink-950">
            Ready to see{" "}
            <span className="gradient-text">what passed the test?</span>
          </h2>
          <p className="mt-6 text-base sm:text-lg text-ink-600 max-w-xl mx-auto leading-relaxed">
            Join self-directed traders who start their day with Fintrest
            research. Free to begin. No credit card required.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="bg-forest hover:bg-forest-dark text-ink-0 h-12 px-7 text-sm font-semibold rounded-md w-full sm:w-auto"
              >
                Start free
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/picks">
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-7 text-sm font-semibold rounded-md border-ink-300 text-ink-900 hover:border-ink-500 hover:bg-ink-50 w-full sm:w-auto"
              >
                See today&apos;s research
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
