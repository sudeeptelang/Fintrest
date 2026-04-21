import { cn } from "@/lib/utils";

/**
 * Seven-segment score ring — one segment per factor (Momentum, Rel Volume, News,
 * Fundamentals, Sentiment, Trend, Risk). The ring itself is purely decorative;
 * the center number is the actual composite score. Segments fill `up` for
 * scores ≥ 40 on the overall composite, `ink-400` below — a coarse signal that
 * "most factors are working." The 7-factor detail lives in FactorRow.
 */
export function ScoreRing({
  score,
  size = 140,
  segments,
  className,
}: {
  score: number;
  size?: number;
  /** Optional per-segment scores. When provided, each segment colors based on its own value. */
  segments?: number[];
  className?: string;
}) {
  const stroke = size >= 100 ? 8 : 5;
  const centerFont = size >= 100 ? 40 : 16;
  const cx = size / 2;
  const cy = size / 2;
  const r = cx - stroke / 2 - 2;

  // 7 equal segments with a small gap between each
  const segs = 7;
  const gap = 0.04; // radians of visual gap
  const arcLen = (2 * Math.PI) / segs - gap;

  return (
    <div
      className={cn("relative inline-block", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full -rotate-90"
        aria-hidden
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="var(--ink-100)"
          strokeWidth={stroke}
          fill="none"
        />
        {Array.from({ length: segs }).map((_, i) => {
          const startAngle = i * ((2 * Math.PI) / segs) + gap / 2;
          const endAngle = startAngle + arcLen;
          const x1 = cx + r * Math.cos(startAngle);
          const y1 = cy + r * Math.sin(startAngle);
          const x2 = cx + r * Math.cos(endAngle);
          const y2 = cy + r * Math.sin(endAngle);
          const large = arcLen > Math.PI ? 1 : 0;
          const segScore = segments?.[i] ?? score;
          const color = segScore >= 40 ? "var(--up)" : "var(--ink-400)";
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="font-[var(--font-mono)] font-medium text-ink-950 tracking-[-0.02em] leading-none"
          style={{ fontSize: centerFont }}
        >
          {Math.round(score)}
        </div>
        {size >= 100 && (
          <div className="mt-1 font-[var(--font-mono)] text-[11px] leading-none text-ink-500">
            out of 100
          </div>
        )}
      </div>
    </div>
  );
}

/** Compact mini ring — used in signal tables. Just the arc + center number. */
export function ScoreRingMini({ score, size = 34 }: { score: number; size?: number }) {
  const stroke = 3;
  const cx = size / 2;
  const cy = size / 2;
  const r = cx - stroke - 1;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = circ * (1 - pct / 100);

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle cx={cx} cy={cy} r={r} stroke="var(--ink-100)" strokeWidth={stroke} fill="none" />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={pct >= 40 ? "var(--up)" : "var(--ink-400)"}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-[var(--font-mono)] text-[11px] font-medium leading-none text-ink-900">
        {Math.round(score)}
      </div>
    </div>
  );
}
