"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePlan, planMeets } from "@/lib/hooks";

type Variant = "standard" | "personalized" | "low-confidence";

/**
 * Lens thesis card — the typographic signature of the product.
 *
 * Variants:
 * - standard: `forest` gutter, forest-light accent bg
 * - personalized (Elite): `rust` border accent + "Personalized" chip
 * - low-confidence: `ink-400` gutter + warn eyebrow
 *
 * Use <LensCardGated> instead of <LensCard> when the content should fade out for
 * the Free tier.
 */
export function LensCard({
  variant = "standard",
  eyebrow = "Lens's take",
  title,
  meta,
  children,
  footer = "Research only — your decision.",
  className,
}: {
  variant?: Variant;
  eyebrow?: string;
  title?: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const personalized = variant === "personalized";
  const lowConfidence = variant === "low-confidence";

  return (
    <section
      className={cn(
        "relative rounded-[10px] px-8 py-7",
        personalized
          ? "border border-[rgba(184,80,47,0.25)] bg-gradient-to-br from-[var(--lens-bg)] to-[#D4E3DA]"
          : lowConfidence
            ? "border border-ink-300 bg-ink-50"
            : "border border-[rgba(15,79,58,0.18)] bg-[var(--lens-bg)]",
        className,
      )}
    >
      <header className="flex items-center gap-2.5 mb-3.5">
        <LensMark tone={personalized ? "rust" : "forest"} />
        <span
          className={cn(
            "font-[var(--font-sans)] text-[11px] font-semibold uppercase tracking-[0.14em]",
            personalized ? "text-rust-dark" : lowConfidence ? "text-warn" : "text-forest-dark",
          )}
        >
          {eyebrow}
        </span>
        {personalized && (
          <span className="inline-flex items-center bg-rust text-ink-0 text-[10px] font-semibold tracking-[0.12em] uppercase rounded-[3px] px-2 py-[3px]">
            Personalized
          </span>
        )}
        {lowConfidence && (
          <span className="inline-flex items-center bg-warn-light text-warn text-[10px] font-semibold tracking-[0.12em] uppercase rounded-[3px] px-2 py-[3px] border border-[rgba(178,94,9,0.25)]">
            Low confidence
          </span>
        )}
        {meta && (
          <span className="ml-auto font-[var(--font-mono)] text-[11px] text-ink-500">
            {meta}
          </span>
        )}
      </header>

      {title && (
        <h3 className="font-[var(--font-heading)] text-[22px] leading-[30px] font-semibold text-ink-950 tracking-[-0.01em] mb-3">
          {title}
        </h3>
      )}

      <div className="font-[var(--font-sans)] text-[16px] leading-[28px] text-ink-800 max-w-[720px] [&_strong]:font-semibold [&_strong]:text-ink-950">
        {children}
      </div>

      {footer && (
        <div
          className={cn(
            "mt-4 pt-4 flex items-center gap-2 font-[var(--font-sans)] text-[12px] italic text-ink-600 border-t",
            personalized ? "border-[rgba(184,80,47,0.15)]" : "border-[rgba(15,79,58,0.15)]",
          )}
        >
          <span
            className={cn(
              "inline-block h-px w-6",
              personalized ? "bg-rust" : "bg-forest",
            )}
          />
          {footer}
        </div>
      )}
    </section>
  );
}

/**
 * Lens card that gates its body on tier. Free users see a fade-out + upgrade CTA.
 * Pro/Elite see the full content. Elite gets the `personalized` variant if
 * `personalizedForElite` is true.
 */
export function LensCardGated({
  children,
  title,
  eyebrow,
  meta,
  ctaHref = "/pricing",
  personalizedForElite = false,
  className,
}: {
  children: React.ReactNode;
  title?: React.ReactNode;
  eyebrow?: string;
  meta?: React.ReactNode;
  ctaHref?: string;
  personalizedForElite?: boolean;
  className?: string;
}) {
  const { plan } = usePlan();
  const isPro = planMeets(plan, "pro");
  const isElite = planMeets(plan, "elite");

  if (!isPro) {
    return (
      <section
        className={cn(
          "relative rounded-[10px] border border-[rgba(15,79,58,0.18)] bg-[var(--lens-bg)] px-8 py-7",
          className,
        )}
      >
        <header className="flex items-center gap-2.5 mb-3.5">
          <LensMark tone="forest" />
          <span className="font-[var(--font-sans)] text-[11px] font-semibold uppercase tracking-[0.14em] text-forest-dark">
            {eyebrow ?? "Lens's take"}
          </span>
        </header>
        {title && (
          <h3 className="font-[var(--font-heading)] text-[22px] leading-[30px] font-semibold text-ink-950 tracking-[-0.01em] mb-3">
            {title}
          </h3>
        )}
        <div className="relative font-[var(--font-sans)] text-[16px] leading-[28px] text-ink-800 max-w-[720px] [&_strong]:font-semibold [&_strong]:text-ink-950">
          {children}
          <span className="pointer-events-none absolute left-0 right-0 -bottom-1 h-10 bg-gradient-to-b from-transparent to-[var(--lens-bg)]" />
        </div>
        <div className="mt-5 pt-5 border-t border-[rgba(15,79,58,0.2)] flex items-center gap-4">
          <div className="flex-1 text-[13px] leading-[20px] text-ink-700">
            <strong className="font-semibold text-ink-950">Continue reading on Pro.</strong>{" "}
            Full Lens thesis, reference levels, and 7-factor breakdown on every signal.
          </div>
          <Link
            href={ctaHref}
            className="inline-flex items-center px-4 py-2.5 rounded-md bg-forest text-ink-0 text-[13px] font-semibold hover:bg-forest-dark transition-colors whitespace-nowrap"
          >
            Upgrade · $29/mo
          </Link>
        </div>
      </section>
    );
  }

  return (
    <LensCard
      variant={isElite && personalizedForElite ? "personalized" : "standard"}
      title={title}
      eyebrow={eyebrow}
      meta={meta}
      className={className}
    >
      {children}
    </LensCard>
  );
}

export function LensMark({
  tone = "forest",
  size = 22,
}: {
  tone?: "forest" | "rust";
  size?: number;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-[5px] text-ink-0 font-[var(--font-heading)] font-bold leading-none",
        tone === "rust" ? "bg-rust" : "bg-forest",
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.59) }}
      aria-hidden
    >
      L
    </span>
  );
}
