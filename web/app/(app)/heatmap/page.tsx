"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useMarketSectors } from "@/lib/hooks";
import type { SectorPerformance } from "@/lib/api";

// Tile size by stock count quartile so the dominant sectors look bigger.
function getSizeClass(stockCount: number, max: number): string {
  const ratio = max > 0 ? stockCount / max : 0;
  if (ratio >= 0.75) return "col-span-2 row-span-2";
  if (ratio >= 0.4) return "col-span-2";
  return "";
}

export default function HeatmapPage() {
  const { data: sectors, isLoading } = useMarketSectors();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const list: SectorPerformance[] = sectors ?? [];
  const maxCount = list.reduce((m, s) => Math.max(m, s.stockCount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold">
          Sector Heatmap
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visual sector performance at a glance. Spot where money is flowing.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No sector data yet. Run an ingestion pass to populate market data.
        </div>
      ) : (
        <div className="grid grid-cols-4 lg:grid-cols-6 gap-2 auto-rows-[120px]">
          {list.map((sector, i) => {
            const positive = (sector.changePct ?? 0) >= 0;
            return (
              <motion.div
                key={sector.sector}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className={`rounded-xl p-4 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${getSizeClass(sector.stockCount, maxCount)} ${
                  positive
                    ? "bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40"
                    : "bg-red-500/10 border border-red-500/20 hover:border-red-500/40"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold truncate">{sector.sector}</p>
                  <p className="text-xs text-muted-foreground">
                    {sector.stockCount} stocks
                  </p>
                </div>
                <div>
                  <p
                    className={`font-[var(--font-mono)] text-lg font-bold ${
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
  );
}
