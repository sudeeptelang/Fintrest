"use client";

import { ArrowUp, ArrowDown, Equal, Sparkles } from "lucide-react";
import { useAnalystRevisions } from "@/lib/hooks";
import type { AnalystRevisionEvent } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Analyst-revisions card — a 30-day window of upgrade / downgrade /
 * reiterate / initialize events, with net-revisions punch line and
 * per-event row list. Surfaces in the Related News deep-dive because
 * analyst revisions feed the News / Catalyst factor (sentiment family).
 *
 * Silently hides when FMP has no grade events in the window. Band is
 * server-computed from netRevisions so the frontend stays threshold-free.
 */
export function AnalystRevisionsCard({ ticker, className }: { ticker: string; className?: string }) {
  const { data } = useAnalystRevisions(ticker, 30);
  if (!data || data.totalEvents === 0) return null;

  const { upgrades, downgrades, reiterations, initializations, netRevisions, band, events, windowDays } = data;

  const { tone, bg, label, blurb } =
    band === "strongly-positive"
      ? { tone: "text-up", bg: "bg-up/10", label: "Strongly positive", blurb: `${upgrades} upgrades vs. ${downgrades} downgrades` }
      : band === "positive"
      ? { tone: "text-up", bg: "bg-up/10", label: "Positive", blurb: `${upgrades} upgrades · ${downgrades} downgrades` }
      : band === "mixed"
      ? { tone: "text-ink-700", bg: "bg-ink-100", label: "Mixed", blurb: `${upgrades} up · ${downgrades} down · ${reiterations} reiterate` }
      : band === "negative"
      ? { tone: "text-down", bg: "bg-down/10", label: "Negative", blurb: `${downgrades} downgrades vs. ${upgrades} upgrades` }
      : { tone: "text-down", bg: "bg-down/10", label: "Strongly negative", blurb: `${downgrades} downgrades vs. ${upgrades} upgrades` };

  return (
    <div className={cn("rounded-[10px] border border-ink-200 bg-ink-0 p-4 md:p-5", className)}>
      <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600 mb-3">
        Analyst revisions · last {windowDays} days
      </div>

      {/* Summary pill */}
      <div className={cn("rounded-[8px] p-4 flex items-center gap-4 mb-4", bg)}>
        <div className={cn("flex-shrink-0 grid place-items-center w-10 h-10 rounded-md bg-ink-0", tone)}>
          <Sparkles className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={cn("font-[var(--font-sans)] text-[12px] font-semibold uppercase tracking-wide", tone)}>
              {label}
            </span>
            <span className={cn("font-mono text-[13px] font-semibold", tone)}>
              net {netRevisions > 0 ? "+" : ""}{netRevisions}
            </span>
          </div>
          <div className="font-[var(--font-sans)] text-[12px] text-ink-600 mt-0.5">{blurb}</div>
        </div>
      </div>

      {/* Count row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <CountChip label="Upgrades"    value={upgrades} tone="up" />
        <CountChip label="Downgrades"  value={downgrades} tone="down" />
        <CountChip label="Reiterates"  value={reiterations} tone="neutral" />
        <CountChip label="Initiates"   value={initializations} tone="neutral" />
      </div>

      {/* Event list */}
      <ul className="divide-y divide-ink-100">
        {events.slice(0, 8).map((e, i) => (
          <EventRow key={i} event={e} />
        ))}
      </ul>

      <p className="mt-3 text-[10px] text-ink-500 leading-tight">
        Analyst rating changes sourced from FMP /grades. The net-revisions signal
        feeds the News &amp; Catalyst factor; the sentence here is a mirror, not a
        recommendation.
      </p>
    </div>
  );
}

function CountChip({ label, value, tone }: { label: string; value: number; tone: "up" | "down" | "neutral" }) {
  const { tc, bg } = tone === "up"
    ? { tc: "text-up", bg: "bg-up/10" }
    : tone === "down"
    ? { tc: "text-down", bg: "bg-down/10" }
    : { tc: "text-ink-700", bg: "bg-ink-50" };
  return (
    <div className={cn("rounded-[6px] px-2.5 py-2 text-center", bg)}>
      <div className={cn("font-mono text-[16px] font-semibold leading-none", tc)}>{value}</div>
      <div className={cn("font-[var(--font-sans)] text-[10px] uppercase tracking-wide mt-1", tc)}>{label}</div>
    </div>
  );
}

function EventRow({ event }: { event: AnalystRevisionEvent }) {
  const action = event.action ?? "";
  const { Icon, tone, label } =
    action === "up"
      ? { Icon: ArrowUp, tone: "text-up", label: "Upgrade" }
      : action === "down"
      ? { Icon: ArrowDown, tone: "text-down", label: "Downgrade" }
      : { Icon: Equal, tone: "text-ink-600", label: action === "initialize" ? "Initiate" : action === "target" ? "PT change" : "Reiterate" };

  return (
    <li className="py-2.5 flex items-start gap-3">
      <div className={cn("flex-shrink-0 grid place-items-center w-6 h-6 rounded-md", tone)}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-[var(--font-sans)] text-[13px] text-ink-900 font-medium">
          {event.gradingCompany ?? "Analyst"}
          <span className={cn("ml-2 font-mono text-[11px] font-semibold uppercase tracking-wide", tone)}>
            {label}
          </span>
        </div>
        <div className="font-mono text-[11px] text-ink-600 mt-0.5">
          {formatDate(event.date)}
          {event.previousGrade && event.newGrade && (
            <> · {event.previousGrade} → <span className="text-ink-900 font-medium">{event.newGrade}</span></>
          )}
          {!event.previousGrade && event.newGrade && <> · {event.newGrade}</>}
        </div>
      </div>
    </li>
  );
}

function formatDate(d: string): string {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}
