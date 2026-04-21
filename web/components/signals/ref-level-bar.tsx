import { cn } from "@/lib/utils";

/**
 * Reference-level bar — entry / target / stop plotted on a single horizontal line.
 * Non-negotiable rule: the three levels always appear together, never separated.
 * R:R ratio shown in the header. Entry + target use `up` glyphs; stop uses `down`.
 */
export function RefLevelBar({
  entry,
  stop,
  target,
  rr,
  note,
  className,
}: {
  entry: number;
  stop: number;
  target: number;
  /** Pre-computed risk:reward. If omitted, computed from the three levels. */
  rr?: number;
  /** Optional prose note (trade plan narrative) rendered above the compliance caption. */
  note?: React.ReactNode;
  className?: string;
}) {
  const computedRr = rr ?? computeRr(entry, stop, target);

  // Plot positions along the bar — scale the three values into the 8%-92% range
  // so the ticks never hit the edges.
  const min = Math.min(entry, stop, target);
  const max = Math.max(entry, stop, target);
  const range = max - min || 1;
  const pos = (v: number) => 8 + ((v - min) / range) * 84;

  return (
    <div className={cn("rounded-[10px] border border-ink-200 bg-ink-0 px-7 py-6", className)}>
      <div className="flex items-baseline justify-between mb-5">
        <div className="font-[var(--font-sans)] text-[14px] font-semibold text-ink-900">
          Reference levels
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-ink-100">
          <span className="font-[var(--font-mono)] text-[11px] text-ink-700">R:R</span>
          <span className="font-[var(--font-mono)] text-[11px] font-semibold text-ink-900">
            {computedRr.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="relative h-20 py-5">
        <div className="absolute left-0 right-0 top-1/2 h-px bg-ink-200" />
        <Tick variant="stop" price={stop} left={pos(stop)} />
        <Tick variant="entry" price={entry} left={pos(entry)} />
        <Tick variant="target" price={target} left={pos(target)} />
      </div>

      {note && (
        <p className="text-[13px] leading-[20px] text-ink-700 mt-4 max-w-[720px]">
          {note}
        </p>
      )}

      <p className="text-[11px] text-ink-500 italic mt-2">
        Research only — your decision.
      </p>
    </div>
  );
}

function Tick({
  variant,
  price,
  left,
}: {
  variant: "entry" | "stop" | "target";
  price: number;
  left: number;
}) {
  const glyphs = { entry: "●", stop: "▼", target: "▲" } as const;
  const glyphColor = variant === "stop" ? "text-down" : "text-up";
  const labels = { entry: "Entry", stop: "Stop", target: "Target" } as const;

  return (
    <div
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
      style={{ left: `${left}%` }}
    >
      <div className={cn("text-[14px] leading-none", glyphColor)}>{glyphs[variant]}</div>
      <div className="font-[var(--font-sans)] text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-500">
        {labels[variant]}
      </div>
      <div className="font-[var(--font-mono)] text-[13px] font-medium text-ink-900">
        ${formatPrice(price)}
      </div>
    </div>
  );
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 10) return p.toFixed(2);
  return p.toFixed(2);
}

function computeRr(entry: number, stop: number, target: number): number {
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  if (risk === 0) return 0;
  return reward / risk;
}
