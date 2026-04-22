"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Deep Dive accordion — consolidation primitive for the ticker detail page.
 * Five rows collapsed by default. Each row surfaces a *specific* one-line
 * summary so a reader can judge whether it's worth expanding. Rows with
 * `emptyMessage` render greyed and disabled (the hide-until-populated rule
 * from docs/DESIGN_TICKER_DEEP_DIVE.md).
 */
export function DeepDiveAccordion({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[10px] border border-ink-200 bg-ink-0 overflow-hidden", className)}>
      <header className="px-6 py-4 border-b border-ink-200">
        <h2 className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">
          Deep dive
        </h2>
      </header>
      <div>{children}</div>
    </section>
  );
}

export function DeepDiveRow({
  title,
  summary,
  emptyMessage,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary: React.ReactNode;
  /** When set, row renders greyed and is not tappable. */
  emptyMessage?: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const disabled = !!emptyMessage;

  return (
    <div className="border-b border-ink-100 last:border-b-0">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between gap-6 px-6 py-5 text-left transition-colors",
          disabled ? "cursor-not-allowed" : "hover:bg-ink-50",
        )}
        aria-expanded={!disabled && open}
      >
        <div className="min-w-0">
          <div
            className={cn(
              "font-[var(--font-sans)] text-[14px] font-semibold",
              disabled ? "text-ink-400" : "text-ink-900",
            )}
          >
            {title}
          </div>
          <div
            className={cn(
              "mt-1 font-[var(--font-sans)] text-[12px] leading-[18px]",
              disabled ? "text-ink-400 italic" : "text-ink-500",
            )}
          >
            {emptyMessage ?? summary}
          </div>
        </div>
        <div
          className={cn(
            "text-[14px] leading-none shrink-0 transition-transform",
            disabled ? "text-ink-300" : "text-ink-400",
            open && !disabled && "rotate-90",
          )}
          aria-hidden
        >
          ›
        </div>
      </button>
      {open && !disabled && (
        <div className="px-6 pb-6 pt-1">
          {children}
        </div>
      )}
    </div>
  );
}
