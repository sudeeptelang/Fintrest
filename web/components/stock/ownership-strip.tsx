"use client";

import { Building2, Users, TrendingUp, TrendingDown } from "lucide-react";
import type { OwnershipResponse } from "@/lib/api";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function fmtShares(n: number | null): string {
  if (n === null || n === undefined) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function fmtCurrency(n: number | null): string {
  if (n === null || n === undefined) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function txTypeLabel(t: string | null): { label: string; isBuy: boolean } {
  if (!t) return { label: "—", isBuy: false };
  const upper = t.toUpperCase();
  if (upper.includes("P-") || upper.includes("PURCHASE") || upper.startsWith("P"))
    return { label: "Buy", isBuy: true };
  if (upper.includes("S-") || upper.includes("SALE") || upper.startsWith("S"))
    return { label: "Sell", isBuy: false };
  return { label: t, isBuy: false };
}

export function OwnershipStrip({ data }: { data: OwnershipResponse }) {
  const instPct = data.institutionalPercent;
  const investors = data.investorsHolding;
  const investorsChange = data.investorsHoldingChange ?? 0;
  const trades = data.recentInsiderTrades ?? [];

  const hasAnything =
    (instPct !== null && instPct !== undefined) ||
    (investors !== null && investors !== undefined) ||
    trades.length > 0;

  if (!hasAnything) return null;

  // Bucket insider trades into buys vs sells
  const buys = trades.filter((t) => txTypeLabel(t.transactionType).isBuy);
  const sells = trades.filter((t) => !txTypeLabel(t.transactionType).isBuy);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-[var(--font-heading)] text-lg font-semibold">
            Ownership & Insider Activity
          </h3>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border border-b border-border">
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Institutional %
          </p>
          <p className="font-[var(--font-heading)] text-2xl font-bold mt-1">
            {instPct !== null && instPct !== undefined ? `${instPct.toFixed(1)}%` : "—"}
          </p>
          {data.ownershipPercentChange !== null && data.ownershipPercentChange !== undefined && (
            <p className={`text-[10px] mt-0.5 ${data.ownershipPercentChange >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {data.ownershipPercentChange >= 0 ? "+" : ""}
              {data.ownershipPercentChange.toFixed(2)}pp QoQ
            </p>
          )}
        </div>
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Investors Holding
          </p>
          <p className="font-[var(--font-heading)] text-2xl font-bold mt-1">
            {investors !== null && investors !== undefined ? investors.toLocaleString() : "—"}
          </p>
          {investorsChange !== 0 && (
            <p className={`text-[10px] mt-0.5 flex items-center gap-0.5 ${investorsChange >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {investorsChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {investorsChange >= 0 ? "+" : ""}{investorsChange} QoQ
            </p>
          )}
        </div>
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Total Invested
          </p>
          <p className="font-[var(--font-heading)] text-2xl font-bold mt-1">
            {fmtCurrency(data.totalInvested)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">13F filings</p>
        </div>
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Insider Activity
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-[var(--font-heading)] text-2xl font-bold text-emerald-500">
              {buys.length}
            </span>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="font-[var(--font-heading)] text-lg font-bold text-red-500">
              {sells.length}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Buys / Sells</p>
        </div>
      </div>

      {/* Recent insider transactions */}
      {trades.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 px-5 pt-4 pb-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Insider Transactions
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-5 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Date</th>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Insider</th>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Role</th>
                  <th className="px-3 py-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Type</th>
                  <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Shares</th>
                  <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Price</th>
                  <th className="px-5 py-2 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {trades.slice(0, 8).map((t, i) => {
                  const tx = txTypeLabel(t.transactionType);
                  return (
                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-2 font-[var(--font-mono)] text-xs text-muted-foreground">
                        {fmtDate(t.transactionDate)}
                      </td>
                      <td className="px-3 py-2 text-xs font-medium truncate max-w-[180px]">
                        {t.reportingName ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[140px]">
                        {t.relationship ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${tx.isBuy ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
                          {tx.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-[var(--font-mono)] text-xs">
                        {fmtShares(t.sharesTraded)}
                      </td>
                      <td className="px-3 py-2 text-right font-[var(--font-mono)] text-xs">
                        {t.price !== null ? `$${t.price.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-5 py-2 text-right font-[var(--font-mono)] text-xs font-semibold">
                        {fmtCurrency(t.totalValue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="px-5 py-6 text-xs text-muted-foreground text-center">
          No recent insider transactions on file.
        </p>
      )}
    </div>
  );
}
