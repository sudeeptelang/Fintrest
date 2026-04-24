"use client";

import { Landmark, TrendingDown, Users, BarChart3, Building2, ChevronUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * v3 Smart Money breakdown — the 8th factor drill-down. Indented via
 * a 3px teal left border so it reads as a sub-section of the factor
 * panel, not a parallel card. Teal is the Smart Money family color
 * per UX_AUDIT Part 3.5.
 *
 * Each sub-row publishes its provenance: `Source: <feed> · <staleness>`.
 * Rows with no data yet render in a restrained "coming soon" empty
 * state with an icon, a human-readable ETA, and the source URL we'll
 * pull from — never vapourware jargon like "§14.9 phase 2."
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

const ICONS: Record<SmartMoneySubSignal["key"], typeof Users> = {
  insider:       Users,
  institutional: Building2,
  options:       BarChart3,
  congressional: Landmark,
  short:         TrendingDown,
};

export function SmartMoneyBreakdown({
  composite,
  subSignals,
  collapsible = false,
  onCollapse,
  className,
}: {
  composite: number | null;
  subSignals: SmartMoneySubSignal[];
  collapsible?: boolean;
  onCollapse?: () => void;
  className?: string;
}) {
  const populated = subSignals.filter((s) => s.score != null);
  const pendingCount = subSignals.length - populated.length;

  return (
    <section
      className={cn(
        "rounded-[12px] border border-ink-200 bg-ink-0",
        "relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-teal before:rounded-l-[12px]",
        "pl-6 pr-6 py-5",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal-light">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal" />
              <span className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.08em] text-teal">
                Smart money · family
              </span>
            </span>
          </div>
          <h3 className="mt-2 font-[var(--font-heading)] text-[17px] font-semibold text-ink-900 leading-tight">
            What the smart money is doing
          </h3>
          <p className="mt-1 font-[var(--font-sans)] text-[12px] text-ink-600">
            {composite != null ? (
              <>
                Composite <span className="font-mono text-ink-900 font-medium">{Math.round(composite)}</span> / 100 ·
                {" "}
                {populated.length} of {subSignals.length} sub-signals live
                {pendingCount > 0 && <> · {pendingCount} coming soon</>}
              </>
            ) : (
              <>
                {populated.length} of {subSignals.length} sub-signals live · composite pending
              </>
            )}
          </p>
        </div>
        {collapsible && (
          <button
            type="button"
            onClick={onCollapse}
            className="inline-flex items-center gap-1 font-[var(--font-sans)] text-[12px] text-ink-500 hover:text-ink-900"
          >
            <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.2} />
            Collapse
          </button>
        )}
      </header>

      <ul className="space-y-3">
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
  const Icon = ICONS[signal.key];

  const scoreTone = !hasScore
    ? "text-ink-300"
    : score >= 70
    ? "text-up"
    : score >= 50
    ? "text-ink-900"
    : score >= 30
    ? "text-warn"
    : "text-down";

  const barTone = !hasScore
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
    <li
      className={cn(
        "rounded-[8px] border px-4 py-3",
        hasScore ? "border-ink-200 bg-ink-0" : "border-dashed border-ink-200 bg-ink-50",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex-shrink-0 grid place-items-center w-8 h-8 rounded-md",
            hasScore ? "bg-teal-light text-teal" : "bg-ink-100 text-ink-400",
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn(
                "font-[var(--font-sans)] text-[13px] font-semibold leading-none",
                hasScore ? "text-ink-900" : "text-ink-600",
              )}>
                {signal.label}
              </span>
              <span className="inline-flex items-center px-1.5 py-[1px] rounded bg-ink-100 font-mono text-[10px] text-ink-600 flex-shrink-0">
                {signal.weightPct}%
              </span>
            </div>
            <span className={cn("font-mono text-[13px] font-semibold flex-shrink-0", scoreTone)}>
              {hasScore ? Math.round(score) : (
                <span className="inline-flex items-center gap-1 text-ink-400 font-medium text-[11px]">
                  <Clock className="h-3 w-3" strokeWidth={2.2} />
                  Soon
                </span>
              )}
            </span>
          </div>

          {hasScore && (
            <div className="h-1 rounded-full bg-ink-100 overflow-hidden mt-2">
              <div className={cn("h-full rounded-full", barTone)} style={{ width: `${pct}%` }} />
            </div>
          )}

          <p
            className={cn(
              "mt-2 font-[var(--font-sans)] text-[12px] leading-[17px]",
              hasScore ? "text-ink-700" : "text-ink-500 italic",
            )}
          >
            {signal.evidence ?? signal.pendingMessage ?? "Coming soon."}
          </p>
          <p className="mt-1 font-[var(--font-sans)] text-[10px] text-ink-500">
            Source: {signal.source}
          </p>
        </div>
      </div>
    </li>
  );
}
