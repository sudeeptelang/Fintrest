"use client";

import { cn } from "@/lib/utils";

/**
 * Smart Money breakdown — drill-down of the 8th factor (§14.9).
 * Visually indented via a 2px forest left border so it reads as a
 * sub-section of the factor panel, not a parallel card.
 *
 * Each sub-row publishes its provenance: `Source: <feed> · <staleness>`.
 * That credibility line is the differentiator — most competitors hide it.
 */
export type SmartMoneySubSignal = {
  key: "insider" | "institutional" | "options" | "congressional" | "short";
  label: string;
  weightPct: number;
  /** 0-100. Null when the sub-signal feed is not yet wired. */
  score: number | null;
  /** One-sentence evidence line. Null → render the empty/pending state. */
  evidence: string | null;
  /** Feed + staleness window, e.g. `SEC EDGAR Form 4 · 1–2 day disclosure lag`. */
  source: string;
  /** Human-readable "not yet wired" message if the sub-signal has no data. */
  pendingMessage?: string;
};

export function SmartMoneyBreakdown({
  composite,
  subSignals,
  collapsible = false,
  onCollapse,
  className,
}: {
  /** Composite 0-100. */
  composite: number | null;
  subSignals: SmartMoneySubSignal[];
  collapsible?: boolean;
  onCollapse?: () => void;
  className?: string;
}) {
  const populated = subSignals.filter((s) => s.score != null).length;

  return (
    <section
      className={cn(
        "rounded-[10px] border border-ink-200 bg-ink-0",
        "border-l-[3px] border-l-forest",
        "pl-6 pr-7 py-6",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-forest-dark">
            Smart money · breakdown
          </div>
          <p className="mt-1 font-[var(--font-sans)] text-[12px] text-ink-500">
            {composite != null ? (
              <>
                Composite <span className="font-[var(--font-mono)] text-ink-800 font-medium">{Math.round(composite)}/100</span> ·{" "}
              </>
            ) : (
              "Composite pending · "
            )}
            {populated} of {subSignals.length} sub-signals weighted by independent accuracy
          </p>
        </div>
        {collapsible && (
          <button
            type="button"
            onClick={onCollapse}
            className="font-[var(--font-sans)] text-[12px] text-ink-500 hover:text-ink-900"
          >
            Collapse ↑
          </button>
        )}
      </header>

      <ul className="space-y-5">
        {subSignals.map((s) => (
          <SubSignalRow key={s.key} signal={s} />
        ))}
      </ul>
    </section>
  );
}

function SubSignalRow({ signal }: { signal: SmartMoneySubSignal }) {
  const hasScore = signal.score != null;
  const score = signal.score ?? 0;
  const tone = !hasScore
    ? "text-ink-400"
    : score >= 70
    ? "text-up"
    : score >= 50
    ? "text-ink-900"
    : score >= 30
    ? "text-warn"
    : "text-down";
  const bar = !hasScore
    ? "bg-ink-200"
    : score >= 70
    ? "bg-up"
    : score >= 50
    ? "bg-ink-700"
    : score >= 30
    ? "bg-warn"
    : "bg-down";

  const pct = Math.max(0, Math.min(100, score));

  return (
    <li>
      <div className="flex items-baseline justify-between gap-4 mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-[var(--font-sans)] text-[13px] font-semibold text-ink-900">
            {signal.label}
          </span>
          <span className="inline-flex items-center px-1.5 py-[1px] rounded bg-ink-100 font-[var(--font-mono)] text-[10px] text-ink-600">
            {signal.weightPct}% weight
          </span>
        </div>
        <span className={cn("font-[var(--font-mono)] text-[14px] font-semibold", tone)}>
          {hasScore ? Math.round(score) : "—"}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden mb-2">
        <div className={cn("h-full rounded-full", bar)} style={{ width: `${pct}%` }} />
      </div>
      <p
        className={cn(
          "font-[var(--font-sans)] text-[12px] leading-[18px]",
          hasScore ? "text-ink-700" : "text-ink-400 italic",
        )}
      >
        {signal.evidence ?? signal.pendingMessage ?? "Pending feed — the sub-signal is not yet plumbed in."}
      </p>
      <p className="mt-1 font-[var(--font-sans)] text-[11px] text-ink-500">
        Source: {signal.source}
      </p>
    </li>
  );
}
