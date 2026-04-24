"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { useMarketScreener } from "@/lib/hooks";
import type { ScreenerRow } from "@/lib/api";
import { cn } from "@/lib/utils";
import { StockLogo } from "@/components/ui/stock-logo";
import { ScoreGradeChip } from "@/components/ui/score-grade-chip";

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

type TabKey = "gainers" | "losers" | "high52" | "low52" | "unusual";

const TABS: { key: TabKey; label: string }[] = [
  { key: "gainers", label: "Top Gainers" },
  { key: "losers", label: "Top Losers" },
  { key: "high52", label: "52wk High" },
  { key: "low52", label: "52wk Low" },
  { key: "unusual", label: "Unusual Vol" },
];

export function MoversGrid() {
  const { data: screener, isLoading } = useMarketScreener(500);
  const [tab, setTab] = useState<TabKey>("gainers");
  const [sector, setSector] = useState<string>("all");
  const [capBand, setCapBand] = useState<string>("all");

  const rows = useMemo(() => applyFilters(screener ?? [], { tab, sector, capBand }), [screener, tab, sector, capBand]);

  const sectors = useMemo(() => {
    const set = new Set<string>();
    (screener ?? []).forEach((r) => r.sector && set.add(r.sector));
    return ["all", ...Array.from(set).sort()];
  }, [screener]);

  return (
    <section className="rounded-[12px] border border-ink-200 bg-ink-0 overflow-hidden">
      {/* Header + tabs */}
      <header className="px-4 md:px-6 pt-5 pb-3 border-b border-ink-100">
        <div className="flex items-baseline justify-between mb-4 gap-3">
          <h2 className="font-[var(--font-heading)] text-[18px] font-semibold text-ink-900">
            Market movers
          </h2>
          <Link href="/research/screener" className="font-[var(--font-sans)] text-[12px] font-medium text-forest hover:underline whitespace-nowrap">
            Full screener →
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors",
                tab === t.key
                  ? "bg-ink-900 text-ink-0 border border-ink-900"
                  : "bg-ink-0 text-ink-700 border border-ink-200 hover:border-ink-400",
              )}
            >
              {t.label}
            </button>
          ))}
          <div className="w-px h-5 bg-ink-200 mx-1 hidden sm:block" />
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="font-[var(--font-sans)] text-[12px] px-3 py-1.5 rounded-md border border-ink-200 bg-ink-0 text-ink-700 hover:border-ink-400 transition-colors cursor-pointer"
          >
            {sectors.map((s) => (
              <option key={s} value={s}>{s === "all" ? "All sectors" : s}</option>
            ))}
          </select>
          <select
            value={capBand}
            onChange={(e) => setCapBand(e.target.value)}
            className="font-[var(--font-sans)] text-[12px] px-3 py-1.5 rounded-md border border-ink-200 bg-ink-0 text-ink-700 hover:border-ink-400 transition-colors cursor-pointer"
          >
            <option value="all">Any size</option>
            <option value="mega">Mega ($200B+)</option>
            <option value="large">Large ($10–200B)</option>
            <option value="mid">Mid ($2–10B)</option>
            <option value="small">Small (&lt;$2B)</option>
          </select>
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
          {/* Desktop column header */}
          <div
            className="hidden lg:grid items-center gap-3 px-6 py-2.5 bg-ink-50 border-b border-ink-100 font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500"
            style={{ gridTemplateColumns: "36px minmax(140px,1fr) minmax(80px,100px) minmax(80px,100px) minmax(90px,110px) minmax(110px,140px) 80px 120px" }}
          >
            <div />
            <div>Symbol</div>
            <div className="text-right">Price</div>
            <div className="text-right">%Change</div>
            <div className="text-right">Mkt Cap</div>
            <div>Sector</div>
            <div className="text-center">Score</div>
            <div className="text-center">Actions</div>
          </div>

          {rows.slice(0, 12).map((r) => (
            <GridRow key={r.ticker} row={r} />
          ))}
        </>
      )}
    </section>
  );
}

function GridRow({ row }: { row: ScreenerRow }) {
  const up = (row.changePct ?? 0) >= 0;
  const chgChange = (row.price ?? 0) * ((row.changePct ?? 0) / 100);

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
