"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { useMarketIndices, useMarketScreener } from "@/lib/hooks";
import type { MarketIndex } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Unified Market Overview strip — replaces the old MarketPulse +
 * GlobalIndicesGrid two-card layout with a single three-panel strip
 * showing (1) overall breadth / pulse, (2) key US indices, and
 * (3) Treasury yields. Sits above MoversGrid as the first visual
 * block on /markets.
 *
 * Treasury yields are gated behind a "pending feed" placeholder until
 * the FMP /treasury endpoint is wired (FMP_ROADMAP Week 2). No fake
 * data — empty slots with an honest "coming" tag.
 *
 * Mobile (<md): panels stack vertically. Desktop (md+): three columns
 * with dividers between them.
 */

// Preferred US-equity index tickers in display order. Anything else
// returned by /market/indices gets filtered out of this strip — the
// full global indices picker lives on a dedicated page if needed.
const US_INDEX_TICKERS = ["SPY", "QQQ", "DIA", "IWM", "VIX"];

// Treasury yield placeholders — displayed as "— pending" until the
// real feed lands. Structure is ready for a drop-in swap.
const TREASURY_SLOTS = [
  { label: "2-year", ticker: "US2Y" },
  { label: "10-year", ticker: "US10Y" },
  { label: "30-year", ticker: "US30Y" },
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

  const usIndices = useMemo(() => {
    const all = indices ?? [];
    const byTicker = new Map(all.map((i) => [i.ticker.toUpperCase(), i]));
    return US_INDEX_TICKERS
      .map((t) => byTicker.get(t))
      .filter((i): i is MarketIndex => !!i);
  }, [indices]);

  return (
    <section className="rounded-[12px] border border-ink-200 bg-ink-0 overflow-hidden">
      <header className="flex items-baseline justify-between px-5 md:px-6 py-3.5 border-b border-ink-100 bg-ink-50">
        <h2 className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600">
          Market overview
        </h2>
        <span className="font-mono text-[11px] text-ink-500">
          Breadth · indices · rates
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(200px,260px)_1fr_minmax(180px,240px)] divide-y md:divide-y-0 md:divide-x divide-ink-100">
        {/* ─── Pulse ─── */}
        <div className="px-5 py-4">
          <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-600 mb-3 flex items-center gap-1.5">
            <Activity className="h-3 w-3" strokeWidth={2} />
            Market pulse
          </div>
          {pulse ? (
            <>
              <div className="flex items-baseline gap-3">
                <span className={cn("font-[var(--font-heading)] text-[34px] font-bold leading-none tracking-[-0.02em]", pulseTone(pulse.score))}>
                  {pulse.score}
                </span>
                <span className={cn("font-[var(--font-sans)] text-[13px] font-semibold uppercase tracking-[0.08em]", pulseTone(pulse.score))}>
                  {pulse.label}
                </span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-ink-600">
                Breadth · {pulse.up} up / {pulse.down} down / {pulse.flat} flat
              </p>
              <div className="mt-3 h-1.5 rounded-full bg-ink-100 overflow-hidden relative">
                <div className="absolute inset-0 flex">
                  <div style={{ flex: pulse.down }} className="bg-down" />
                  <div style={{ flex: pulse.flat }} className="bg-ink-300" />
                  <div style={{ flex: pulse.up }} className="bg-up" />
                </div>
              </div>
            </>
          ) : (
            <div className="font-mono text-[12px] text-ink-500">Loading…</div>
          )}
        </div>

        {/* ─── US indices ─── */}
        <div className="px-5 py-4">
          <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-600 mb-3">
            US indices
          </div>
          {usIndices.length === 0 ? (
            <div className="font-mono text-[12px] text-ink-500">Loading indices…</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-3">
              {usIndices.map((idx) => (
                <IndexCell key={idx.ticker} idx={idx} />
              ))}
            </div>
          )}
        </div>

        {/* ─── Treasury yields ─── */}
        <div className="px-5 py-4">
          <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-600 mb-3 flex items-baseline justify-between">
            <span>US Treasuries</span>
            <span className="font-mono text-[9px] tracking-normal text-ink-400 normal-case">live feed soon</span>
          </div>
          <div className="space-y-2">
            {TREASURY_SLOTS.map((slot) => (
              <div key={slot.ticker} className="flex items-baseline justify-between border-b border-ink-100 pb-2 last:border-b-0">
                <span className="font-[var(--font-sans)] text-[12px] text-ink-700 font-medium">
                  {slot.label}
                </span>
                <span className="font-mono text-[13px] text-ink-400">
                  —
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 font-[var(--font-sans)] text-[10px] text-ink-500 italic leading-tight">
            FMP /treasury endpoint ships in the Week 2 roadmap — 2y / 10y / 30y yields and yield-curve signal populate here.
          </p>
        </div>
      </div>
    </section>
  );
}

function IndexCell({ idx }: { idx: MarketIndex }) {
  const positive = (idx.changePct ?? 0) >= 0;
  return (
    <div>
      <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500 leading-none">
        {idx.ticker}
      </div>
      <div className="font-mono text-[15px] font-medium text-ink-900 leading-tight mt-1">
        {idx.price != null
          ? idx.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : "—"}
      </div>
      <div
        className={cn(
          "font-mono text-[11px] font-medium mt-0.5 inline-flex items-center gap-0.5",
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
    </div>
  );
}

function pulseTone(score: number): string {
  if (score >= 60) return "text-up";
  if (score >= 40) return "text-ink-900";
  if (score >= 25) return "text-warn";
  return "text-down";
}
