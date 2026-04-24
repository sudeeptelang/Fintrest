"use client";

import { useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Deep Dive accordion — consolidation primitive for the ticker detail
 * page. v3 defaults each row to OPEN — users want the full data on
 * first paint instead of hunting for it. Rows with `emptyMessage`
 * render greyed and disabled (hide-until-populated rule from
 * docs/DESIGN_TICKER_DEEP_DIVE.md).
 *
 * Optional `family` prop tints the row's left border with the v3
 * factor palette so "Fundamentals" reads amber, "Related news" reads
 * plum, "Price chart" reads navy, etc. — continues the family
 * language started in the factor breakdown panel.
 */

type Family = "technical" | "fundamentals" | "sentiment" | "smart" | "brand" | "neutral";

const FAMILY_ACCENT: Record<Family, string> = {
  technical:    "before:bg-navy",
  fundamentals: "before:bg-amber",
  sentiment:    "before:bg-plum",
  smart:        "before:bg-teal",
  brand:        "before:bg-forest",
  neutral:      "before:bg-ink-300",
};

export function DeepDiveAccordion({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[12px] border border-ink-200 bg-ink-0 overflow-hidden", className)}>
      <header className="px-6 py-3.5 border-b border-ink-200 bg-ink-50 flex items-baseline justify-between">
        <h2 className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600">
          Deep dive
        </h2>
        <span className="font-mono text-[11px] text-ink-500">
          All sections expanded by default
        </span>
      </header>
      <div>{children}</div>
    </section>
  );
}

export function DeepDiveRow({
  title,
  summary,
  emptyMessage,
  family = "neutral",
  defaultOpen = true,
  children,
}: {
  title: string;
  summary: React.ReactNode;
  emptyMessage?: string;
  family?: Family;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const disabled = !!emptyMessage;
  const accent = FAMILY_ACCENT[family];

  return (
    <div
      className={cn(
        "relative border-b border-ink-100 last:border-b-0",
        // Left 3px family-tint accent via ::before — cheap, no extra DOM
        "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px]",
        disabled ? "before:bg-ink-200" : accent,
      )}
    >
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between gap-6 pl-7 pr-6 py-5 text-left transition-colors",
          disabled ? "cursor-not-allowed" : "hover:bg-ink-50",
        )}
        aria-expanded={!disabled && open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-[var(--font-heading)] text-[15px] font-semibold tracking-[-0.005em]",
                disabled ? "text-ink-400" : "text-ink-900",
              )}
            >
              {title}
            </span>
            {disabled && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-ink-100 text-ink-500 text-[9px] font-semibold uppercase tracking-[0.06em]">
                <Lock className="h-2.5 w-2.5" strokeWidth={2.5} />
                Pending
              </span>
            )}
          </div>
          <div
            className={cn(
              "mt-1 font-[var(--font-sans)] text-[12px] leading-[18px]",
              disabled ? "text-ink-400 italic" : "text-ink-600",
            )}
          >
            {emptyMessage ?? summary}
          </div>
        </div>
        {!disabled && (
          <ChevronDown
            className={cn(
              "h-4 w-4 text-ink-400 shrink-0 transition-transform duration-[120ms]",
              open && "rotate-180 text-ink-700",
            )}
            strokeWidth={2.2}
            aria-hidden
          />
        )}
      </button>
      {open && !disabled && (
        <div className="pl-7 pr-6 pb-6 pt-1">
          {children}
        </div>
      )}
    </div>
  );
}
