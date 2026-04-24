"use client";

import { useMemo, useState } from "react";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { useMarketIndices, useMarketScreener } from "@/lib/hooks";
import type { MarketIndex } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Unified Market Overview strip with asset-class tabs. Single block
 * on top of /markets:
 *
 *   Left:  Market pulse (breadth gauge + up/down/flat split) — fixed
 *   Right: Category-tabbed list (All · US · International · Commodities
 *          · Bonds · Crypto) showing the indices in the selected tab.
 *          Tab data comes from /market/indices (ETF proxies).
 *
 * "All" mode compresses every category into a dense 5-column grid so
 * the whole market state reads at a glance. Tapping a specific category
 * expands each ticker into a wider row showing ticker / label / price /
 * %change side-by-side — more detail per asset when drilling into one
 * asset class.
 *
 * Mobile: tabs become a horizontal scroll row; the tab panel stacks
 * under the pulse card.
 */

const TABS: { key: string; label: string }[] = [
  { key: "all",           label: "All" },
  { key: "US",            label: "US" },
  { key: "International", label: "International" },
  { key: "Commodities",   label: "Commodities" },
  { key: "Bonds",         label: "Bonds" },
  { key: "Crypto",        label: "Crypto" },
];

export function MarketOverviewStrip() {
  const { data: indices } = useMarketIndices();
  const { data: screener } = useMarketScreener(500);
  const [tab, setTab] = useState<string>("all");

  const pulse = useMemo(() => {
    const rows = screener ?? [];
    if (rows.length === 0) return null;
    const up = rows.filter((s) => (s.changePct ?? 0) > 0.1).length;
    const down = rows.filter((s) => (s.changePct ?? 0) < -0.1).length;
    const flat = rows.length - up - down;
    const score = Math.round((up / rows.length) * 100);
    let label = "Neutral";
    if (score >= 75) label = "Extreme Greed";
    else if (score >= 60) label = "Greed";
    else if (score >= 45) label = "Neutral";
    else if (score >= 25) label = "Fear";
    else label = "Extreme Fear";
    return { score, label, up, down, flat, total: rows.length };
  }, [screener]);

  const grouped = useMemo(() => {
    const g = new Map<string, MarketIndex[]>();
    (indices ?? []).forEach((idx) => {
      const cat = idx.category || "Other";
      const arr = g.get(cat) ?? [];
      arr.push(idx);
      g.set(cat, arr);
    });
    return g;
  }, [indices]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: indices?.length ?? 0 };
    grouped.forEach((rows, cat) => {
      counts[cat] = rows.length;
    });
    return counts;
  }, [grouped, indices]);

  return (
    <section className="rounded-[12px] border border-ink-200 bg-ink-0 overflow-hidden">
      <header className="flex items-center justify-between px-5 md:px-6 py-3 border-b border-ink-100 bg-ink-50 gap-3">
        <h2 className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600 flex-shrink-0">
          Market overview
        </h2>
        {/* Category tabs — filter dimension for the right panel */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -my-1">
          {TABS.map((t) => {
            const count = tabCounts[t.key] ?? 0;
            const active = tab === t.key;
            const disabled = count === 0 && t.key !== "all";
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => !disabled && setTab(t.key)}
                disabled={disabled}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors whitespace-nowrap flex-shrink-0",
                  active
                    ? "bg-ink-900 text-ink-0 border border-ink-900"
                    : disabled
                    ? "bg-ink-0 text-ink-300 border border-ink-100 cursor-not-allowed"
                    : "bg-ink-0 text-ink-700 border border-ink-200 hover:border-ink-400",
                )}
              >
                {t.label}
                {count > 0 && (
                  <span className={cn("ml-1.5 text-[10px] font-mono", active ? "text-ink-300" : "text-ink-500")}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(200px,240px)_1fr] divide-y md:divide-y-0 md:divide-x divide-ink-100">
        {/* ─── Pulse card (fixed) ─── */}
        <div className="px-5 py-4">
          <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-600 mb-2 flex items-center gap-1.5">
            <Activity className="h-3 w-3" strokeWidth={2} />
            Market pulse
          </div>
          {pulse ? (
            <>
              <div className="flex items-baseline gap-2.5">
                <span className={cn("font-[var(--font-heading)] text-[36px] font-bold leading-none tracking-[-0.02em]", pulseTone(pulse.score))}>
                  {pulse.score}
                </span>
                <span className={cn("font-[var(--font-sans)] text-[12px] font-bold uppercase tracking-[0.08em]", pulseTone(pulse.score))}>
                  {pulse.label}
                </span>
              </div>
              <p className="mt-1.5 font-mono text-[11px] text-ink-600 leading-tight">
                {pulse.up} up · {pulse.down} down · {pulse.flat} flat
              </p>
              <div className="mt-2.5 h-1.5 rounded-full bg-ink-100 overflow-hidden relative">
                <div className="absolute inset-0 flex">
                  <div style={{ flex: pulse.down }} className="bg-down" />
                  <div style={{ flex: pulse.flat }} className="bg-ink-300" />
                  <div style={{ flex: pulse.up }} className="bg-up" />
                </div>
              </div>
              <p className="mt-2 font-[var(--font-sans)] text-[10px] text-ink-500 leading-tight">
                Breadth across {pulse.total} tracked tickers
              </p>
            </>
          ) : (
            <div className="font-mono text-[12px] text-ink-500">Loading…</div>
          )}
        </div>

        {/* ─── Tab panel ─── */}
        <div className="px-5 py-4">
          {(indices?.length ?? 0) === 0 ? (
            <div className="font-mono text-[12px] text-ink-500 py-6 text-center">
              Loading indices…
            </div>
          ) : tab === "all" ? (
            <AllCategoriesGrid grouped={grouped} />
          ) : (
            <SingleCategoryList rows={grouped.get(tab) ?? []} />
          )}
        </div>
      </div>
    </section>
  );
}

function AllCategoriesGrid({ grouped }: { grouped: Map<string, MarketIndex[]> }) {
  const CATEGORIES: { key: string; label: string }[] = [
    { key: "US",            label: "US equities" },
    { key: "International", label: "International" },
    { key: "Commodities",   label: "Commodities" },
    { key: "Bonds",         label: "Bonds" },
    { key: "Crypto",        label: "Crypto" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-4">
      {CATEGORIES.map(({ key, label }) => {
        const rows = grouped.get(key) ?? [];
        if (rows.length === 0) return null;
        return (
          <div key={key}>
            <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-500 mb-2.5 pb-1.5 border-b border-ink-100">
              {label}
            </div>
            <ul className="space-y-2.5">
              {rows.map((idx) => <CompactIndexRow key={idx.ticker} idx={idx} />)}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function SingleCategoryList({ rows }: { rows: MarketIndex[] }) {
  if (rows.length === 0) {
    return (
      <div className="font-mono text-[12px] text-ink-500 py-6 text-center">
        No indices in this category yet.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
      {rows.map((idx) => <ExpandedIndexRow key={idx.ticker} idx={idx} />)}
    </div>
  );
}

function CompactIndexRow({ idx }: { idx: MarketIndex }) {
  const positive = (idx.changePct ?? 0) >= 0;
  const [symbol, ...rest] = (idx.label ?? idx.ticker).split("·").map((s) => s.trim());
  const name = rest.join(" · ");

  return (
    <li className="flex items-baseline justify-between gap-2 leading-none">
      <div className="min-w-0">
        <div className="font-[var(--font-heading)] text-[12px] font-bold text-ink-900 leading-tight truncate">
          {symbol || idx.ticker}
        </div>
        <div className="font-[var(--font-sans)] text-[10px] text-ink-500 truncate mt-0.5 leading-tight">
          {name || "—"}
        </div>
        <div className="font-mono text-[12px] font-medium text-ink-900 mt-1 leading-tight">
          {fmtPrice(idx.price)}
        </div>
      </div>
      <div
        className={cn(
          "font-mono text-[10px] font-semibold whitespace-nowrap inline-flex items-center gap-0.5",
          positive ? "text-up" : "text-down",
        )}
      >
        {positive ? <TrendingUp className="h-2.5 w-2.5" strokeWidth={2.2} /> : <TrendingDown className="h-2.5 w-2.5" strokeWidth={2.2} />}
        {idx.changePct == null ? "—" : `${positive ? "+" : ""}${idx.changePct.toFixed(2)}%`}
      </div>
    </li>
  );
}

function ExpandedIndexRow({ idx }: { idx: MarketIndex }) {
  const positive = (idx.changePct ?? 0) >= 0;
  const [symbol, ...rest] = (idx.label ?? idx.ticker).split("·").map((s) => s.trim());
  const name = rest.join(" · ");

  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink-100 pb-2.5">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-[var(--font-heading)] text-[13px] font-bold text-ink-900 leading-tight">
            {symbol || idx.ticker}
          </span>
          <span className="font-[var(--font-sans)] text-[11px] text-ink-500 truncate">
            {name}
          </span>
        </div>
        <div className="font-mono text-[15px] font-medium text-ink-900 mt-1 leading-tight">
          {fmtPrice(idx.price)}
        </div>
      </div>
      <div
        className={cn(
          "font-mono text-[12px] font-semibold whitespace-nowrap inline-flex items-center gap-0.5 flex-shrink-0",
          positive ? "text-up" : "text-down",
        )}
      >
        {positive ? <TrendingUp className="h-3 w-3" strokeWidth={2.2} /> : <TrendingDown className="h-3 w-3" strokeWidth={2.2} />}
        {idx.changePct == null ? "—" : `${positive ? "+" : ""}${idx.changePct.toFixed(2)}%`}
      </div>
    </div>
  );
}

function fmtPrice(p: number | null | undefined): string {
  if (p == null) return "—";
  return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pulseTone(score: number): string {
  if (score >= 60) return "text-up";
  if (score >= 40) return "text-ink-900";
  if (score >= 25) return "text-warn";
  return "text-down";
}
