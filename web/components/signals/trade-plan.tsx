import { cn } from "@/lib/utils";

/**
 * Trade plan — reference levels + now tick, three supporting bullets, R:R pill.
 * Replaces the plain RefLevelBar on the ticker detail page per
 * docs/DESIGN_TICKER_DEEP_DIVE.md. The `Now` tick shows where price actually
 * sits between stop/entry/target — users asked for this in the QA review.
 */
export type TradePlanBullet = {
  kind: "bull" | "risk" | "neutral";
  text: React.ReactNode;
};

export function TradePlan({
  entry,
  stop,
  target,
  now,
  rr,
  bullets = [],
  note,
  className,
}: {
  entry: number;
  stop: number;
  target: number;
  /** Current price. Plotted as a forest dot between the reference levels. */
  now: number | null | undefined;
  /** Pre-computed risk:reward. If omitted, computed from the three levels. */
  rr?: number;
  /** 2-4 supporting bullets (driver, risk, context). */
  bullets?: TradePlanBullet[];
  note?: React.ReactNode;
  className?: string;
}) {
  const computedRr = rr ?? computeRr(entry, stop, target);

  const anchors = [stop, entry, target, now].filter((v): v is number => v != null);
  const min = Math.min(...anchors);
  const max = Math.max(...anchors);
  const range = max - min || 1;
  const pos = (v: number) => 8 + ((v - min) / range) * 84;

  return (
    <section
      className={cn("rounded-[10px] border border-ink-200 bg-ink-0 px-7 py-6", className)}
    >
      <header className="flex items-baseline justify-between mb-5">
        <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-forest-dark">
          Trade plan
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-ink-100">
          <span className="font-[var(--font-mono)] text-[11px] text-ink-700">Reward / risk</span>
          <span className="font-[var(--font-mono)] text-[11px] font-semibold text-ink-900">
            {computedRr.toFixed(1)} : 1
          </span>
        </div>
      </header>

      <div className="relative h-24 py-5">
        <div className="absolute left-0 right-0 top-1/2 h-px bg-ink-200" />
        <Tick variant="stop" price={stop} left={pos(stop)} />
        <Tick variant="entry" price={entry} left={pos(entry)} />
        {now != null && <Tick variant="now" price={now} left={pos(now)} />}
        <Tick variant="target" price={target} left={pos(target)} />
      </div>

      {bullets.length > 0 && (
        <ul className="mt-5 space-y-2.5">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-[13px] leading-[20px] text-ink-700">
              <Glyph kind={b.kind} />
              <span>{b.text}</span>
            </li>
          ))}
        </ul>
      )}

      {note && (
        <p className="text-[13px] leading-[20px] text-ink-700 mt-4 max-w-[720px]">{note}</p>
      )}

      <p className="text-[11px] text-ink-500 italic mt-3">
        Research only — your decision.
      </p>
    </section>
  );
}

function Tick({
  variant,
  price,
  left,
}: {
  variant: "entry" | "stop" | "target" | "now";
  price: number;
  left: number;
}) {
  const glyphs = { entry: "●", stop: "▼", target: "▲", now: "◆" } as const;
  const glyphColor =
    variant === "stop"
      ? "text-down"
      : variant === "now"
      ? "text-forest"
      : "text-up";
  const labels = { entry: "Entry", stop: "Stop", target: "Target", now: "Now" } as const;

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

function Glyph({ kind }: { kind: TradePlanBullet["kind"] }) {
  if (kind === "bull") {
    return <span className="text-up mt-[1px] shrink-0 font-[var(--font-mono)] text-[14px] leading-none">↑</span>;
  }
  if (kind === "risk") {
    return <span className="text-warn mt-[1px] shrink-0 font-[var(--font-mono)] text-[14px] leading-none">!</span>;
  }
  return <span className="text-ink-400 mt-[1px] shrink-0 font-[var(--font-mono)] text-[14px] leading-none">·</span>;
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return p.toFixed(2);
}

function computeRr(entry: number, stop: number, target: number): number {
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  if (risk === 0) return 0;
  return reward / risk;
}
