import { cn } from "@/lib/utils";

/**
 * The Fintrest logo — v3 Sky Blue.
 *
 * Swapped from the inline "F" tile to the stylized F-with-arrow-and-nodes
 * asset supplied 2026-04-24. The PNG lives at /public/logo.png and is
 * rendered via <img> so we don't need Next/Image's config plumbing here.
 * Rounded square backdrop is kept so the crop matches other square
 * icon tiles in the UI (stock logos, etc.).
 *
 * Sizes follow v2 usage: 24 (marketing nav), 32 (app sidebar), 48 (auth).
 */
export function LogoMark({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const radius = Math.max(4, Math.round(size * 0.21));
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center flex-shrink-0 overflow-hidden bg-forest",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
      }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Fintrest"
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: "cover", display: "block" }}
      />
    </span>
  );
}

/**
 * Full logo: mark + wordmark, v2 styling. Use this inline where you want
 * a "Fintrest.ai" lockup. For icon-only contexts, use <LogoMark> directly.
 */
export function Logo({
  size = 36,
  className,
  wordmarkClassName,
}: {
  size?: number;
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span
        className={cn(
          "font-[var(--font-heading)] font-bold tracking-tight text-ink-900",
          wordmarkClassName,
        )}
        style={{ fontSize: Math.max(14, Math.round(size * 0.47)) }}
      >
        Fintrest<span className="text-ink-500 font-normal">.ai</span>
      </span>
    </span>
  );
}
