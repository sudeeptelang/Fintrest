"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useStockThesis } from "@/lib/hooks";
import type { Signal } from "@/lib/api";
import { StockLogo } from "@/components/stock/stock-logo";
import { AthenaSurface } from "@/components/ui/athena-surface";

/**
 * Hero signal card for the dashboard — the top 3 signals of the day. Expanded
 * from the old numeric-only card with an "Athena says" snippet pulled from the
 * cached thesis. If the thesis is still generating or missing, the card falls
 * back to the old compact layout gracefully.
 */
export function HeroSignalCard({ signal: s, rank }: { signal: Signal; rank: number }) {
  const { data: thesis } = useStockThesis(s.ticker);

  // Pull just the first sentence (or first 180 chars) for the hero snippet.
  const snippet = thesis?.thesis ? firstSentence(thesis.thesis, 200) : null;

  const scoreColor =
    s.scoreTotal >= 75 ? "bg-emerald-500"
    : s.scoreTotal >= 60 ? "bg-emerald-400"
    : "bg-amber-400";

  return (
    <Link
      href={`/stock/${s.ticker}`}
      className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col"
    >
      {/* Row 1 — ticker + signal badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <StockLogo ticker={s.ticker} size={36} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-[var(--font-mono)] text-sm font-bold">{s.ticker}</p>
              <span className="text-[9px] font-mono text-muted-foreground">#{rank}</span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
              {s.stockName}
            </p>
          </div>
        </div>
        <span
          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
            s.signalType === "BUY_TODAY"
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-amber-500/10 text-amber-600"
          }`}
        >
          {s.signalType === "BUY_TODAY" ? "BUY" : "WATCH"}
        </span>
      </div>

      {/* Row 2 — Athena snippet (or fallback to price-only when thesis not ready) */}
      {snippet ? (
        <AthenaSurface rounded="rounded-lg" className="mb-3">
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3 w-3 text-[#00b87c]" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/60">
                Lens Says
              </span>
              {thesis?.verdict && (
                <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-[#00b87c]">
                  {thesis.verdict}
                </span>
              )}
            </div>
            <p className="text-[11px] leading-snug text-white/90 line-clamp-3">
              {snippet}
            </p>
          </div>
        </AthenaSurface>
      ) : (
        <div className="mb-3 text-[10px] text-muted-foreground italic">
          <Sparkles className="h-3 w-3 inline mr-1 text-primary/50" />
          Lens is preparing the thesis...
        </div>
      )}

      {/* Row 3 — price + score */}
      <div className="mt-auto flex items-end justify-between">
        <div>
          {s.currentPrice !== null && (
            <p className="font-[var(--font-mono)] text-sm font-semibold">
              ${s.currentPrice.toFixed(2)}
            </p>
          )}
          {s.changePct !== null && (
            <p
              className={`font-[var(--font-mono)] text-[11px] font-medium ${
                s.changePct >= 0 ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-[var(--font-heading)] text-2xl font-bold leading-none">
            {Math.round(s.scoreTotal)}
          </p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">
            Score
          </p>
        </div>
      </div>
      <div className="mt-2 h-1 rounded-full bg-muted/40 overflow-hidden">
        <div
          className={`h-full rounded-full ${scoreColor}`}
          style={{ width: `${Math.round(s.scoreTotal)}%` }}
        />
      </div>
    </Link>
  );
}

/** Returns the first sentence (or up-to-max chars if no sentence break found). */
function firstSentence(text: string, max: number): string {
  const trimmed = text.trim();
  // Find the first sentence-ending period followed by space + capital
  const sentenceEnd = trimmed.search(/\.\s+[A-Z]/);
  if (sentenceEnd > 40 && sentenceEnd < max) return trimmed.substring(0, sentenceEnd + 1);
  return trimmed.length > max ? trimmed.substring(0, max).trim() + "…" : trimmed;
}
