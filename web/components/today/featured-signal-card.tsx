"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/api";
import { SignalBadge, signalTypeToVariant } from "@/components/signals/signal-badge";
import { LensMark } from "@/components/lens/lens-card";
import { PriceFreshness } from "@/components/ui/price-freshness";

/**
 * Featured signal card — magazine-style top-3 layout on Today.
 * 24px padding, forest-gutter thesis, composite score top-right, reference levels below.
 * Locked variant shows truncated thesis with a lock chip for Free users.
 */
export function FeaturedSignalCard({
  signal,
  thesis,
  locked = false,
  className,
}: {
  signal: Signal;
  thesis: string;
  locked?: boolean;
  className?: string;
}) {
  const variant = signalTypeToVariant(signal.signalType);
  const up = (signal.changePct ?? 0) >= 0;
  const entry = signal.entryLow ?? signal.currentPrice;
  const stop = signal.stopLoss;
  const target = signal.targetHigh ?? signal.targetLow;

  return (
    <Link
      href={`/stock/${signal.ticker}`}
      className={cn(
        "group block rounded-[10px] border border-ink-200 bg-ink-0 p-6 transition-all hover:border-ink-300 hover:shadow-e1 hover:-translate-y-px",
        className,
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0">
          <div className="font-[var(--font-heading)] text-[24px] font-bold text-ink-950 tracking-[-0.01em] leading-none">
            {signal.ticker}
          </div>
          <div className="mt-1 font-[var(--font-sans)] text-[12px] leading-[16px] text-ink-500 truncate max-w-[180px]">
            {signal.stockName}
          </div>
        </div>
        <SignalBadge variant={variant} />
      </div>

      <div className="flex items-baseline gap-4 pb-3.5 mb-3.5 border-b border-ink-100">
        <div>
          {signal.currentPrice != null && (
            <div className="font-[var(--font-mono)] text-[22px] font-medium text-ink-950 tracking-[-0.01em] leading-none">
              ${formatPrice(signal.currentPrice)}
            </div>
          )}
          {signal.changePct != null && (
            <div
              className={cn(
                "mt-1 font-[var(--font-mono)] text-[14px] font-medium leading-none",
                up ? "text-up" : "text-down",
              )}
            >
              {up ? "▲" : "▼"} {up ? "+" : ""}{signal.changePct.toFixed(1)}%
            </div>
          )}
          {signal.currentPrice != null && <PriceFreshness className="mt-2" />}
        </div>
        <div className="ml-auto flex items-baseline gap-0.5 font-[var(--font-mono)] text-[12px] text-ink-500">
          <span className="text-[16px] font-medium text-ink-900">{Math.round(signal.scoreTotal)}</span>
          <span>/100</span>
        </div>
      </div>

      {/* Thesis with forest gutter */}
      <div
        className={cn(
          "pl-3.5 border-l-2 min-h-[80px]",
          locked ? "border-ink-300" : "border-forest",
        )}
      >
        <div
          className={cn(
            "mb-1.5 flex items-center gap-1.5 font-[var(--font-sans)] text-[9px] font-semibold uppercase tracking-[0.16em]",
            locked ? "text-ink-500" : "text-forest-dark",
          )}
        >
          <LensMark size={14} />
          Lens
          {locked && <LockChip />}
        </div>
        <p
          className={cn(
            "font-[var(--font-sans)] text-[13px] leading-[20px]",
            locked ? "text-ink-400 italic" : "text-ink-700",
          )}
        >
          {locked ? truncate(thesis, 90) + "…" : thesis}
        </p>
      </div>

      {entry != null && stop != null && target != null && (
        <div className="mt-4 font-[var(--font-mono)] text-[11px] text-ink-500">
          Entry <strong className="text-ink-800 font-medium">${formatPrice(entry)}</strong>
          {" · "}Stop <strong className="text-ink-800 font-medium">${formatPrice(stop)}</strong>
          {" · "}Target <strong className="text-ink-800 font-medium">${formatPrice(target)}</strong>
        </div>
      )}
    </Link>
  );
}

function LockChip() {
  return (
    <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-[3px] border border-[rgba(15,79,58,0.2)] bg-forest-light text-forest-dark text-[9px] font-semibold tracking-[0.1em] uppercase">
      Pro
    </span>
  );
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return p.toFixed(2);
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n).trim() : s;
}
