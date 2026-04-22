"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMarketScreener } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * Top movers — single-card consolidated replacement for the 6-card
 * gainer/loser/active/highs/lows/volume grid in spec §05. Same raw data
 * but trimmed to the three columns that add incremental value on top of
 * the regime strip + indices + today's research set:
 *
 *   Gainers       — today's best relative moves (directional)
 *   Losers        — today's worst (directional)
 *   Unusual vol   — volume vs. 30d average, sector-agnostic
 *
 * Dropped vs. spec:
 *   Most active   — redundant with Unusual volume; traders use volume
 *                   ratio, not absolute count.
 *   52w highs/lows — commodity info available on every ticker page
 *                   already; doesn't merit its own Markets card.
 *
 * Full 6-card detail lives at /markets/screeners for users who want it.
 */
export function TopMovers() {
  const { data: screener } = useMarketScreener(500);

  const { gainers, losers, unusualVolume } = useMemo(() => {
    const rows = screener ?? [];
    const gainers = [...rows]
      .filter((r) => r.changePct != null && r.price != null)
      .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))
      .slice(0, 5);
    const losers = [...rows]
      .filter((r) => r.changePct != null && r.price != null)
      .sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0))
      .slice(0, 5);
    const unusualVolume = [...rows]
      .filter((r) => r.relVolume != null && r.relVolume > 1.5)
      .sort((a, b) => (b.relVolume ?? 0) - (a.relVolume ?? 0))
      .slice(0, 5);
    return { gainers, losers, unusualVolume };
  }, [screener]);

  if (!screener || screener.length === 0) return null;

  return (
    <section className="rounded-[10px] border border-ink-200 bg-ink-0 overflow-hidden">
      <header className="px-6 py-3.5 border-b border-ink-200 flex items-center justify-between">
        <h3 className="font-[var(--font-heading)] text-[14px] font-semibold text-ink-900">
          Top movers today
        </h3>
        <Link href="/markets/screeners" className="text-[12px] text-forest hover:underline font-medium">
          See all screeners →
        </Link>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-ink-100">
        <Column title="Gainers" rows={gainers} valueKind="changePct" />
        <Column title="Losers" rows={losers} valueKind="changePct" />
        <Column title="Unusual volume" rows={unusualVolume} valueKind="relVolume" />
      </div>
    </section>
  );
}

type Row = {
  ticker: string;
  name: string;
  price: number | null;
  changePct: number | null;
  relVolume: number | null;
};

function Column({
  title,
  rows,
  valueKind,
}: {
  title: string;
  rows: Row[];
  valueKind: "changePct" | "relVolume";
}) {
  return (
    <div>
      <div className="px-5 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">
        {title}
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-6 text-[12px] text-ink-400 italic">No matches today.</div>
      ) : (
        <ul className="divide-y divide-ink-100">
          {rows.map((r) => {
            const primary =
              valueKind === "changePct"
                ? formatPct(r.changePct)
                : r.relVolume != null
                ? `${r.relVolume.toFixed(1)}×`
                : "—";
            const primaryTone =
              valueKind === "changePct"
                ? (r.changePct ?? 0) >= 0
                  ? "text-up"
                  : "text-down"
                : "text-forest";
            return (
              <li key={r.ticker}>
                <Link
                  href={`/stock/${r.ticker}`}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-ink-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-[var(--font-mono)] text-[13px] font-semibold text-ink-900">
                      {r.ticker}
                    </div>
                    <div className="text-[10px] text-ink-500 truncate">
                      {r.price != null ? `$${r.price.toFixed(2)}` : "—"}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "font-[var(--font-mono)] text-[12px] font-semibold shrink-0",
                      primaryTone,
                    )}
                  >
                    {primary}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatPct(p: number | null): string {
  if (p == null) return "—";
  const sign = p >= 0 ? "+" : "";
  return `${sign}${p.toFixed(2)}%`;
}
