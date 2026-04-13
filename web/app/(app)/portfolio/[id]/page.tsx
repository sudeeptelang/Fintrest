"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Brain, BarChart3, ArrowUpRight, TrendingUp, TrendingDown, AlertTriangle, Upload, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type Holding } from "@/lib/api";
import { ScoreRing } from "@/components/charts/score-ring";

interface PortfolioDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function PortfolioDetailPage({ params }: PortfolioDetailPageProps) {
  const { id } = use(params);
  const portfolioId = parseInt(id);

  const { data: holdings, isLoading: holdingsLoading } = useQuery({
    queryKey: ["portfolio-holdings", portfolioId],
    queryFn: () => api.portfolioHoldings(portfolioId),
  });

  const { data: analytics } = useQuery({
    queryKey: ["portfolio-analytics", portfolioId],
    queryFn: () => api.portfolioAnalytics(portfolioId),
  });

  const { data: advisorData } = useQuery({
    queryKey: ["portfolio-advisor", portfolioId],
    queryFn: () => api.portfolioAdvisor(portfolioId),
  });

  // Sortable holdings
  type HoldingSortKey = "ticker" | "shares" | "avgCost" | "price" | "value" | "pnl" | "signal";
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
          <h1 className="font-[var(--font-heading)] text-2xl font-bold">Portfolio</h1>
          <p className="text-sm text-muted-foreground mt-1">{holdings?.length ?? 0} holdings</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/portfolio/${id}/advisor`}>
            <Button variant="outline" size="sm"><Brain className="h-3.5 w-3.5 mr-1.5" /> AI Advisor</Button>
          </Link>
          <Link href={`/portfolio/${id}/analytics`}>
            <Button variant="outline" size="sm"><BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Analytics</Button>
          </Link>
        </div>
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
              {Math.round(analytics?.healthScore ?? advisorData?.healthScore ?? 0)}
            </p>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Recommendations</p>
          <p className="font-[var(--font-heading)] text-2xl font-bold">
            {advisorData?.recommendations?.length ?? 0}
          </p>
          {(advisorData?.alerts?.length ?? 0) > 0 && (
            <p className="text-xs text-amber-400 mt-0.5 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {advisorData!.alerts.length} alerts
            </p>
          )}
        </div>
      </div>

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
                  ["Stock", "ticker", "left"],
                  ["Shares", "shares", "right"],
                  ["Avg Cost", "avgCost", "right"],
                  ["Price", "price", "right"],
                  ["Value", "value", "right"],
                  ["P&L", "pnl", "right"],
                  ["Signal", "signal", "center"],
                ] as const).map(([label, key, align]) => (
                  <th
                    key={key}
                    className={`text-${align} px-5 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors`}
                    onClick={() => handleSort(key)}
                  >
                    {label}<SortIcon k={key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {holdingsLoading ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : sortedHoldings.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">No holdings</td></tr>
              ) : sortedHoldings.map((h) => (
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
                  <td className="px-5 py-3.5 text-right font-[var(--font-mono)]">${h.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className={`px-5 py-3.5 text-right font-[var(--font-mono)] ${h.unrealizedPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {h.unrealizedPnl >= 0 ? "+" : ""}{h.unrealizedPnlPct.toFixed(1)}%
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {h.signalScore != null ? (
                      <span className="font-[var(--font-mono)] text-xs font-bold">{Math.round(h.signalScore)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
