"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { usePerformanceOverview } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * Persistent track-record proof strip for the Today page. Sits above
 * the signals list to establish trust before the user reads any pick.
 * Our competitors don't publish per-signal outcomes — we do, and this
 * strip is the daily reminder.
 *
 * Data comes from /performance/overview (aggregated win-rate over all
 * closed signals). Copy degrades gracefully while loading / on error.
 */
export function AuditStrip({ className }: { className?: string }) {
  const { data, isLoading } = usePerformanceOverview();

  const total = data?.totalSignals ?? null;
  const winRatePct = data?.winRate != null ? Math.round(data.winRate * 100) : null;
  const avgReturn = data?.avgReturn != null ? data.avgReturn * 100 : null;
  const wins = total != null && winRatePct != null ? Math.round((total * winRatePct) / 100) : null;
  const losses = total != null && wins != null ? total - wins : null;

  return (
    <Link
      href="/audit"
      className={cn(
        "flex items-center justify-between gap-4 rounded-[10px] bg-ink-950 text-ink-0",
        "px-5 py-4 hover:bg-ink-900 transition-colors group",
        className,
      )}
    >
      <div className="flex items-center gap-6 min-w-0">
        <div>
          <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400 mb-1">
            Track record · all time
          </div>
          {isLoading || total == null ? (
            <div className="font-mono text-[14px] text-ink-300">Loading…</div>
          ) : (
            <div className="flex items-baseline gap-4 font-mono text-[15px] font-medium">
              <span>
                <span className="text-up">{wins} wins</span>
                <span className="text-ink-500"> · </span>
                <span className="text-ink-400">{losses} losses</span>
              </span>
              <span className="text-ink-500 hidden sm:inline">·</span>
              <span className="hidden sm:inline">{winRatePct}% hit rate</span>
              {avgReturn != null && (
                <>
                  <span className="text-ink-500 hidden md:inline">·</span>
                  <span className={cn("hidden md:inline", avgReturn >= 0 ? "text-up" : "text-down")}>
                    {avgReturn >= 0 ? "+" : ""}{avgReturn.toFixed(1)}% avg
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-ink-300 text-[12px] font-semibold group-hover:text-ink-0 transition-colors flex-shrink-0">
        <span className="hidden sm:inline">View audit log</span>
        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.2} />
      </div>
    </Link>
  );
}
