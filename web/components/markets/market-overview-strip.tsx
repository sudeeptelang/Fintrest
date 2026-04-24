"use client";

import { useMemo } from "react";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { useMarketIndices, useMarketScreener } from "@/lib/hooks";
import type { MarketIndex } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Unified Market Overview strip. Single block on top of /markets with:
 *
 *   Left:  Market pulse (breadth gauge + up/down/flat split)
 *   Right: Dense 5-category grid — US equities · International ·
 *          Commodities · Bonds · Crypto — pulled from /market/indices
 *          (ETF proxies: SPY/QQQ/EFA/GLD/IBIT and friends).
 *
 * Every asset class the backend currently carries surfaces here — no
 * placeholder slots, no chart. The dataset has ~20 proxies; we show
 * them all at once so the block is genuinely a "market overview" and
 * not just a US-indices recap.
 *
 * Mobile: category columns stack vertically beneath the pulse card.
 */

const CATEGORIES: { key: string; label: string }[] = [
  { key: "US", label: "US equities" },
  { key: "International", label: "International" },
  { key: "Commodities", label: "Commodities" },
  { key: "Bonds", label: "Bonds" },
  { key: "Crypto", label: "Crypto" },
];

export function MarketOverviewStrip() {
  const { data: indices } = useMarketIndices();
  const { data: screener } = useMarketScreener(500);

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

  return (
    <section className="rounded-[12px] border border-ink-200 bg-ink-0 overflow-hidden">
      <header className="flex items-baseline justify-between px-5 md:px-6 py-3.5 border-b border-ink-100 bg-ink-50">
        <h2 className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600">
          Market overview
        </h2>
        <span className="font-mono text-[11px] text-ink-500 hidden md:inline">
          Breadth · US · International · Commodities · Bonds · Crypto
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(200px,240px)_1fr] divide-y md:divide-y-0 md:divide-x divide-ink-100">
        {/* ─── Pulse card ─── */}
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

        {/* ─── Category grid ─── */}
        <div className="px-5 py-4">
          {(indices?.length ?? 0) === 0 ? (
            <div className="font-mono text-[12px] text-ink-500 py-6 text-center">
              Loading indices…
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-4">
              {CATEGORIES.map(({ key, label }) => {
                const rows = grouped.get(key) ?? [];
                if (rows.length === 0) return null;
                return <CategoryColumn key={key} label={label} rows={rows} />;
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CategoryColumn({ label, rows }: { label: string; rows: MarketIndex[] }) {
  return (
    <div>
      <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-500 mb-2.5 pb-1.5 border-b border-ink-100">
        {label}
      </div>
      <ul className="space-y-2.5">
        {rows.map((idx) => (
          <IndexRow key={idx.ticker} idx={idx} />
        ))}
      </ul>
    </div>
  );
}

function IndexRow({ idx }: { idx: MarketIndex }) {
  const positive = (idx.changePct ?? 0) >= 0;

  // Label comes like "SPY · S&P 500" — split for compact display.
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
          {idx.price != null
            ? idx.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : "—"}
        </div>
      </div>
      <div
        className={cn(
          "font-mono text-[10px] font-semibold whitespace-nowrap inline-flex items-center gap-0.5",
          positive ? "text-up" : "text-down",
        )}
      >
        {positive ? (
          <TrendingUp className="h-2.5 w-2.5" strokeWidth={2.2} />
        ) : (
          <TrendingDown className="h-2.5 w-2.5" strokeWidth={2.2} />
        )}
        {idx.changePct == null ? "—" : `${positive ? "+" : ""}${idx.changePct.toFixed(2)}%`}
      </div>
    </li>
  );
}

function pulseTone(score: number): string {
  if (score >= 60) return "text-up";
  if (score >= 40) return "text-ink-900";
  if (score >= 25) return "text-warn";
  return "text-down";
}
