"use client";

import { cn } from "@/lib/utils";

type Tone = "forest" | "rust";

/**
 * Filter chip — 32px pill used for Lens filters on the signal board.
 * Forest tone = standard filter. Rust tone = editorial Lens filter (curated).
 */
export function FilterChip({
  active,
  count,
  tone = "forest",
  onClick,
  children,
  className,
}: {
  active?: boolean;
  count?: number;
  tone?: Tone;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const activeStyles =
    tone === "rust"
      ? "bg-rust-light text-rust-dark border-rust"
      : "bg-forest-light text-forest-dark border-forest";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border font-[var(--font-sans)] text-[13px] font-medium transition-colors",
        active
          ? activeStyles
          : "bg-ink-0 text-ink-700 border-ink-200 hover:border-ink-400",
        className,
      )}
    >
      {children}
      {typeof count === "number" && (
        <span
          className={cn(
            "font-[var(--font-mono)] text-[11px]",
            active
              ? tone === "rust"
                ? "text-rust"
                : "text-forest"
              : "text-ink-500",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
