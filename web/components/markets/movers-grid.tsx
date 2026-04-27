"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { useMarketScreener, useMarketMovers } from "@/lib/hooks";
import type { ScreenerRow, MoverRow } from "@/lib/api";
import { cn } from "@/lib/utils";
import { StockLogo } from "@/components/ui/stock-logo";
import { ScoreGradeChip } from "@/components/ui/score-grade-chip";

// Tabs gainers / losers / active are sourced from FMP's authoritative
// /biggest-gainers / /biggest-losers / /most-actives endpoints (via our
// /market/movers passthrough). The other three tabs — unusual / 52w high
// / 52w low — still derive from the screener feed because FMP doesn't
// expose them as direct endpoints. The screener's changePct now comes
// only from live_quotes (15-min refresh), so it shows "—" rather than
// stale bar-derived numbers when live data is missing.

/**
 * Consolidated Market Movers grid — the "one grid" replacement for the
 * three-column TopMovers card. Tabs on top (Gainers / Losers / 52wk H /
 * 52wk L / Prev Day), sector + size filters alongside, a single
 * data-dense grid below with letter grades, stock logos, and inline
 * "Run Lens" + "+ Watchlist" actions.
 *
 * This is where Markets and Screener consolidation begins. Same raw
 * feed as /research/screener; different preset filters. Mobile
 * collapses to a compressed row layout so the grid still fits at
 * 390 px.
 */

type TabKey = "gainers" | "losers" | "high52" | "low52" | "unusual" | "active";

const TABS: { key: TabKey; label: string }[] = [
  { key: "gainers", label: "Top Gainers" },
  { key: "losers", label: "Top Losers" },
  { key: "active", label: "Most Active" },
  { key: "unusual", label: "Unusual Vol" },
  { key: "high52", label: "52wk High" },
  { key: "low52", label: "52wk Low" },
];


export function MoversGrid({
  initialTab = "gainers",
  maxRows = 12,
  showFullScreenerLink = true,
}: {
  initialTab?: TabKey;
  maxRows?: number;
  /** Hide the "Full screener →" link when already on the full page */
  showFullScreenerLink?: boolean;
} = {}) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  // Per-tab sort override. Null = use the feed's natural order (FMP
  // returns gainers DESC by %change, etc.). Click a column header to
  // override; switching tabs resets back to the feed's natural order.
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);

  const useDirectMovers = tab === "gainers" || tab === "losers" || tab === "active";
  const moversCategory = tab === "active" ? "actives" : tab === "gainers" ? "gainers" : "losers";

  // Direct-from-FMP feed for gainers/losers/active. Screener feed for the
  // other tabs — those derive from our DB.
  const { data: directMovers, isLoading: moversLoading } = useMarketMovers(moversCategory, maxRows);
  const { data: screener, isLoading: screenerLoading } = useMarketScreener(2000);

  const rows = useMemo<DisplayRow[]>(() => {
    const base = useDirectMovers
      ? (directMovers ?? []).map(moverToDisplay)
      : applyFilters(screener ?? [], { tab, sector: "all", capBand: "all" }).map(screenerToDisplay);
    return sort ? sortRows(base, sort.key, sort.dir) : base;
  }, [useDirectMovers, directMovers, screener, tab, sort]);

  const isLoading = useDirectMovers ? moversLoading : screenerLoading;

  function handleHeaderClick(key: SortKey) {
    setSort((prev) => {
      if (prev?.key !== key) {
        // First click on a column — numeric defaults to DESC (top values
        // first), text defaults to ASC (alphabetical).
        const isText = key === "ticker" || key === "sector";
        return { key, dir: isText ? "asc" : "desc" };
      }
      // Click again — toggle direction.
      return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
    });
  }

  function handleTabClick(t: TabKey) {
    setTab(t);
    setSort(null); // back to the feed's natural order
  }

  return (
    <section className="rounded-[12px] border border-ink-200 bg-ink-0 overflow-hidden">
      {/* Header + tabs */}
      <header className="px-4 md:px-6 pt-5 pb-3 border-b border-ink-100">
        <div className="flex items-baseline justify-between mb-4 gap-3">
          <h2 className="font-[var(--font-heading)] text-[18px] font-semibold text-ink-900">
            Market movers
          </h2>
          {showFullScreenerLink && (
            <Link href="/research/screener" className="font-[var(--font-sans)] text-[12px] font-medium text-forest hover:underline whitespace-nowrap">
              Full screener →
            </Link>
          )}
        </div>

        {/* Tabs — the only MoversGrid filter dimension. Sector + cap
            live on the Market Overview strip now (page-level filters). */}
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTabClick(t.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors border",
                tab === t.key
                  ? "bg-forest-light text-forest-dark border-forest"
                  : "bg-ink-0 text-ink-700 border-ink-200 hover:border-ink-400",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Table */}
      {isLoading && rows.length === 0 ? (
        <div className="py-12 text-center font-mono text-[13px] text-ink-500">
          Scanning the market…
        </div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center font-mono text-[13px] text-ink-500">
          No matches with these filters.
        </div>
      ) : (
        <>
          {/* Desktop column header — clickable to sort. Project rule:
              any table with multiple rows must support column sorting. */}
          <div
            className="hidden lg:grid items-center gap-3 px-6 py-2.5 bg-ink-50 border-b border-ink-100 font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500"
            style={{ gridTemplateColumns: "36px minmax(140px,1fr) minmax(80px,100px) minmax(80px,100px) minmax(90px,110px) minmax(110px,140px) 80px 120px" }}
          >
            <div />
            <SortHeader label="Symbol" sortKey="ticker" align="left" sort={sort} onClick={handleHeaderClick} />
            <SortHeader label="Price" sortKey="price" align="right" sort={sort} onClick={handleHeaderClick} />
            <SortHeader label="%Change" sortKey="changePct" align="right" sort={sort} onClick={handleHeaderClick} />
            <SortHeader label="Mkt Cap" sortKey="marketCap" align="right" sort={sort} onClick={handleHeaderClick} />
            <SortHeader label="Sector" sortKey="sector" align="left" sort={sort} onClick={handleHeaderClick} />
            <SortHeader label="Score" sortKey="signalScore" align="center" sort={sort} onClick={handleHeaderClick} />
            <div className="text-center">Actions</div>
          </div>

          {rows.slice(0, maxRows).map((r) => (
            <GridRow key={r.ticker} row={r} />
          ))}
        </>
      )}
    </section>
  );
}

// Unified shape the grid renders. Both feeds (screener + direct movers)
// adapt into this so GridRow doesn't have to know the source.
interface DisplayRow {
  ticker: string;
  name: string;
  sector: string | null;
  price: number | null;
  change: number | null;
  changePct: number | null;
  marketCap: number | null;
  signalScore: number | null;
}

function moverToDisplay(m: MoverRow): DisplayRow {
  return {
    ticker: m.ticker,
    name: m.name,
    sector: m.sector,
    price: m.price,
    change: m.change,
    changePct: m.changePct,
    marketCap: m.marketCap,
    signalScore: m.signalScore,
  };
}

function screenerToDisplay(r: ScreenerRow): DisplayRow {
  // FMP only returns absolute `change` on the direct movers endpoints;
  // for the screener we back-solve from price + pct so the dollar
  // change line stays consistent: change = price - price/(1+pct/100).
  const pct = r.changePct ?? 0;
  const change = r.price != null && pct !== 0
    ? r.price - (r.price / (1 + pct / 100))
    : null;
  return {
    ticker: r.ticker,
    name: r.name,
    sector: r.sector,
    price: r.price,
    change,
    changePct: r.changePct,
    marketCap: r.marketCap,
    signalScore: r.signalScore,
  };
}

function GridRow({ row }: { row: DisplayRow }) {
  const up = (row.changePct ?? 0) >= 0;
  const chgChange = row.change ?? 0;

  return (
    <div className="px-4 md:px-6 py-3 border-b border-ink-100 last:border-b-0 hover:bg-ink-50 transition-colors">
      {/* Mobile compact layout */}
      <div className="lg:hidden">
        <Link href={`/stock/${row.ticker}`} className="flex items-center gap-3">
          <StockLogo ticker={row.ticker} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-[var(--font-heading)] text-[14px] font-bold text-ink-900">{row.ticker}</span>
              <span className="font-mono text-[11px] text-ink-700">${formatPrice(row.price)}</span>
              <span className={cn("font-mono text-[11px]", up ? "text-up" : "text-down")}>
                {row.changePct != null ? `${up ? "+" : ""}${row.changePct.toFixed(2)}%` : ""}
              </span>
            </div>
            <div className="text-[11px] text-ink-500 truncate">
              {row.name} · {row.sector ?? "—"} · {formatCap(row.marketCap)}
            </div>
          </div>
          <ScoreGradeChip score={row.signalScore ?? null} size="sm" showDelta={false} />
        </Link>
      </div>

      {/* Desktop grid row */}
      <div
        className="hidden lg:grid items-center gap-3"
        style={{ gridTemplateColumns: "36px minmax(140px,1fr) minmax(80px,100px) minmax(80px,100px) minmax(90px,110px) minmax(110px,140px) 80px 120px" }}
      >
        <StockLogo ticker={row.ticker} size="md" />
        <Link href={`/stock/${row.ticker}`} className="min-w-0 hover:underline">
          <div className="font-[var(--font-heading)] text-[14px] font-bold text-ink-900 leading-tight">
            {row.ticker}
          </div>
          <div className="text-[11px] text-ink-500 truncate leading-tight mt-0.5">
            {row.name}
          </div>
        </Link>
        <div className="text-right">
          <div className="font-mono text-[13px] font-medium text-ink-900">${formatPrice(row.price)}</div>
          <div className={cn("font-mono text-[10px]", up ? "text-up" : "text-down")}>
            {chgChange !== 0 && row.price != null ? `${up ? "+" : ""}${chgChange.toFixed(2)}` : ""}
          </div>
        </div>
        <div className={cn("text-right font-mono text-[13px] font-medium", up ? "text-up" : "text-down")}>
          {row.changePct != null ? `${up ? "+" : ""}${row.changePct.toFixed(2)}%` : "—"}
        </div>
        <div className="text-right font-mono text-[12px] text-ink-700">
          {formatCap(row.marketCap)}
        </div>
        <div className="font-[var(--font-sans)] text-[12px] text-ink-600 truncate">
          {row.sector ?? "—"}
        </div>
        <div className="text-center">
          <ScoreGradeChip score={row.signalScore ?? null} size="sm" showNum={false} showDelta={false} />
        </div>
        <div className="flex gap-1.5 justify-center">
          <Link
            href={`/stock/${row.ticker}`}
            className="inline-flex items-center gap-1 bg-forest text-ink-0 text-[10px] font-semibold px-2 py-1 rounded hover:bg-forest-dark transition-colors"
          >
            <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} />
            Lens
          </Link>
          <button
            type="button"
            className="inline-flex items-center bg-ink-0 border border-ink-300 text-ink-700 px-2 py-1 rounded hover:border-ink-500 transition-colors"
            aria-label={`Add ${row.ticker} to watchlist`}
            onClick={(e) => {
              e.preventDefault();
              // TODO: wire to useAddWatchlistItem — deferred to the
              // Tier 2 watchlist refactor to avoid touching the shell here
            }}
          >
            <Plus className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

type SortKey = "ticker" | "price" | "changePct" | "marketCap" | "sector" | "signalScore";

function SortHeader({
  label,
  sortKey,
  align,
  sort,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  align: "left" | "right" | "center";
  sort: { key: SortKey; dir: "asc" | "desc" } | null;
  onClick: (key: SortKey) => void;
}) {
  const active = sort?.key === sortKey;
  const arrow = active ? (sort.dir === "asc" ? "▲" : "▼") : null;
  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className={cn(
        "inline-flex items-center gap-1 hover:text-ink-900 transition-colors cursor-pointer",
        align === "right" ? "justify-end ml-auto" : align === "center" ? "justify-center mx-auto" : "justify-start",
        active && "text-ink-900",
      )}
    >
      <span>{label}</span>
      {arrow && <span className="text-[8px] leading-none">{arrow}</span>}
    </button>
  );
}

function sortRows(rows: DisplayRow[], key: SortKey, dir: "asc" | "desc"): DisplayRow[] {
  // Nulls always sort to the bottom regardless of direction — a row
  // missing a score / sector / cap shouldn't pretend to be the smallest.
  const mult = dir === "asc" ? 1 : -1;
  const sorted = [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * mult;
    return String(av).localeCompare(String(bv)) * mult;
  });
  return sorted;
}

function applyFilters(
  rows: ScreenerRow[],
  { tab, sector, capBand }: { tab: TabKey; sector: string; capBand: string },
): ScreenerRow[] {
  let filtered = [...rows];

  if (sector !== "all") filtered = filtered.filter((r) => r.sector === sector);

  if (capBand !== "all") {
    filtered = filtered.filter((r) => {
      const c = r.marketCap ?? 0;
      if (capBand === "mega") return c >= 2e11;
      if (capBand === "large") return c >= 1e10 && c < 2e11;
      if (capBand === "mid") return c >= 2e9 && c < 1e10;
      if (capBand === "small") return c < 2e9;
      return true;
    });
  }

  switch (tab) {
    case "gainers":
      return filtered
        .filter((r) => r.changePct != null && r.price != null)
        .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));
    case "losers":
      return filtered
        .filter((r) => r.changePct != null && r.price != null)
        .sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0));
    case "high52":
      return filtered
        .filter((r) => r.week52RangePct != null && r.price != null)
        .sort((a, b) => (b.week52RangePct ?? 0) - (a.week52RangePct ?? 0));
    case "low52":
      return filtered
        .filter((r) => r.week52RangePct != null && r.price != null)
        .sort((a, b) => (a.week52RangePct ?? 1) - (b.week52RangePct ?? 1));
    case "unusual":
      return filtered
        .filter((r) => r.relVolume != null && r.relVolume > 1.2)
        .sort((a, b) => (b.relVolume ?? 0) - (a.relVolume ?? 0));
    case "active":
      return filtered
        .filter((r) => r.volume != null)
        .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
  }
}

function formatPrice(p: number | null): string {
  if (p == null) return "—";
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return p.toFixed(2);
}

function formatCap(c: number | null): string {
  if (c == null) return "—";
  if (c >= 1e12) return `$${(c / 1e12).toFixed(2)}T`;
  if (c >= 1e9) return `$${(c / 1e9).toFixed(1)}B`;
  if (c >= 1e6) return `$${(c / 1e6).toFixed(0)}M`;
  return `$${c.toFixed(0)}`;
}
