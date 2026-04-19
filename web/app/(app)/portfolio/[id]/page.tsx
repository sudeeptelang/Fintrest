"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowUpRight, TrendingUp, TrendingDown, AlertTriangle, Upload, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type Holding, type PortfolioReturnBreakdown, type RiskMetrics } from "@/lib/api";
import { ScoreRing } from "@/components/charts/score-ring";
import { PortfolioAthenaProfile } from "@/components/portfolio/portfolio-athena-profile";

// Sample holdings for the /portfolio/4 demo. Falls back in when the live portfolio has no
// holdings (empty or error), so the page never renders blank for a demo link. Values
// approximate reasonable entry prices vs current; day % is cosmetic.
const DEMO_HOLDINGS: Holding[] = [
  { id: 1001, stockId: 1, ticker: "AAPL",  stockName: "Apple Inc.",              quantity: 50, avgCost: 175.20, currentPrice: 189.40, currentValue: 9470,   unrealizedPnl: 710,    unrealizedPnlPct: 8.10,  signalScore: 72, dayChangePct: 1.24  },
  { id: 1002, stockId: 2, ticker: "MSFT",  stockName: "Microsoft Corp.",         quantity: 25, avgCost: 378.50, currentPrice: 421.30, currentValue: 10532.5, unrealizedPnl: 1070,   unrealizedPnlPct: 11.31, signalScore: 81, dayChangePct: 0.82  },
  { id: 1003, stockId: 3, ticker: "NVDA",  stockName: "NVIDIA Corp.",            quantity: 30, avgCost: 520.00, currentPrice: 875.60, currentValue: 26268,   unrealizedPnl: 10668,  unrealizedPnlPct: 68.38, signalScore: 88, dayChangePct: 2.45  },
  { id: 1004, stockId: 4, ticker: "GOOGL", stockName: "Alphabet Inc. Class A",   quantity: 20, avgCost: 138.80, currentPrice: 164.20, currentValue: 3284,    unrealizedPnl: 508,    unrealizedPnlPct: 18.30, signalScore: 66, dayChangePct: -0.34 },
  { id: 1005, stockId: 5, ticker: "AMZN",  stockName: "Amazon.com Inc.",         quantity: 15, avgCost: 142.50, currentPrice: 178.90, currentValue: 2683.5,  unrealizedPnl: 546,    unrealizedPnlPct: 25.54, signalScore: 74, dayChangePct: 1.12  },
  { id: 1006, stockId: 6, ticker: "META",  stockName: "Meta Platforms Inc.",     quantity: 12, avgCost: 320.00, currentPrice: 498.10, currentValue: 5977.2,  unrealizedPnl: 2137.2, unrealizedPnlPct: 55.66, signalScore: 79, dayChangePct: 1.88  },
  { id: 1007, stockId: 7, ticker: "TSLA",  stockName: "Tesla Inc.",              quantity: 20, avgCost: 240.00, currentPrice: 214.50, currentValue: 4290,    unrealizedPnl: -510,   unrealizedPnlPct: -10.63, signalScore: 48, dayChangePct: -2.15 },
  { id: 1008, stockId: 8, ticker: "JPM",   stockName: "JPMorgan Chase & Co.",    quantity: 25, avgCost: 165.40, currentPrice: 201.80, currentValue: 5045,    unrealizedPnl: 910,    unrealizedPnlPct: 22.01, signalScore: 69, dayChangePct: 0.42  },
];

interface PortfolioDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function PortfolioDetailPage({ params }: PortfolioDetailPageProps) {
  const { id } = use(params);
  const portfolioId = parseInt(id);

  // Portfolio 4 is the reserved demo slot — always renders hardcoded sample holdings
  // with no backend calls. Guarantees a clean, populated page for demo / marketing links
  // regardless of DB state, Athena advisor errors, or Fly backend availability.
  const usingDemoData = portfolioId === 4;

  const { data: holdingsRaw, isLoading: holdingsLoading } = useQuery({
    queryKey: ["portfolio-holdings", portfolioId],
    queryFn: () => api.portfolioHoldings(portfolioId),
    retry: 1,
    throwOnError: false,
    enabled: !usingDemoData,
  });

  const holdings = usingDemoData ? DEMO_HOLDINGS : holdingsRaw;

  // Analytics + advisor are enrichment — skipped entirely for the demo portfolio. For
  // real portfolios, failures (Athena thesis bug, missing risk metrics) degrade gracefully
  // without crashing the page.
  const { data: analytics } = useQuery({
    queryKey: ["portfolio-analytics", portfolioId],
    queryFn: () => api.portfolioAnalytics(portfolioId),
    retry: false,
    throwOnError: false,
    enabled: !usingDemoData,
  });

  const { data: advisorData, isError: advisorErrored } = useQuery({
    queryKey: ["portfolio-advisor", portfolioId],
    queryFn: () => api.portfolioAdvisor(portfolioId),
    retry: false,
    throwOnError: false,
    enabled: !usingDemoData,
  });

  // Return breakdown — pillar #1 of the 10-pillar spec. Powers the header KPIs:
  // total return (split into unrealized + realized + dividends) and annualized CAGR.
  const { data: returns } = useQuery({
    queryKey: ["portfolio-returns", portfolioId],
    queryFn: () => api.portfolioReturns(portfolioId),
    retry: false,
    throwOnError: false,
    enabled: !usingDemoData,
  });

  // Sortable holdings
  type HoldingSortKey = "ticker" | "shares" | "avgCost" | "price" | "dayChange" | "value" | "pnl" | "signal";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<HoldingSortKey>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sortedHoldings = useMemo(() => {
    if (!holdings) return [];
    return [...holdings].sort((a, b) => {
      let diff = 0;
      switch (sortKey) {
        case "ticker": diff = a.ticker.localeCompare(b.ticker); break;
        case "shares": diff = a.quantity - b.quantity; break;
        case "avgCost": diff = a.avgCost - b.avgCost; break;
        case "price": diff = a.currentPrice - b.currentPrice; break;
        case "dayChange": diff = (a.dayChangePct ?? 0) - (b.dayChangePct ?? 0); break;
        case "value": diff = a.currentValue - b.currentValue; break;
        case "pnl": diff = a.unrealizedPnlPct - b.unrealizedPnlPct; break;
        case "signal": diff = (a.signalScore ?? 0) - (b.signalScore ?? 0); break;
      }
      return sortDir === "asc" ? diff : -diff;
    });
  }, [holdings, sortKey, sortDir]);

  function handleSort(key: HoldingSortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "ticker" ? "asc" : "desc"); }
  }

  function SortIcon({ k }: { k: HoldingSortKey }) {
    if (sortKey !== k) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/40 inline ml-0.5" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-primary inline ml-0.5" />
      : <ChevronDown className="h-3 w-3 text-primary inline ml-0.5" />;
  }

  const totalValue = holdings?.reduce((sum, h) => sum + h.currentValue, 0) ?? 0;
  const totalPnl = holdings?.reduce((sum, h) => sum + h.unrealizedPnl, 0) ?? 0;
  const totalCost = holdings?.reduce((sum, h) => sum + h.quantity * h.avgCost, 0) ?? 0;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold">
            Portfolio{usingDemoData && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-primary/10 text-primary align-middle">Sample</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {usingDemoData
              ? "Demo portfolio — upload your own to see personalized analysis."
              : `${holdings?.length ?? 0} holdings`}
          </p>
        </div>
        <Link href="/portfolio/upload">
          <Button variant="outline" size="sm"><Upload className="h-3.5 w-3.5 mr-1.5" /> Upload / Import</Button>
        </Link>
      </div>

      {/* Summary row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Total Value</p>
          <p className="font-[var(--font-mono)] text-2xl font-bold">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Unrealized P&L</p>
          <p className={`font-[var(--font-mono)] text-2xl font-bold ${totalPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className={`text-xs font-medium mt-0.5 ${totalPnlPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Health Score</p>
          <div className="flex items-center gap-2">
            <p className="font-[var(--font-heading)] text-2xl font-bold">
              {usingDemoData
                ? 78
                : Math.round(analytics?.healthScore ?? advisorData?.healthScore ?? 0)}
            </p>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Recommendations</p>
          <p className="font-[var(--font-heading)] text-2xl font-bold">
            {usingDemoData ? 4 : (advisorData?.recommendations?.length ?? 0)}
          </p>
          {usingDemoData ? (
            <p className="text-[10px] text-muted-foreground mt-0.5">sample · rebalance + tax-loss</p>
          ) : (advisorData?.alerts?.length ?? 0) > 0 && (
            <p className="text-xs text-amber-400 mt-0.5 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {advisorData!.alerts.length} alerts
            </p>
          )}
        </div>
      </div>

      {/* Return breakdown — pillar #1. Three-source split of lifetime return
          plus annualized CAGR. Only meaningful when transactions exist, so
          hidden on the demo portfolio (no txns) and while loading. */}
      {!usingDemoData && returns && returns.costBasis > 0 && (
        <ReturnBreakdownCard data={returns} />
      )}

      {/* Risk metrics — pillar #2. Sharpe / Sortino / drawdown / beta /
          volatility / VaR as a 6-cell grid. Only renders when the analytics
          endpoint returned metrics. */}
      {!usingDemoData && analytics?.riskMetrics && (
        <RiskMetricsCard metrics={analytics.riskMetrics} />
      )}

      {/* Lens profile — factor radar + signal mix + regime. Only renders when the advisor
          call succeeds; if it errored (known Npgsql disposed-connector issue during scans,
          or stale advisor record), we skip it rather than crash the whole page. */}
      {!advisorErrored && advisorData && (
        <PortfolioAthenaProfile advisor={advisorData} />
      )}

      {/* Holdings table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-[var(--font-heading)] text-lg font-semibold">Holdings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {([
                  ["Stock", "ticker", "text-left"],
                  ["Shares", "shares", "text-right"],
                  ["Avg Cost", "avgCost", "text-right"],
                  ["Price", "price", "text-right"],
                  ["% Today", "dayChange", "text-right"],
                  ["Value", "value", "text-right"],
                  ["Gain/Loss $", "pnl", "text-right"],
                  ["Return %", "pnl", "text-right"],
                  ["Signal", "signal", "text-center"],
                ] as const).map(([label, key, alignClass], i) => {
                  const active = sortKey === key;
                  return (
                    <th
                      key={`${key}-${i}`}
                      className={`${alignClass} px-5 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors ${
                        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => handleSort(key)}
                      title="Click to sort"
                    >
                      <span className="inline-flex items-center gap-0.5">
                        {label}
                        <SortIcon k={key} />
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {holdingsLoading ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : sortedHoldings.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-muted-foreground">No holdings</td></tr>
              ) : sortedHoldings.map((h) => {
                const costBasis = h.quantity * h.avgCost;
                return (
                  <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/stock/${h.ticker}`} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="font-[var(--font-mono)] text-[10px] font-bold text-primary">{h.ticker.slice(0, 2)}</span>
                        </div>
                        <div>
                          <p className="font-semibold font-[var(--font-mono)]">{h.ticker}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[120px]">{h.stockName}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-right font-[var(--font-mono)]">{h.quantity}</td>
                    <td className="px-5 py-3.5 text-right font-[var(--font-mono)] text-muted-foreground">${h.avgCost.toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-right font-[var(--font-mono)]">${h.currentPrice.toFixed(2)}</td>
                    <td className={`px-5 py-3.5 text-right font-[var(--font-mono)] font-semibold ${
                      h.dayChangePct === null
                        ? "text-muted-foreground"
                        : h.dayChangePct >= 0 ? "text-emerald-500" : "text-red-500"
                    }`}>
                      {h.dayChangePct === null
                        ? "—"
                        : `${h.dayChangePct >= 0 ? "+" : ""}${h.dayChangePct.toFixed(2)}%`}
                    </td>
                    <td className="px-5 py-3.5 text-right font-[var(--font-mono)]">
                      <p>${h.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      <p className="text-[10px] text-muted-foreground">cost ${costBasis.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </td>
                    <td className={`px-5 py-3.5 text-right font-[var(--font-mono)] font-semibold ${h.unrealizedPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {h.unrealizedPnl >= 0 ? "+$" : "-$"}{Math.abs(h.unrealizedPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className={`px-5 py-3.5 text-right font-[var(--font-mono)] font-semibold ${h.unrealizedPnlPct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {h.unrealizedPnlPct >= 0 ? "+" : ""}{h.unrealizedPnlPct.toFixed(1)}%
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {h.signalScore != null ? (
                        <span className="font-[var(--font-mono)] text-xs font-bold">{Math.round(h.signalScore)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Total-return decomposition card. Shows the three sources of a portfolio's
 * lifetime return side-by-side (price appreciation / realized gains / dividends)
 * plus annualized CAGR so large absolute returns are contextualized by time held.
 * Mirrors SimplyWall.st's demo portfolio header pattern.
 */
function ReturnBreakdownCard({ data }: { data: PortfolioReturnBreakdown }) {
  const fmt$ = (n: number) => {
    const sign = n >= 0 ? "+" : "−";
    return `${sign}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };
  const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

  // Horizontal proportional bar — widths derived from absolute contribution so
  // the reader sees at a glance which source drove the total.
  const components = [
    { label: "Unrealized", value: data.unrealizedPnl, color: "bg-emerald-500" },
    { label: "Realized",   value: data.realizedPnl,   color: "bg-blue-500" },
    { label: "Dividends",  value: data.dividendsReceived, color: "bg-amber-500" },
  ];
  const absTotal = components.reduce((s, c) => s + Math.abs(c.value), 0);

  const inception = data.inceptionDate
    ? new Date(data.inceptionDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h3 className="font-[var(--font-heading)] text-base font-semibold">Return breakdown</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Lifetime return split across its three sources
            {inception && ` · since ${inception}`}
          </p>
        </div>
        <div className="flex items-baseline gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total return</p>
            <p className={`font-[var(--font-mono)] text-xl font-bold ${data.totalReturn >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {fmt$(data.totalReturn)}
            </p>
            <p className={`text-xs font-medium ${data.totalReturnPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {fmtPct(data.totalReturnPct)}
            </p>
          </div>
          {data.annualizedReturnPct != null && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Annualized</p>
              <p className={`font-[var(--font-mono)] text-xl font-bold ${data.annualizedReturnPct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {fmtPct(data.annualizedReturnPct)}
              </p>
              <p className="text-xs text-muted-foreground">CAGR · {(data.daysSinceInception / 365.25).toFixed(1)}y</p>
            </div>
          )}
        </div>
      </div>

      {/* Proportional contribution bar */}
      {absTotal > 0 && (
        <div className="mb-4">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
            {components.map((c) => {
              const width = (Math.abs(c.value) / absTotal) * 100;
              if (width < 0.5) return null;
              return (
                <div
                  key={c.label}
                  className={c.color}
                  style={{ width: `${width}%` }}
                  title={`${c.label}: ${fmt$(c.value)}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Three component cards */}
      <div className="grid grid-cols-3 gap-3">
        {components.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-background/50 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`h-2 w-2 rounded-full ${c.color}`} />
              <p className="text-[11px] text-muted-foreground">{c.label}</p>
            </div>
            <p className={`font-[var(--font-mono)] text-base font-semibold ${c.value >= 0 ? "text-foreground" : "text-red-500"}`}>
              {fmt$(c.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Cost basis + current value footnote */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
        <span>
          Invested:{" "}
          <span className="font-[var(--font-mono)] text-foreground/80 font-medium">
            ${data.costBasis.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </span>
        <span>
          Current value:{" "}
          <span className="font-[var(--font-mono)] text-foreground/80 font-medium">
            ${data.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </span>
      </div>
    </div>
  );
}

/**
 * Risk metrics grid (pillar #2). Surfaces the numbers the backend already computes
 * — Sharpe, Sortino, Max drawdown, Beta, Volatility, VaR 95% — so users don't have
 * to take our "health score" on faith. Color coding is directional, not diagnostic:
 * a higher Sharpe is usually better, a higher drawdown is usually worse, Beta near
 * 1.0 means "moves with the market."
 */
function RiskMetricsCard({ metrics }: { metrics: RiskMetrics }) {
  const cells: Array<{
    label: string;
    value: string;
    hint: string;
    good: boolean | null;
  }> = [
    {
      label: "Sharpe Ratio",
      value: metrics.sharpeRatio != null ? metrics.sharpeRatio.toFixed(2) : "—",
      hint: "Return per unit of total risk · higher is better",
      good: metrics.sharpeRatio != null ? metrics.sharpeRatio >= 1.0 : null,
    },
    {
      label: "Sortino Ratio",
      value: metrics.sortinoRatio != null ? metrics.sortinoRatio.toFixed(2) : "—",
      hint: "Return per unit of downside risk · higher is better",
      good: metrics.sortinoRatio != null ? metrics.sortinoRatio >= 1.5 : null,
    },
    {
      label: "Max Drawdown",
      value: metrics.maxDrawdown != null ? `-${(metrics.maxDrawdown * 100).toFixed(1)}%` : "—",
      hint: "Worst peak-to-trough loss · lower is better",
      good: metrics.maxDrawdown != null ? metrics.maxDrawdown < 0.20 : null,
    },
    {
      label: "Beta (vs SPY)",
      value: metrics.beta != null ? metrics.beta.toFixed(2) : "—",
      hint: "Sensitivity to S&P 500 · 1.0 = market · >1 = amplified",
      good: null, // directional, not judgmental
    },
    {
      label: "Volatility",
      value: metrics.volatility != null ? `${(metrics.volatility * 100).toFixed(1)}%` : "—",
      hint: "Annualized standard deviation of returns",
      good: metrics.volatility != null ? metrics.volatility < 0.25 : null,
    },
    {
      label: "VaR 95%",
      value: metrics.var95 != null ? `${(metrics.var95 * 100).toFixed(2)}%` : "—",
      hint: "Expected worst daily loss 95% of the time",
      good: null,
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h3 className="font-[var(--font-heading)] text-base font-semibold">Risk profile</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Measured over the last 90 trading days · recomputed each request
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="rounded-lg border border-border bg-background/50 p-3.5"
          >
            <p className="text-[11px] text-muted-foreground">{cell.label}</p>
            <p
              className={`font-[var(--font-mono)] text-xl font-semibold mt-1 ${
                cell.good === true
                  ? "text-emerald-500"
                  : cell.good === false
                  ? "text-amber-500"
                  : "text-foreground"
              }`}
            >
              {cell.value}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
              {cell.hint}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
