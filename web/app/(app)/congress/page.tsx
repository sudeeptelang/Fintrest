"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Landmark, Loader2, ExternalLink, X } from "lucide-react";
import { StockLogo } from "@/components/stock/stock-logo";
import { useCongressLatest } from "@/lib/hooks";
import type { CongressTradeRow } from "@/lib/api";
import { PaywallGate } from "@/components/billing/paywall-gate";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function txType(t: string | null): { label: string; isBuy: boolean } {
  if (!t) return { label: "—", isBuy: false };
  const upper = t.toUpperCase();
  if (upper.includes("PURCHASE") || upper.includes("BUY"))
    return { label: "Purchase", isBuy: true };
  if (upper.includes("SALE") || upper.includes("SELL"))
    return { label: upper.includes("PARTIAL") ? "Partial Sale" : "Sale", isBuy: false };
  return { label: t, isBuy: false };
}

type Chamber = "all" | "senate" | "house";
type Side = "all" | "buy" | "sell";

export default function CongressPage() {
  const { data, isLoading } = useCongressLatest(150);
  const [chamber, setChamber] = useState<Chamber>("all");
  const [side, setSide] = useState<Side>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const q = search.trim().toUpperCase();
    return rows.filter((t) => {
      if (chamber !== "all" && t.chamber !== chamber) return false;
      const tx = txType(t.transactionType);
      if (side === "buy" && !tx.isBuy) return false;
      if (side === "sell" && tx.isBuy) return false;
      if (q && !(t.ticker.includes(q) || (t.representative ?? "").toUpperCase().includes(q))) return false;
      return true;
    });
  }, [data, chamber, side, search]);

  const senateCount = (data ?? []).filter((t) => t.chamber === "senate").length;
  const houseCount = (data ?? []).filter((t) => t.chamber === "house").length;
  const buyCount = (data ?? []).filter((t) => txType(t.transactionType).isBuy).length;

  // Top tickers by count
  const topTickers = useMemo(() => {
    const counts = new Map<string, number>();
    (data ?? []).forEach((t) => {
      if (!t.ticker) return;
      counts.set(t.ticker, (counts.get(t.ticker) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [data]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Political Tracking
        </p>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold mt-1 flex items-center gap-2">
          <Landmark className="h-6 w-6 text-primary" /> Congress Trading
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Stock disclosures filed under the STOCK Act by US Senators and
          Representatives. Amounts are disclosed as ranges.
        </p>
      </div>


      <PaywallGate tier="pro">
      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Disclosures" value={String(data?.length ?? 0)} sub="recent filings" />
        <StatCard label="Senate" value={String(senateCount)} sub="disclosures" />
        <StatCard label="House" value={String(houseCount)} sub="disclosures" />
        <StatCard label="Buys" value={String(buyCount)} sub="purchase type" color="emerald" />
      </div>

      {/* Most-traded tickers */}
      {topTickers.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Most-Traded by Members</h3>
          <div className="flex flex-wrap gap-2">
            {topTickers.map(([ticker, count]) => (
              <Link
                key={ticker}
                href={`/stock/${ticker}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5 hover:border-primary/40 transition-colors"
              >
                <StockLogo ticker={ticker} size={20} />
                <span className="font-[var(--font-mono)] text-xs font-bold">{ticker}</span>
                <span className="text-[10px] text-muted-foreground">×{count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filters + table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-border flex-wrap">
          <div className="flex items-center gap-1">
            {(["all", "senate", "house"] as Chamber[]).map((c) => (
              <button
                key={c}
                onClick={() => setChamber(c)}
                className={`px-3 py-1 text-xs rounded-md font-medium capitalize transition-colors ${
                  chamber === c ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 border-l border-border pl-2">
            {(["all", "buy", "sell"] as Side[]).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`px-3 py-1 text-xs rounded-md font-medium capitalize transition-colors ${
                  side === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {s === "all" ? "All" : s === "buy" ? "Purchases" : "Sales"}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Ticker or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-[11px] bg-muted/30 border border-border rounded-md px-2 py-1 outline-none focus:border-primary/50 w-[180px]"
          />
          {(chamber !== "all" || side !== "all" || search) && (
            <button
              onClick={() => { setChamber("all"); setSide("all"); setSearch(""); }}
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
          <div className="ml-auto text-[10px] text-muted-foreground">
            {filtered.length} disclosures
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Disclosed</th>
                <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Traded</th>
                <th className="px-3 py-2.5 text-center text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Chamber</th>
                <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Member</th>
                <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Symbol</th>
                <th className="px-3 py-2.5 text-center text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Type</th>
                <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Amount</th>
                <th className="px-4 py-2.5 text-center text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                </td></tr>
              ) : (data?.length ?? 0) === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center space-y-1">
                  <p className="text-sm font-medium">No congressional disclosures available yet</p>
                  <p className="text-xs text-muted-foreground">
                    Senate + House STOCK Act filings aren&apos;t loading from the provider right now. Check back shortly.
                  </p>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-xs text-muted-foreground">
                  No disclosures match the current filters.
                </td></tr>
              ) : (
                filtered.map((t, i) => <Row key={i} t={t} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center pt-2">
        Source: US Senate & House of Representatives STOCK Act disclosures via FMP.
        Amounts are self-reported ranges. Educational only — not a recommendation.
      </p>
      </PaywallGate>
    </div>
  );
}

function Row({ t }: { t: CongressTradeRow }) {
  const tx = txType(t.transactionType);
  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-4 py-2 font-[var(--font-mono)] text-xs text-muted-foreground whitespace-nowrap">
        {fmtDate(t.disclosureDate)}
      </td>
      <td className="px-3 py-2 font-[var(--font-mono)] text-xs text-muted-foreground whitespace-nowrap">
        {fmtDate(t.transactionDate)}
      </td>
      <td className="px-3 py-2 text-center">
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
          t.chamber === "senate" ? "bg-blue-500/10 text-blue-600" : "bg-purple-500/10 text-purple-600"
        }`}>
          {t.chamber}
        </span>
      </td>
      <td className="px-3 py-2 text-xs font-medium truncate max-w-[180px]">
        {t.representative ?? "—"}
      </td>
      <td className="px-3 py-2">
        {t.ticker ? (
          <Link href={`/stock/${t.ticker}`} className="flex items-center gap-2">
            <StockLogo ticker={t.ticker} size={22} />
            <span className="font-[var(--font-mono)] text-xs font-bold">{t.ticker}</span>
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground truncate block max-w-[180px]">
            {t.assetDescription ?? "—"}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
          tx.isBuy ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
        }`}>
          {tx.label}
        </span>
      </td>
      <td className="px-3 py-2 font-[var(--font-mono)] text-[11px] text-muted-foreground">
        {t.amount ?? "—"}
      </td>
      <td className="px-4 py-2 text-center">
        {t.sourceUrl ? (
          <a
            href={t.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5 text-[11px]"
          >
            Filing <ExternalLink className="h-2.5 w-2.5" />
          </a>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        )}
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
  color?: "emerald";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`font-[var(--font-heading)] text-2xl font-bold mt-1 ${color === "emerald" ? "text-emerald-500" : ""}`}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
