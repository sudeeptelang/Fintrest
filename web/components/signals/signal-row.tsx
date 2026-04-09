"use client";

import Link from "next/link";
import type { Signal } from "@/lib/api";

export function SignalRow({ signal }: { signal: Signal }) {
  const typeColor = signal.signalType === "BUY_TODAY"
    ? "bg-emerald-500/10 text-emerald-500"
    : signal.signalType === "AVOID"
      ? "bg-red-500/10 text-red-500"
      : signal.signalType === "HIGH_RISK"
        ? "bg-red-500/10 text-red-400"
        : "bg-amber-500/10 text-amber-500";

  return (
    <Link
      href={`/stock/${signal.ticker}`}
      className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="font-[var(--font-mono)] text-xs font-bold text-primary">
            {signal.ticker.slice(0, 2)}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold font-[var(--font-mono)]">
            {signal.ticker}
          </p>
          <p className="text-xs text-muted-foreground truncate max-w-[150px]">
            {signal.stockName}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor}`}>
          {signal.signalType.replace("_", " ")}
        </span>
        <span className="font-[var(--font-mono)] text-sm font-bold w-8 text-right">
          {Math.round(signal.scoreTotal)}
        </span>
      </div>
    </Link>
  );
}
