"use client";

import { cn } from "@/lib/utils";

/**
 * Minimal inline SVG sparkline — no charting library, no axes, no
 * tooltip. 30-day trajectory next to any score or price. The
 * trajectory is the story; the snapshot isn't enough.
 *
 * Pass `data` as an array of numbers (most-recent last). Pass `tone`
 * to force a color, or let the component auto-pick: last > first → up,
 * last < first → down, else flat.
 */

const SIZE_MAP = {
  sm: { width: 60, height: 16, stroke: 1.2 },
  md: { width: 80, height: 20, stroke: 1.5 },
  lg: { width: 120, height: 32, stroke: 1.8 },
} as const;

export function SparklineMini({
  data,
  size = "md",
  tone,
  className,
}: {
  data: number[];
  size?: keyof typeof SIZE_MAP;
  /** Force color: "up" / "down" / "flat". Auto-detects if omitted. */
  tone?: "up" | "down" | "flat";
  className?: string;
}) {
  const s = SIZE_MAP[size];

  if (!data || data.length < 2) {
    return (
      <svg
        className={cn("inline-block", className)}
        width={s.width}
        height={s.height}
        aria-hidden
      >
        <line
          x1={0} y1={s.height / 2} x2={s.width} y2={s.height / 2}
          stroke="currentColor" strokeOpacity={0.2} strokeWidth={s.stroke}
        />
      </svg>
    );
  }

  const resolvedTone = tone ?? (
    data[data.length - 1] > data[0] ? "up" :
    data[data.length - 1] < data[0] ? "down" : "flat"
  );
  const stroke = resolvedTone === "up" ? "var(--up)" : resolvedTone === "down" ? "var(--down)" : "var(--ink-500)";

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = s.width / (data.length - 1);
  const padY = s.stroke + 1;
  const plot = (v: number) => {
    const t = (v - min) / range;
    return s.height - padY - t * (s.height - padY * 2);
  };
  const points = data.map((v, i) => `${i * stepX},${plot(v)}`).join(" ");

  return (
    <svg
      className={cn("inline-block", className)}
      width={s.width}
      height={s.height}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={s.stroke}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
