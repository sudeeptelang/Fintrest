"use client";

import { cn } from "@/lib/utils";

/**
 * Shared navy treatment for every Athena-voiced surface (thesis cards, pulse banner,
 * inline row expansions). Per CLAUDE.md design rule: Athena output NEVER renders on
 * plain white; it always gets the dark, editorial treatment. Centralizing this here
 * keeps the look consistent everywhere Athena speaks.
 *
 * Layered look:
 *   1. Linear gradient navy base (135deg, slightly lighter in the middle for depth)
 *   2. Radial glow in top-right, tinted by `accent` (default emerald, regime color on Pulse)
 *   3. Secondary soft green glow bottom-left for brand warmth
 *   4. Ultra-subtle grid texture at 5% opacity (Bloomberg / terminal feel)
 *   5. Top inner-highlight line (1px glass sheen)
 */
export function AthenaSurface({
  accent = "#00b87c",
  rounded = "rounded-2xl",
  className,
  children,
}: {
  accent?: string;
  rounded?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative text-white shadow-[0_12px_32px_rgba(16,12,8,0.12)] overflow-hidden border border-white/5",
        rounded,
        className,
      )}
      style={{
        backgroundImage: `
          radial-gradient(circle at 85% 15%, ${accent}22 0%, transparent 45%),
          radial-gradient(circle at 15% 85%, #00b87c12 0%, transparent 55%),
          linear-gradient(135deg, #0a1628 0%, #0d1a2e 50%, #0c1829 100%)
        `,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(to right, transparent, rgba(255,255,255,0.18), transparent)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
