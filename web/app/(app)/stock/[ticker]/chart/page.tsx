"use client";

import { use, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { useStock, useStockChart, useStockSignals } from "@/lib/hooks";
import { PriceChart } from "@/components/charts/price-chart";

interface PageProps {
  params: Promise<{ ticker: string }>;
}

const RANGES = ["1m", "3m", "6m", "1y"] as const;

export default function ChartPage({ params }: PageProps) {
  const { ticker } = use(params);
  const [range, setRange] = useState<(typeof RANGES)[number]>("3m");
  const { data: stock } = useStock(ticker);
  const { data: chartData } = useStockChart(ticker, range);
  const { data: signalsData } = useStockSignals(ticker);

  const latestSignal = signalsData?.signals?.[0];
  const bars = chartData ?? [];
  const lastBar = bars[bars.length - 1];
  const firstBar = bars[0];
  const periodChange =
    lastBar && firstBar && firstBar.close !== 0
      ? ((lastBar.close - firstBar.close) / firstBar.close) * 100
      : null;
  const periodPositive = (periodChange ?? 0) >= 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/stock/${ticker}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to {ticker.toUpperCase()}
        </Link>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold mt-2">
          {ticker.toUpperCase()} · Chart
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {stock?.name ?? "Loading..."}
          {stock?.exchange ? ` · ${stock.exchange}` : ""}
        </p>
      </div>

      {/* Header strip with last price + period change */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Last
          </p>
          <p className="font-[var(--font-mono)] text-xl font-bold mt-1">
            {lastBar ? `$${lastBar.close.toFixed(2)}` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {range.toUpperCase()} Change
          </p>
          <p
            className={`font-[var(--font-mono)] text-xl font-bold mt-1 flex items-center gap-1 ${
              periodPositive ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {periodPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {periodChange === null
              ? "—"
              : `${periodPositive ? "+" : ""}${periodChange.toFixed(2)}%`}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Range
          </p>
          <p className="font-[var(--font-mono)] text-sm font-semibold mt-2">
            {bars.length > 0
              ? `$${Math.min(...bars.map((b) => b.low)).toFixed(2)} – $${Math.max(...bars.map((b) => b.high)).toFixed(2)}`
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Bars
          </p>
          <p className="font-[var(--font-mono)] text-xl font-bold mt-1">
            {bars.length}
          </p>
        </div>
      </motion.div>

      {/* Range selector */}
      <div className="flex justify-end">
        <div className="flex gap-1 rounded-lg bg-muted/30 p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                range === r
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <PriceChart data={bars} height={520} />
      </motion.div>

      {/* Signal levels overlay (entry / target / stop) */}
      {latestSignal && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            Active Signal Levels
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Entry
              </p>
              <p className="font-[var(--font-mono)] text-lg font-bold mt-1">
                {latestSignal.entryLow !== null && latestSignal.entryHigh !== null
                  ? `$${latestSignal.entryLow.toFixed(2)} – $${latestSignal.entryHigh.toFixed(2)}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Target
              </p>
              <p className="font-[var(--font-mono)] text-lg font-bold mt-1 text-emerald-500">
                {latestSignal.targetLow !== null && latestSignal.targetHigh !== null
                  ? `$${latestSignal.targetLow.toFixed(2)} – $${latestSignal.targetHigh.toFixed(2)}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Stop Loss
              </p>
              <p className="font-[var(--font-mono)] text-lg font-bold mt-1 text-red-500">
                {latestSignal.stopLoss !== null ? `$${latestSignal.stopLoss.toFixed(2)}` : "—"}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <p className="text-xs text-muted-foreground text-center pt-2">
        Educational content only — not financial advice.
      </p>
    </div>
  );
}
