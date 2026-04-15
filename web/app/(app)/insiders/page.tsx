"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users, TrendingUp, TrendingDown, Loader2, Flame, X } from "lucide-react";
import { StockLogo } from "@/components/stock/stock-logo";
import { useInsidersLatest } from "@/lib/hooks";
import type { InsiderActivity } from "@/lib/api";
import { PaywallGate } from "@/components/billing/paywall-gate";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function fmtShares(n: number | null): string {
  if (n === null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function fmtCurrency(n: number | null): string {
  if (n === null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function txType(t: string | null): { label: string; isBuy: boolean } {
  if (!t) return { label: "—", isBuy: false };
  const upper = t.toUpperCase();
  if (upper.includes("P-") || upper.includes("PURCHASE") || upper.startsWith("P"))
    return { label: "Buy", isBuy: true };
  if (upper.includes("S-") || upper.includes("SALE") || upper.startsWith("S"))
    return { label: "Sell", isBuy: false };
  return { label: t, isBuy: false };
}

type Filter = "all" | "buy" | "sell";

export default function InsidersPage() {
  const { data, isLoading } = useInsidersLatest(150);
  const [filter, setFilter] = useState<Filter>("all");
  const [minValue, setMinValue] = useState<number>(0);

  // Cluster-buy detection: 3+ distinct insiders buying the same ticker in the feed.
  const clusterTickers = useMemo(() => {
    const map = new Map<string, Set<string>>();
    (data ?? []).forEach((t) => {
      if (!txType(t.transactionType).isBuy) return;
      if (!t.reportingName) return;
      if (!map.has(t.ticker)) map.set(t.ticker, new Set());
      map.get(t.ticker)!.add(t.reportingName);
    });
    return new Set(
      Array.from(map.entries())
        .filter(([, insiders]) => insiders.size >= 3)
        .map(([ticker]) => ticker),
    );
  }, [data]);

  const filtered = useMemo(() => {
    const rows = data ?? [];
    return rows.filter((t) => {
      const tx = txType(t.transactionType);
      if (filter === "buy" && !tx.isBuy) return false;
      if (filter === "sell" && tx.isBuy) return false;
      if (minValue > 0 && (t.totalValue ?? 0) < minValue) return false;
      return true;
    });
  }, [data, filter, minValue]);

  const totalBuys = (data ?? []).filter((t) => txType(t.transactionType).isBuy).length;
  const totalSells = (data ?? []).filter((t) => !txType(t.transactionType).isBuy).length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Insider Activity
        </p>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold mt-1 flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Insider Trading Feed
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Recent Form 4 filings across US equities. Watch for cluster buys — when
          3+ executives purchase the same stock, history suggests informed conviction.
        </p>
      </div>

      <PaywallGate tier="pro">
      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Recent Filings" value={String(data?.length ?? 0)} sub="last batch" />
        <StatCard label="Buys" value={String(totalBuys)} sub="insider purchases" color="emerald" />
        <StatCard label="Sells" value={String(totalSells)} sub="insider sales" color="red" />
        <StatCard
          label="Cluster Buys"
          value={String(clusterTickers.size)}
          sub="3+ insiders, same stock"
          color="primary"
        />
      </div>

      {/* Cluster buy highlight */}
      {clusterTickers.size > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Cluster Buy Alerts</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from(clusterTickers).map((ticker) => (
              <Link
                key={ticker}
                href={`/stock/${ticker}`}
                className="flex items-center gap-2 rounded-lg border border-primary/40 bg-card px-3 py-1.5 hover:bg-primary/10 transition-colors"
              >
                <StockLogo ticker={ticker} size={20} />
                <span className="font-[var(--font-mono)] text-xs font-bold">{ticker}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-border flex-wrap">
          <div className="flex items-center gap-1">
            {(["all", "buy", "sell"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded-md font-medium capitalize transition-colors ${
                  filter === f ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {f === "all" ? "All" : f === "buy" ? "Buys only" : "Sells only"}
              </button>
            ))}
          </div>
          <select
            value={minValue}
            onChange={(e) => setMinValue(Number(e.target.value))}
            className="text-[11px] bg-muted/30 border border-border rounded-md px-2 py-1 outline-none focus:border-primary/50"
          >
            <option value={0}>Any value</option>
            <option value={10000}>$10K+</option>
            <option value={100000}>$100K+</option>
            <option value={1000000}>$1M+</option>
            <option value={10000000}>$10M+</option>
          </select>
          {(filter !== "all" || minValue > 0) && (
            <button
              onClick={() => { setFilter("all"); setMinValue(0); }}
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
          <div className="ml-auto text-[10px] text-muted-foreground">
            {filtered.length} filings
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Date</th>
                <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Symbol</th>
                <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Insider</th>
                <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Role</th>
                <th className="px-3 py-2.5 text-center text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Type</th>
                <th className="px-3 py-2.5 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Shares</th>
                <th className="px-3 py-2.5 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Price</th>
                <th className="px-4 py-2.5 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-xs text-muted-foreground">
                  No filings match the current filters.
                </td></tr>
              ) : (
                filtered.map((t, i) => <Row key={i} t={t} isCluster={clusterTickers.has(t.ticker)} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center pt-2">
        Source: SEC Form 4 filings via FMP. Educational only — not a recommendation.
      </p>
      </PaywallGate>
    </div>
  );
}

function Row({ t, isCluster }: { t: InsiderActivity; isCluster: boolean }) {
  const tx = txType(t.transactionType);
  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-4 py-2 font-[var(--font-mono)] text-xs text-muted-foreground whitespace-nowrap">
        {fmtDate(t.transactionDate)}
      </td>
      <td className="px-3 py-2">
        <Link href={`/stock/${t.ticker}`} className="flex items-center gap-2">
          <StockLogo ticker={t.ticker} size={22} />
          <span className="font-[var(--font-mono)] text-xs font-bold">{t.ticker}</span>
          {isCluster && <Flame className="h-3 w-3 text-primary" />}
        </Link>
      </td>
      <td className="px-3 py-2 text-xs font-medium truncate max-w-[200px]">
        {t.reportingName ?? "—"}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[140px]">
        {t.relationship ?? "—"}
      </td>
      <td className="px-3 py-2 text-center">
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
          tx.isBuy ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
        }`}>
          {tx.isBuy ? <TrendingUp className="h-3 w-3 inline mr-0.5" /> : <TrendingDown className="h-3 w-3 inline mr-0.5" />}
          {tx.label}
        </span>
      </td>
      <td className="px-3 py-2 text-right font-[var(--font-mono)] text-xs">{fmtShares(t.sharesTraded)}</td>
      <td className="px-3 py-2 text-right font-[var(--font-mono)] text-xs">
        {t.price !== null ? `$${t.price.toFixed(2)}` : "—"}
      </td>
      <td className="px-4 py-2 text-right font-[var(--font-mono)] text-xs font-semibold">
        {fmtCurrency(t.totalValue)}
      </td>
    </tr>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color?: "emerald" | "red" | "primary";
}) {
  const valueColor =
    color === "emerald" ? "text-emerald-500"
    : color === "red" ? "text-red-500"
    : color === "primary" ? "text-primary"
    : "";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`font-[var(--font-heading)] text-2xl font-bold mt-1 ${valueColor}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
