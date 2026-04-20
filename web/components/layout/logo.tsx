import { cn } from "@/lib/utils";

/**
 * The Fintrest logo — v2 Forest & Rust.
 *
 * Inline SVG instead of a PNG so the color comes from the design token
 * (forest) and scales cleanly across sizes. The <Image> asset at
 * /logo-icon.png was baked with the old bright-green palette — replacing
 * the asset would require a design handoff, and inline SVG matches the
 * preview HTML exactly.
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
  // Inner "F" is ~58% of the outer square. Corner radius scales at ~21%.
  const fontSize = Math.round(size * 0.56);
  const radius = Math.max(4, Math.round(size * 0.21));
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center bg-forest text-ink-0 flex-shrink-0",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontFamily: "var(--font-heading), 'Sora', system-ui, sans-serif",
        fontWeight: 700,
        fontSize,
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      F
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
