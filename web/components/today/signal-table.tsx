"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/api";
import { SignalBadge, signalTypeToVariant } from "@/components/signals/signal-badge";
import { ScoreRingMini } from "@/components/signals/score-ring";
import { UpgradeGateRow } from "@/components/ui/upgrade-gate";

/**
 * Dense signal table for the Today screen. One row per signal: rank, ticker,
 * mini score ring, price, change, signal badge, Lens thesis snippet, sector,
 * pin. For Free tier, rows after the 3rd show a lock chip on the thesis and
 * an upgrade-gate row closes out the tail.
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
  /** Free tier locks thesis snippets past this rank. */
  freeTier?: boolean;
  thesisVisibleForRanks?: number;
  className?: string;
}) {
  const visible = freeTier ? signals.slice(0, 7) : signals;
  const hiddenCount = freeTier ? Math.max(0, signals.length - visible.length) : 0;

  return (
    <div className={cn("rounded-[10px] border border-ink-200 bg-ink-0 overflow-hidden", className)}>
      <HeaderRow />
      {visible.map((s, i) => {
        const thesisLocked = freeTier && i >= thesisVisibleForRanks;
        return (
          <Row
            key={s.id}
            rank={i + 1}
            signal={s}
            sector={getSector?.(s) ?? "—"}
            thesis={getThesis(s)}
            thesisLocked={thesisLocked}
          />
        );
      })}
      {freeTier && hiddenCount > 0 && (
        <UpgradeGateRow
          title={`${hiddenCount} more signals on the full board`}
          sub="Upgrade to Pro for the complete scan, Lens thesis on every signal, and the full Lens filter library."
        />
      )}
    </div>
  );
}

function HeaderRow() {
  return (
    <div
      className="grid gap-0 px-6 py-3 bg-ink-50 border-b border-ink-200 font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500"
      style={{ gridTemplateColumns: "40px 90px 60px 90px 80px 100px 1fr 100px" }}
    >
      <div>#</div>
      <div>Ticker</div>
      <div>Score</div>
      <div>Price</div>
      <div>Change</div>
      <div>Signal</div>
      <div>Lens</div>
      <div>Sector</div>
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
  const variant = signalTypeToVariant(signal.signalType);

  return (
    <Link
      href={`/stock/${signal.ticker}`}
      className="grid items-center gap-0 px-6 py-3.5 border-b border-ink-100 last:border-b-0 hover:bg-ink-50 transition-colors cursor-pointer"
      style={{ gridTemplateColumns: "40px 90px 60px 90px 80px 100px 1fr 100px" }}
    >
      <div className="font-[var(--font-mono)] text-[12px] text-ink-400">
        {String(rank).padStart(2, "0")}
      </div>
      <div className="font-[var(--font-heading)] text-[14px] font-bold text-ink-900">
        {signal.ticker}
      </div>
      <div>
        <ScoreRingMini score={signal.scoreTotal} />
      </div>
      <div className="font-[var(--font-mono)] text-[13px] font-medium text-ink-900">
        {signal.currentPrice != null ? `$${formatPrice(signal.currentPrice)}` : "—"}
      </div>
      <div
        className={cn(
          "font-[var(--font-mono)] text-[13px] font-medium",
          signal.changePct == null
            ? "text-ink-500"
            : up
              ? "text-up"
              : "text-down",
        )}
      >
        {signal.changePct != null
          ? `${up ? "▲" : "▼"} ${up ? "+" : ""}${signal.changePct.toFixed(1)}%`
          : "—"}
      </div>
      <div>
        <SignalBadge variant={variant} size="sm" />
      </div>
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
            <span className="inline-flex items-center px-1.5 py-[1px] rounded-[3px] border border-[rgba(15,79,58,0.2)] bg-forest-light text-forest-dark text-[9px] font-semibold tracking-[0.1em] uppercase">
              Pro
            </span>
          </span>
        ) : (
          thesis
        )}
      </div>
      <div className="font-[var(--font-sans)] text-[11px] text-ink-500">{sector}</div>
    </Link>
  );
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return p.toFixed(2);
}
