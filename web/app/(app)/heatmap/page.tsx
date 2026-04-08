"use client";

import { motion } from "framer-motion";

const sectors = [
  { name: "Technology", change: "+2.4%", positive: true, size: "large", stocks: 156, signals: 8 },
  { name: "Healthcare", change: "+1.1%", positive: true, size: "large", stocks: 98, signals: 4 },
  { name: "Consumer Disc.", change: "+0.8%", positive: true, size: "medium", stocks: 72, signals: 3 },
  { name: "Financials", change: "-0.3%", positive: false, size: "medium", stocks: 85, signals: 2 },
  { name: "Energy", change: "+1.9%", positive: true, size: "medium", stocks: 45, signals: 3 },
  { name: "Industrials", change: "+0.4%", positive: true, size: "small", stocks: 68, signals: 2 },
  { name: "Materials", change: "-0.7%", positive: false, size: "small", stocks: 32, signals: 1 },
  { name: "Real Estate", change: "-1.2%", positive: false, size: "small", stocks: 41, signals: 0 },
  { name: "Utilities", change: "+0.2%", positive: true, size: "small", stocks: 28, signals: 1 },
  { name: "Communication", change: "+1.6%", positive: true, size: "medium", stocks: 52, signals: 3 },
  { name: "Staples", change: "+0.1%", positive: true, size: "small", stocks: 35, signals: 1 },
];

function getSizeClass(size: string) {
  switch (size) {
    case "large":
      return "col-span-2 row-span-2";
    case "medium":
      return "col-span-2";
    default:
      return "";
  }
}

export default function HeatmapPage() {
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

      <div className="grid grid-cols-4 lg:grid-cols-6 gap-2 auto-rows-[120px]">
        {sectors.map((sector, i) => (
          <motion.div
            key={sector.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            className={`rounded-xl p-4 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${getSizeClass(sector.size)} ${
              sector.positive
                ? "bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40"
                : "bg-red-500/10 border border-red-500/20 hover:border-red-500/40"
            }`}
          >
            <div>
              <p className="text-sm font-semibold truncate">{sector.name}</p>
              <p className="text-xs text-muted-foreground">
                {sector.stocks} stocks
              </p>
            </div>
            <div>
              <p
                className={`font-[var(--font-mono)] text-lg font-bold ${
                  sector.positive ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {sector.change}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {sector.signals} signals
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
