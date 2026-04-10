"use client";

import { motion } from "framer-motion";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { useMarketSummary, useTopPicks } from "@/lib/hooks";

const SECTORS = [
  { name: "Technology", key: "tech" },
  { name: "Healthcare", key: "health" },
  { name: "Consumer Discretionary", key: "consumer" },
  { name: "Financials", key: "fin" },
  { name: "Energy", key: "energy" },
  { name: "Real Estate", key: "realestate" },
];

export default function MarketsPage() {
  const { data: market, isLoading } = useMarketSummary();
  const { data: picks } = useTopPicks(50);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Derive sector signal counts from picks
  const sectorCounts: Record<string, number> = {};
  picks?.signals.forEach((s) => {
    const sector = s.breakdown?.momentumScore ? "has_signal" : "";
    // Group by stock name patterns (simplified — real implementation uses stock.sector from backend)
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold">Markets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {market?.marketStatus === "open" ? "Market Open" : "Pre-Market"} · {market?.signalsToday || 0} signals today
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
          Live
        </span>
      </div>

      {/* Index cards */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-center"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">S&P 500</p>
          <p className="font-[var(--font-mono)] text-2xl font-bold mt-2">5,246</p>
          <p className="text-sm font-semibold text-emerald-500 mt-1 flex items-center justify-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" /> +1.24%
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-center"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nasdaq</p>
          <p className="font-[var(--font-mono)] text-2xl font-bold mt-2">18,340</p>
          <p className="text-sm font-semibold text-emerald-500 mt-1 flex items-center justify-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" /> +1.87%
          </p>
        </motion.div>
      </div>

      {/* Sector Performance */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Sector Performance
        </p>
        <div className="grid gap-3">
          {[
            { name: "Technology", change: 2.4, signals: 8 },
            { name: "Healthcare", change: 1.1, signals: 4 },
            { name: "Consumer", change: 0.8, signals: 3 },
            { name: "Financials", change: 0.5, signals: 2 },
            { name: "Energy", change: -0.3, signals: 1 },
            { name: "Real Estate", change: -0.8, signals: 0 },
          ].map((sector, i) => (
            <motion.div
              key={sector.name}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4"
            >
              <div className="flex-1">
                <p className="text-sm font-semibold">{sector.name}</p>
                <div className="mt-2 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${sector.change >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                    style={{ width: `${Math.min(Math.abs(sector.change) * 30, 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-right ml-4">
                <p className={`text-sm font-bold font-[var(--font-mono)] ${sector.change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {sector.change >= 0 ? "+" : ""}{sector.change}%
                </p>
                <p className="text-[10px] text-muted-foreground">{sector.signals} signals</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
