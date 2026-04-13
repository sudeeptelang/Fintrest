"use client";

import { motion } from "framer-motion";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { useMarketSummary, useMarketSectors, useMarketIndices } from "@/lib/hooks";

export default function MarketsPage() {
  const { data: market, isLoading: summaryLoading } = useMarketSummary();
  const { data: indices } = useMarketIndices();
  const { data: sectors } = useMarketSectors();

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const indexList = indices ?? [];
  const sectorList = sectors ?? [];
  // For sector bar widths, scale by the largest absolute change
  const maxAbsChange = sectorList.reduce(
    (m, s) => Math.max(m, Math.abs(s.changePct ?? 0)),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold">Markets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {market?.marketStatus === "open" ? "Market Open" : "Pre-Market"} ·{" "}
            {market?.signalsToday || 0} signals today
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
          Live
        </span>
      </div>

      {/* Index cards */}
      {indexList.length > 0 && (
        <div
          className={`grid gap-4 ${
            indexList.length >= 4
              ? "grid-cols-2 lg:grid-cols-4"
              : indexList.length === 3
                ? "grid-cols-3"
                : "grid-cols-2"
          }`}
        >
          {indexList.map((idx, i) => {
            const positive = (idx.changePct ?? 0) >= 0;
            return (
              <motion.div
                key={idx.ticker}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-center"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {idx.label}
                </p>
                <p className="font-[var(--font-mono)] text-2xl font-bold mt-2">
                  {idx.price !== null
                    ? idx.price.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                </p>
                <p
                  className={`text-sm font-semibold mt-1 flex items-center justify-center gap-1 ${
                    positive ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {positive ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {idx.changePct === null
                    ? "—"
                    : `${positive ? "+" : ""}${idx.changePct.toFixed(2)}%`}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Sector Performance */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Sector Performance
        </p>
        {sectorList.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No sector data yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {sectorList.map((sector, i) => {
              const positive = (sector.changePct ?? 0) >= 0;
              const widthPct =
                maxAbsChange > 0
                  ? Math.min((Math.abs(sector.changePct ?? 0) / maxAbsChange) * 100, 100)
                  : 0;
              return (
                <motion.div
                  key={sector.sector}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{sector.sector}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${positive ? "bg-emerald-500" : "bg-red-500"}`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p
                      className={`text-sm font-bold font-[var(--font-mono)] ${
                        positive ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {sector.changePct === null
                        ? "—"
                        : `${positive ? "+" : ""}${sector.changePct.toFixed(2)}%`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {sector.signalCount} signal{sector.signalCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
