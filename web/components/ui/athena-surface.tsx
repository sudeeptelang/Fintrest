"use client";

import { cn } from "@/lib/utils";

/**
 * Shared slate-blue treatment for every Athena-voiced surface (thesis cards, pulse banner,
 * inline row expansions). Still dark enough to read white text, but lighter and cooler
 * than the old navy — tuned to the current blue+purple theme on cool-slate backgrounds.
 *
 * Layered look:
 *   1. Linear gradient slate base (135deg, subtle mid-tone shift for depth)
 *   2. Radial glow in top-right, tinted by `accent` (default primary blue, regime color on Pulse)
 *   3. Secondary soft blue glow bottom-left for brand warmth
 *   4. Ultra-subtle grid texture at 5% opacity (Bloomberg / terminal feel)
 *   5. Top inner-highlight line (1px glass sheen)
 */
export function AthenaSurface({
  accent = "#3b82f6",
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
        "relative text-white shadow-[0_12px_32px_rgba(15,23,42,0.18)] overflow-hidden border border-white/5",
        rounded,
        className,
      )}
      style={{
        backgroundImage: `
          radial-gradient(circle at 85% 15%, ${accent}26 0%, transparent 45%),
          radial-gradient(circle at 15% 85%, #8b5cf61a 0%, transparent 55%),
          linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)
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
