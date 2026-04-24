"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/api";
import { UpgradeGateRow } from "@/components/ui/upgrade-gate";
import { StockLogo } from "@/components/ui/stock-logo";
import { ScoreGradeChip } from "@/components/ui/score-grade-chip";
import { SparklineMini } from "@/components/ui/sparkline-mini";

/**
 * v3 data-dense signal row. Score + delta lead; verdict (BUY/WATCH) is
 * carried by the letter grade itself — no separate badge. Every row
 * shows logo + ticker + letter-grade + numeric score + 30d sparkline
 * + price + R:R + the Lens thesis snippet.
 *
 * Mobile (<768px): 2-line compact layout so everything fits 390 px.
 * Desktop (≥768px): single-line grid.
 *
 * Free tier: thesis past rank 3 locks with an upgrade prompt; tail
 * closes with an UpgradeGateRow.
 */
export function SignalTable({
  signals,
  getThesis,
  getSector,
  freeTier = false,
  thesisVisibleForRanks = 3,
  className,
}: {
  signals: Signal[];
  getThesis: (s: Signal) => string;
  getSector?: (s: Signal) => string;
  freeTier?: boolean;
  thesisVisibleForRanks?: number;
  className?: string;
}) {
  const visible = freeTier ? signals.slice(0, 7) : signals;
  const hiddenCount = freeTier ? Math.max(0, signals.length - visible.length) : 0;

  return (
    <div className={cn("rounded-[10px] border border-ink-200 bg-ink-0 overflow-hidden", className)}>
      {visible.map((s, i) => (
        <Row
          key={s.id}
          rank={i + 1}
          signal={s}
          sector={getSector?.(s) ?? ""}
          thesis={getThesis(s)}
          thesisLocked={freeTier && i >= thesisVisibleForRanks}
        />
      ))}
      {freeTier && hiddenCount > 0 && (
        <UpgradeGateRow
          title={`${hiddenCount} more signals on the full board`}
          sub="Upgrade to Pro for the complete scan, Lens thesis on every signal, and the full Lens filter library."
        />
      )}
    </div>
  );
}

function Row({
  rank,
  signal,
  sector,
  thesis,
  thesisLocked,
}: {
  rank: number;
  signal: Signal;
  sector: string;
  thesis: string;
  thesisLocked: boolean;
}) {
  const up = (signal.changePct ?? 0) >= 0;
  const rr = computeRiskReward(signal);
  const spark = synthSparkline(signal);

  return (
    <Link
      href={`/stock/${signal.ticker}`}
      className="block px-4 md:px-6 py-3.5 border-b border-ink-100 last:border-b-0 hover:bg-ink-50 transition-colors cursor-pointer"
    >
      {/* ─── Mobile layout (<md): two-line compact ─── */}
      <div className="md:hidden">
        <div className="flex items-center gap-3">
          <StockLogo ticker={signal.ticker} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-[var(--font-heading)] text-[14px] font-bold text-ink-900">
                {signal.ticker}
              </span>
              <span className="font-mono text-[11px] text-ink-700">
                {signal.currentPrice != null ? `$${formatPrice(signal.currentPrice)}` : "—"}
              </span>
              <span className={cn("font-mono text-[11px]", up ? "text-up" : "text-down")}>
                {signal.changePct != null ? `${up ? "+" : ""}${signal.changePct.toFixed(1)}%` : ""}
              </span>
            </div>
            <div className="text-[11px] text-ink-500 truncate">{signal.stockName || sector}</div>
          </div>
          <ScoreGradeChip score={signal.scoreTotal} size="sm" />
        </div>
        <div className="flex items-center gap-3 mt-2 pl-[44px]">
          {rr != null && (
            <span className="font-mono text-[10px] font-semibold text-forest-dark bg-forest-light px-1.5 py-[1px] rounded">
              R:R {rr.toFixed(1)}
            </span>
          )}
          <SparklineMini data={spark} size="sm" />
          {!thesisLocked && (
            <span className="font-[var(--font-sans)] text-[11px] text-ink-600 truncate flex-1 border-l-2 border-forest pl-2">
              {thesis}
            </span>
          )}
        </div>
      </div>

      {/* ─── Desktop layout (md+): single-line grid ─── */}
      <div
        className="hidden md:grid items-center gap-3"
        style={{ gridTemplateColumns: "28px 36px minmax(120px,180px) minmax(104px,120px) minmax(90px,110px) 64px 84px 1fr" }}
      >
        <div className="font-mono text-[12px] text-ink-400">
          {String(rank).padStart(2, "0")}
        </div>
        <StockLogo ticker={signal.ticker} size="md" />
        <div className="min-w-0">
          <div className="font-[var(--font-heading)] text-[14px] font-bold text-ink-900 leading-tight">
            {signal.ticker}
          </div>
          <div className="text-[11px] text-ink-500 truncate leading-tight mt-0.5">
            {signal.stockName || sector}
          </div>
        </div>
        <ScoreGradeChip score={signal.scoreTotal} size="md" />
        <div className="leading-tight">
          <div className="font-mono text-[13px] font-medium text-ink-900">
            {signal.currentPrice != null ? `$${formatPrice(signal.currentPrice)}` : "—"}
          </div>
          <div className={cn("font-mono text-[11px]", up ? "text-up" : "text-down")}>
            {signal.changePct != null
              ? `${up ? "+" : ""}${signal.changePct.toFixed(1)}%`
              : ""}
          </div>
        </div>
        <div className="text-center">
          {rr != null ? (
            <span className="inline-flex items-center font-mono text-[11px] font-semibold text-forest-dark bg-forest-light px-2 py-0.5 rounded">
              {rr.toFixed(1)}
            </span>
          ) : (
            <span className="text-ink-400 text-[11px]">—</span>
          )}
        </div>
        <SparklineMini data={spark} size="md" />
        <div
          className={cn(
            "pl-2.5 border-l-2 font-[var(--font-sans)] text-[13px] leading-[18px] truncate",
            thesisLocked
              ? "border-ink-300 text-ink-400 italic"
              : "border-forest text-ink-600",
          )}
        >
          {thesisLocked ? (
            <span className="inline-flex items-center gap-2">
              Upgrade to Pro to see Lens&apos;s thesis on every signal
              <span className="inline-flex items-center px-1.5 py-[1px] rounded-[3px] border border-forest bg-forest-light text-forest-dark text-[9px] font-semibold tracking-[0.1em] uppercase">
                Pro
              </span>
            </span>
          ) : (
            thesis
          )}
        </div>
      </div>
    </Link>
  );
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return p.toFixed(2);
}

// Simple R:R from signal levels. (targetHigh - entryLow) / (entryLow - stopLoss).
function computeRiskReward(s: Signal): number | null {
  const entry = s.entryLow ?? s.currentPrice;
  const target = s.targetHigh ?? s.targetLow;
  const stop = s.stopLoss;
  if (entry == null || target == null || stop == null) return null;
  const reward = target - entry;
  const risk = entry - stop;
  if (risk <= 0) return null;
  return reward / risk;
}

// Deterministic synthetic sparkline from the score. Real per-ticker
// score history ingestion is planned (v3 "score sparkline primitive"
// is live; the data layer ships with the score-history migration).
// In the meantime, we produce a stable 14-point trajectory seeded by
// ticker + score so the chart doesn't flicker between re-renders.
function synthSparkline(s: Signal): number[] {
  const seed = hashTicker(s.ticker);
  const score = s.scoreTotal ?? 50;
  const trend = ((s.breakdown?.momentumScore ?? score) - 50) / 10;
  const pts: number[] = [];
  for (let i = 0; i < 14; i++) {
    const jitter = (((seed * (i + 1)) % 100) / 100 - 0.5) * 4;
    const trendContribution = trend * (i / 13);
    pts.push(score - trend * 1.2 + trendContribution + jitter);
  }
  return pts;
}

function hashTicker(ticker: string): number {
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = (h * 31 + ticker.charCodeAt(i)) | 0;
  return Math.abs(h);
}
