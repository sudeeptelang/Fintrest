"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { Loader2, TrendingUp, TrendingDown, Activity, ArrowUpDown } from "lucide-react";
import {
  useMarketSummary,
  useMarketSectors,
  useMarketIndices,
  useMarketScreener,
} from "@/lib/hooks";
import type { ScreenerRow, MarketIndex } from "@/lib/api";
import { StockLogo } from "@/components/stock/stock-logo";

type MoverTab = "gainers" | "losers" | "active" | "all";

export default function MarketsPage() {
  const { data: market, isLoading: summaryLoading } = useMarketSummary();
  const { data: indices } = useMarketIndices();
  const { data: sectors } = useMarketSectors();
  const { data: screener } = useMarketScreener(50);

  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [moverTab, setMoverTab] = useState<MoverTab>("gainers");

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const indexList = indices ?? [];
  const sectorList = sectors ?? [];
  const stocks = screener ?? [];

  // ─── Market Pulse: compute breadth score from screener data
  const pulseData = useMemo(() => {
    if (stocks.length === 0) return { score: 50, label: "Neutral", up: 0, down: 0, flat: 0 };
    const up = stocks.filter((s) => (s.changePct ?? 0) > 0.1).length;
    const down = stocks.filter((s) => (s.changePct ?? 0) < -0.1).length;
    const flat = stocks.length - up - down;
    const ratio = up / stocks.length;
    const score = Math.round(ratio * 100);
    let label = "Neutral";
    if (score >= 75) label = "Extreme Greed";
    else if (score >= 60) label = "Greed";
    else if (score >= 45) label = "Neutral";
    else if (score >= 25) label = "Fear";
    else label = "Extreme Fear";
    return { score, label, up, down, flat };
  }, [stocks]);

  // ─── Treemap data
  const treemapData = sectorList
    .filter((s) => s.stockCount > 0)
    .map((s) => ({
      name: s.sector,
      size: s.stockCount,
      changePct: s.changePct ?? 0,
      signalCount: s.signalCount,
    }));

  // ─── Filtered stocks for movers table
  const filteredStocks = selectedSector
    ? stocks.filter((s) => s.sector === selectedSector)
    : stocks;

  const moversRows = useMemo(() => {
    const list = [...filteredStocks];
    switch (moverTab) {
      case "gainers":
        return list
          .filter((s) => (s.changePct ?? 0) > 0)
          .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))
          .slice(0, 20);
      case "losers":
        return list
          .filter((s) => (s.changePct ?? 0) < 0)
          .sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0))
          .slice(0, 20);
      case "active":
        return list
          .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
          .slice(0, 20);
      default:
        return list
          .sort((a, b) => (b.signalScore ?? 0) - (a.signalScore ?? 0))
          .slice(0, 20);
    }
  }, [filteredStocks, moverTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold">Markets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {market?.marketStatus === "open" ? "Market Open" : "Pre-Market"} ·{" "}
            {market?.signalsToday || 0} signals · {stocks.length} stocks tracked
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Live
        </span>
      </div>

      {/* Market Pulse + Global Indices grid */}
      <div className="grid lg:grid-cols-4 gap-5">
        <MarketPulse pulse={pulseData} />
        <div className="lg:col-span-3">
          <GlobalIndicesGrid indices={indexList} />
        </div>
      </div>

      {/* Sector Treemap */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-[var(--font-heading)] text-lg font-semibold">
              Sector Heatmap
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedSector
                ? `Filtered to ${selectedSector}. `
                : "Click a sector to filter movers below. "}
              Box size = stock count · color = performance
            </p>
          </div>
          {selectedSector && (
            <button
              onClick={() => setSelectedSector(null)}
              className="text-xs text-primary hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>
        {treemapData.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No sector data yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <Treemap
              data={treemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="rgba(0,0,0,0.05)"
              content={
                <SectorCell
                  selectedSector={selectedSector}
                  onSelect={setSelectedSector}
                />
              }
            >
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]?.payload) return null;
                  const d = payload[0].payload as {
                    name: string;
                    size: number;
                    changePct: number;
                    signalCount: number;
                  };
                  return (
                    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                      <p className="font-semibold">{d.name}</p>
                      <p className="text-muted-foreground mt-0.5">
                        {d.size} stocks · {d.signalCount} signals
                      </p>
                      <p
                        className={`font-[var(--font-mono)] font-bold mt-1 ${
                          d.changePct >= 0 ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        {d.changePct >= 0 ? "+" : ""}
                        {d.changePct.toFixed(2)}%
                      </p>
                    </div>
                  );
                }}
              />
            </Treemap>
          </ResponsiveContainer>
        )}
      </div>

      {/* Movers — tabbed table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-1">
            {(
              [
                { key: "gainers", label: "Top Gainers", icon: TrendingUp },
                { key: "losers", label: "Top Losers", icon: TrendingDown },
                { key: "active", label: "Most Active", icon: Activity },
                { key: "all", label: "All Signals", icon: ArrowUpDown },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setMoverTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-md font-medium transition-colors ${
                    moverTab === t.key
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {moversRows.length} {selectedSector && `in ${selectedSector}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Symbol
                </th>
                <th className="text-right px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Price
                </th>
                <th className="text-right px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Change
                </th>
                <th className="text-right px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Volume
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Sector
                </th>
                <th className="text-center px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Signal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {moversRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-xs text-muted-foreground"
                  >
                    No data for this filter.
                  </td>
                </tr>
              ) : (
                moversRows.map((r) => <MoverRow key={r.ticker} row={r} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Global Indices Grid — grouped by category with tabs
// ════════════════════════════════════════════════════════════════

const CATEGORY_ORDER = ["US", "International", "Commodities", "Bonds", "Crypto"] as const;
const CATEGORY_ICONS: Record<string, string> = {
  US: "🇺🇸",
  International: "🌍",
  Commodities: "🛢️",
  Bonds: "🏦",
  Crypto: "₿",
};

function GlobalIndicesGrid({ indices }: { indices: MarketIndex[] }) {
  const [activeCategory, setActiveCategory] = useState<string>("US");

  const grouped = useMemo(() => {
    const map: Record<string, MarketIndex[]> = {};
    indices.forEach((idx) => {
      const cat = idx.category || "Other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(idx);
    });
    return map;
  }, [indices]);

  const activeIndices = grouped[activeCategory] ?? [];
  const categories = CATEGORY_ORDER.filter((c) => (grouped[c]?.length ?? 0) > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4 h-full">
      {/* Category tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <span>{CATEGORY_ICONS[cat]}</span>
            <span>{cat}</span>
            <span className="text-[10px] opacity-60">{grouped[cat]?.length ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Indices for active category */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {activeIndices.map((idx, i) => {
          const positive = (idx.changePct ?? 0) >= 0;
          return (
            <motion.div
              key={idx.ticker}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-lg border border-border bg-background/50 p-3"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                    {idx.label}
                  </p>
                  <p className="font-[var(--font-mono)] text-base font-bold mt-0.5">
                    {idx.price !== null
                      ? idx.price.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "—"}
                  </p>
                </div>
                <span
                  className={`font-[var(--font-mono)] text-[10px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded shrink-0 ${
                    positive
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {positive ? (
                    <TrendingUp className="h-2.5 w-2.5" />
                  ) : (
                    <TrendingDown className="h-2.5 w-2.5" />
                  )}
                  {idx.changePct === null
                    ? "—"
                    : `${positive ? "+" : ""}${idx.changePct.toFixed(2)}%`}
                </span>
              </div>
            </motion.div>
          );
        })}
        {activeIndices.length === 0 && (
          <p className="col-span-full text-xs text-muted-foreground text-center py-6">
            No data yet. Run /seed/ingest for these tickers.
          </p>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Market Pulse — breadth-based sentiment gauge
// ════════════════════════════════════════════════════════════════

function MarketPulse({
  pulse,
}: {
  pulse: { score: number; label: string; up: number; down: number; flat: number };
}) {
  const colors = {
    "Extreme Fear": "text-red-600",
    Fear: "text-red-500",
    Neutral: "text-amber-500",
    Greed: "text-emerald-500",
    "Extreme Greed": "text-emerald-600",
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Market Pulse</h2>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        Breadth: % of tracked stocks up today
      </p>

      {/* Gauge arc */}
      <div className="mt-4 flex flex-col items-center">
        <div className="relative w-40 h-20">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M 10 90 A 90 90 0 0 1 190 90"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              className="text-muted/40"
            />
            {/* Colored arc — 5 segments */}
            <path
              d="M 10 90 A 90 90 0 0 1 46 27"
              stroke="#DC2626"
              strokeWidth="12"
              fill="none"
              strokeLinecap="butt"
              opacity={pulse.score >= 0 ? 1 : 0.3}
            />
            <path
              d="M 46 27 A 90 90 0 0 1 100 10"
              stroke="#F59E0B"
              strokeWidth="12"
              fill="none"
              strokeLinecap="butt"
              opacity={pulse.score >= 25 ? 1 : 0.3}
            />
            <path
              d="M 100 10 A 90 90 0 0 1 154 27"
              stroke="#10B981"
              strokeWidth="12"
              fill="none"
              strokeLinecap="butt"
              opacity={pulse.score >= 50 ? 1 : 0.3}
            />
            <path
              d="M 154 27 A 90 90 0 0 1 190 90"
              stroke="#059669"
              strokeWidth="12"
              fill="none"
              strokeLinecap="butt"
              opacity={pulse.score >= 75 ? 1 : 0.3}
            />
            {/* Needle */}
            <line
              x1="100"
              y1="90"
              x2={100 + 75 * Math.cos(Math.PI - (pulse.score / 100) * Math.PI)}
              y2={90 - 75 * Math.sin(Math.PI - (pulse.score / 100) * Math.PI)}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-foreground"
            />
            <circle cx="100" cy="90" r="4" fill="currentColor" />
          </svg>
        </div>
        <p
          className={`font-[var(--font-heading)] text-3xl font-bold mt-2 ${colors[pulse.label as keyof typeof colors] ?? ""}`}
        >
          {pulse.score}
        </p>
        <p
          className={`text-xs font-bold uppercase tracking-widest mt-0.5 ${colors[pulse.label as keyof typeof colors] ?? ""}`}
        >
          {pulse.label}
        </p>
      </div>

      {/* Breadth stats */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
        <div className="text-center">
          <p className="font-[var(--font-mono)] text-lg font-bold text-emerald-500">
            {pulse.up}
          </p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
            Up
          </p>
        </div>
        <div className="text-center">
          <p className="font-[var(--font-mono)] text-lg font-bold text-muted-foreground">
            {pulse.flat}
          </p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
            Flat
          </p>
        </div>
        <div className="text-center">
          <p className="font-[var(--font-mono)] text-lg font-bold text-red-500">
            {pulse.down}
          </p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
            Down
          </p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Treemap cell
// ════════════════════════════════════════════════════════════════

function SectorCell(props: any) {
  const { x, y, width, height, name, changePct, signalCount, selectedSector, onSelect } = props;
  const pct = changePct ?? 0;

  // Color intensity based on performance
  const getColor = () => {
    const intensity = Math.min(Math.abs(pct) / 2, 1); // saturate at ±2%
    if (pct >= 0) {
      return `rgba(16, 185, 129, ${0.2 + intensity * 0.6})`;
    }
    return `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`;
  };

  const isSelected = selectedSector === name;
  const textSize = Math.min(width, height) < 60 ? 9 : Math.min(width, height) < 100 ? 11 : 13;

  return (
    <g
      onClick={() => onSelect(isSelected ? null : name)}
      style={{ cursor: "pointer" }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={getColor()}
        stroke={isSelected ? "#2563EB" : "rgba(0,0,0,0.08)"}
        strokeWidth={isSelected ? 2.5 : 1}
        rx={6}
      />
      {width > 50 && height > 30 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 4}
            textAnchor="middle"
            fill="#0F172A"
            fontSize={textSize}
            fontWeight={700}
          >
            {name.length > 14 ? name.slice(0, 12) + "…" : name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + textSize + 2}
            textAnchor="middle"
            fill={pct >= 0 ? "#059669" : "#DC2626"}
            fontSize={textSize - 1}
            fontWeight={600}
            fontFamily="Monaco, Courier, monospace"
          >
            {pct >= 0 ? "+" : ""}
            {pct.toFixed(2)}%
          </text>
        </>
      )}
    </g>
  );
}

// ════════════════════════════════════════════════════════════════
// Mover row
// ════════════════════════════════════════════════════════════════

function MoverRow({ row }: { row: ScreenerRow }) {
  const positive = (row.changePct ?? 0) >= 0;
  const signalColor =
    row.signalType === "BUY_TODAY"
      ? "bg-emerald-500/10 text-emerald-500"
      : row.signalType === "WATCH"
        ? "bg-amber-500/10 text-amber-500"
        : "bg-muted text-muted-foreground";

  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-4 py-2.5">
        <Link href={`/stock/${row.ticker}`} className="flex items-center gap-2">
          <StockLogo ticker={row.ticker} size={24} />
          <div>
            <p className="font-[var(--font-mono)] text-xs font-bold">{row.ticker}</p>
            <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
              {row.name}
            </p>
          </div>
        </Link>
      </td>
      <td className="px-4 py-2.5 text-right font-[var(--font-mono)] text-xs font-semibold">
        {row.price ? `$${row.price.toFixed(2)}` : "—"}
      </td>
      <td
        className={`px-4 py-2.5 text-right font-[var(--font-mono)] text-xs font-bold ${
          positive ? "text-emerald-500" : "text-red-500"
        }`}
      >
        {row.changePct === null
          ? "—"
          : `${positive ? "+" : ""}${row.changePct.toFixed(2)}%`}
      </td>
      <td className="px-4 py-2.5 text-right font-[var(--font-mono)] text-xs text-muted-foreground">
        {row.volume
          ? row.volume >= 1e6
            ? `${(row.volume / 1e6).toFixed(1)}M`
            : `${(row.volume / 1e3).toFixed(0)}K`
          : "—"}
      </td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground">
        {row.sector ?? "—"}
      </td>
      <td className="px-4 py-2.5 text-center">
        {row.signalScore !== null && row.signalType !== null ? (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${signalColor}`}
          >
            <span className="font-[var(--font-mono)] font-bold">
              {Math.round(row.signalScore)}
            </span>
            <span>{row.signalType.replace("_", " ")}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}
