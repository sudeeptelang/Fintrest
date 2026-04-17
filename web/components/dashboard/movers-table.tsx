"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Activity, ArrowUpDown } from "lucide-react";
import { useMarketScreener } from "@/lib/hooks";
import type { ScreenerRow } from "@/lib/api";
import { StockLogo } from "@/components/stock/stock-logo";
import type { ScreenerKey } from "./trending-lists";
import { SCREENERS } from "./trending-lists";

type MoverTab = "gainers" | "losers" | "active" | "all";

/**
 * Movers table — shows Top Gainers / Losers / Most Active / All Signals as tabs, OR
 * repopulates based on an external screener selection (passed via `screenerKey`).
 * Parent controls the screener; the local tab only matters when no screener is active.
 */
export function MoversTable({
  limit = 20,
  screenerKey = null,
}: {
  limit?: number;
  screenerKey?: ScreenerKey | null;
}) {
  // Fetch a wider universe than we display so screener pills (penny, oversold, new-highs,
  // etc.) have enough candidates to filter. The extra rows are cheap on the wire and cached
  // by React Query.
  const { data: screener } = useMarketScreener(500);
  const [moverTab, setMoverTab] = useState<MoverTab>("gainers");

  // When a screener pill maps cleanly to a tab, sync the tab so the UI stays coherent.
  useEffect(() => {
    if (screenerKey === "gainers") setMoverTab("gainers");
    else if (screenerKey === "losers") setMoverTab("losers");
  }, [screenerKey]);

  const stocks = useMemo(() => screener ?? [], [screener]);

  const rows = useMemo(() => {
    const list = [...stocks];

    // Screener-driven filters take precedence over the tab selection.
    switch (screenerKey) {
      case "ai-selected":
        return list
          .filter((s) => (s.signalScore ?? 0) > 0)
          .sort((a, b) => (b.signalScore ?? 0) - (a.signalScore ?? 0))
          .slice(0, limit);
      case "penny":
        return list
          .filter((s) => s.price !== null && s.price > 0 && s.price < 5)
          .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
          .slice(0, limit);
      case "unusual-volume":
        return list
          .filter((s) => (s.relVolume ?? 0) > 1.5)
          .sort((a, b) => (b.relVolume ?? 0) - (a.relVolume ?? 0))
          .slice(0, limit);
      case "oversold":
        return list
          .filter((s) => (s.perfWeek ?? 0) < -5)
          .sort((a, b) => (a.perfWeek ?? 0) - (b.perfWeek ?? 0))
          .slice(0, limit);
      case "new-highs":
        return list
          .filter((s) => (s.week52RangePct ?? 0) > 95)
          .sort((a, b) => (b.week52RangePct ?? 0) - (a.week52RangePct ?? 0))
          .slice(0, limit);
      case "new-lows":
        return list
          .filter((s) => (s.week52RangePct ?? 100) < 5)
          .sort((a, b) => (a.week52RangePct ?? 100) - (b.week52RangePct ?? 100))
          .slice(0, limit);
      case "hot-sentiment":
        return list
          .filter((s) => (s.signalScore ?? 0) > 0)
          .sort((a, b) => (b.signalScore ?? 0) - (a.signalScore ?? 0))
          .slice(0, limit);
      case "premarket-gainers":
      case "afterhours-gainers":
      case "sectors":
        // Not yet backed by data; fall through to the mover tab so the grid is still useful.
        break;
    }

    // Tabbed fallback (default mode, or after a non-implemented screener).
    switch (moverTab) {
      case "gainers":
        return list
          .filter((s) => (s.changePct ?? 0) > 0)
          .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))
          .slice(0, limit);
      case "losers":
        return list
          .filter((s) => (s.changePct ?? 0) < 0)
          .sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0))
          .slice(0, limit);
      case "active":
        return list
          .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
          .slice(0, limit);
      default:
        return list
          .sort((a, b) => (b.signalScore ?? 0) - (a.signalScore ?? 0))
          .slice(0, limit);
    }
  }, [stocks, moverTab, screenerKey, limit]);

  const activeLabel = screenerKey
    ? SCREENERS.find((s) => s.key === screenerKey)?.label
    : null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        {activeLabel ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Screener
            </span>
            <span className="text-sm font-semibold">{activeLabel}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 overflow-x-auto">
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
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-md font-medium whitespace-nowrap transition-colors ${
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
        )}
        <span className="text-[10px] text-muted-foreground shrink-0">
          {rows.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Symbol</th>
              <th className="text-right px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Price</th>
              <th className="text-right px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Change</th>
              <th className="text-right px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Volume</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sector</th>
              <th className="text-center px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Signal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No data for this filter.
                </td>
              </tr>
            ) : (
              rows.map((r) => <MoverRow key={r.ticker} row={r} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
            <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{row.name}</p>
          </div>
        </Link>
      </td>
      <td className="px-4 py-2.5 text-right font-[var(--font-mono)] text-xs font-semibold">
        {row.price ? `$${row.price.toFixed(2)}` : "—"}
      </td>
      <td className={`px-4 py-2.5 text-right font-[var(--font-mono)] text-xs font-bold ${positive ? "text-emerald-500" : "text-red-500"}`}>
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
      <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.sector ?? "—"}</td>
      <td className="px-4 py-2.5 text-center">
        {row.signalScore !== null && row.signalType !== null ? (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${signalColor}`}>
            <span className="font-[var(--font-mono)] font-bold">{Math.round(row.signalScore)}</span>
            <span>{row.signalType.replace("_", " ")}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}
