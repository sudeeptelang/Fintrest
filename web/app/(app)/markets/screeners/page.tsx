"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useMarketScreener } from "@/lib/hooks";
import type { ScreenerRow } from "@/lib/api";
import { cn } from "@/lib/utils";
import { StockLogo } from "@/components/ui/stock-logo";
import { ScoreGradeChip } from "@/components/ui/score-grade-chip";
import { PriceFreshness } from "@/components/ui/price-freshness";

// Phase 2 multi-lens scoring: each ticker has three composite scores —
// Setup (current swing-trade formula, gates published signals),
// Composite (balanced, "good investment overall"), and Quality
// (fundamentals-led, "would I hold long-term"). The lens picker swaps
// which score drives ranking + display; all three are still on every
// row so users can see the differential.
type Lens = "setup" | "composite" | "quality";

function lensScore(row: ScreenerRow, lens: Lens): number | null {
  if (lens === "composite") return row.compositeScore;
  if (lens === "quality") return row.qualityScore;
  return row.signalScore;
}

const LENS_LABEL: Record<Lens, { label: string; sub: string }> = {
  setup:     { label: "Setup",     sub: "swing-trade formula" },
  composite: { label: "Composite", sub: "balanced overall" },
  quality:   { label: "Quality",   sub: "fundamentals-led" },
};

/**
 * Curated screener presets — the v3 replacement for the old 6-card
 * price-action grid (which is now the MoversGrid on /markets). These
 * presets use the FMP fundamentals + our composite score in ways
 * MoversGrid doesn't — quality / value / growth / dividend / oversold /
 * breakout lenses, not just today's gainers.
 *
 * Each card shows the top 5 matches with a family-tinted accent and
 * a Lens-style "read" one-liner. "View all" deep-links into the Research
 * screener with the preset applied (pending Research-merge ships).
 */

type Family = "technical" | "fundamentals" | "sentiment" | "smart";

const FAMILY_STYLE: Record<Family, { accent: string; bg: string; pill: string; pillText: string; dot: string }> = {
  technical:    { accent: "border-l-navy",  bg: "bg-navy/5",   pill: "bg-navy/10",  pillText: "text-navy",  dot: "bg-navy" },
  fundamentals: { accent: "border-l-amber", bg: "bg-amber/5",  pill: "bg-amber/10", pillText: "text-amber", dot: "bg-amber" },
  sentiment:    { accent: "border-l-plum",  bg: "bg-plum/5",   pill: "bg-plum/10",  pillText: "text-plum",  dot: "bg-plum" },
  smart:        { accent: "border-l-teal",  bg: "bg-teal/5",   pill: "bg-teal/10",  pillText: "text-teal",  dot: "bg-teal" },
};

type Preset = {
  slug: string;
  name: string;
  description: string;
  family: Family;
  read: string;
  filter: (rows: ScreenerRow[], lens: Lens) => ScreenerRow[];
};

const buildPresets = (): Preset[] => [
  {
    slug: "high-conviction",
    name: "High Conviction",
    description: "Top of selected lens · healthy trend",
    family: "smart",
    read: "Top tier on the active lens — Setup picks swing setups, Composite picks balanced winners, Quality picks long-term holds.",
    filter: (rows, lens) => rows
      .filter((r) => (lensScore(r, lens) ?? 0) >= 75 && (r.changePct ?? 0) >= -2)
      .sort((a, b) => (lensScore(b, lens) ?? 0) - (lensScore(a, lens) ?? 0)),
  },
  {
    slug: "quality-growth",
    name: "Quality Growth",
    description: "Revenue growth ≥ 20% · ROE ≥ 15%",
    family: "fundamentals",
    read: "Secular compounders — top-line scaling plus capital efficiency.",
    filter: (rows) => rows
      .filter((r) => (r.revenueGrowth ?? 0) >= 0.2 && (r.returnOnEquity ?? 0) >= 0.15)
      .sort((a, b) => (b.revenueGrowth ?? 0) - (a.revenueGrowth ?? 0)),
  },
  {
    slug: "value-setups",
    name: "Value Setups",
    description: "Forward P/E < 15 · PEG < 1.2",
    family: "fundamentals",
    read: "Multiple compression plays — priced for no growth that isn't coming.",
    filter: (rows) => rows
      .filter((r) => (r.forwardPe ?? 999) < 15 && (r.forwardPe ?? 0) > 0 && (r.pegRatio ?? 999) < 1.2 && (r.pegRatio ?? 0) > 0)
      .sort((a, b) => (a.forwardPe ?? 999) - (b.forwardPe ?? 999)),
  },
  {
    slug: "oversold-reversal",
    name: "Oversold Reversal",
    description: "RSI < 30 · Lens score ≥ 60",
    family: "technical",
    read: "Capitulation + a composite that hasn't broken — the bounce setups we look for.",
    filter: (rows, lens) => rows
      .filter((r) => (r.rsi ?? 100) < 30 && (lensScore(r, lens) ?? 0) >= 60)
      .sort((a, b) => (a.rsi ?? 100) - (b.rsi ?? 100)),
  },
  {
    slug: "dividend-aristocrats",
    name: "Income",
    description: "Yield ≥ 3% · Fwd P/E < 20",
    family: "fundamentals",
    read: "Income streams at a reasonable multiple — defensive ballast in a wobble.",
    filter: (rows) => rows
      .filter((r) => (r.dividendYield ?? 0) >= 0.03 && (r.forwardPe ?? 999) < 20 && (r.forwardPe ?? 0) > 0)
      .sort((a, b) => (b.dividendYield ?? 0) - (a.dividendYield ?? 0)),
  },
  {
    slug: "breakout-candidates",
    name: "Breakout Candidates",
    description: "Within 5% of 52w high · Rel Vol ≥ 1.3",
    family: "technical",
    read: "Price pressing the ceiling with volume confirming — classic continuation.",
    // week52RangePct is 0-100 across the codebase (athena-board, movers-table,
    // screener-table all use the 0-100 form). 95 = within 5% of the 52-week high.
    filter: (rows) => rows
      .filter((r) => (r.week52RangePct ?? 0) >= 95 && (r.relVolume ?? 0) >= 1.3)
      .sort((a, b) => (b.week52RangePct ?? 0) - (a.week52RangePct ?? 0)),
  },
];

export default function MarketsScreenersPage() {
  const { data: screener } = useMarketScreener(500);
  const rows = screener ?? [];
  const [lens, setLens] = useState<Lens>("composite");

  const computed = useMemo(
    () => buildPresets().map((p) => ({ preset: p, matches: p.filter(rows, lens) })),
    [rows, lens],
  );

  return (
    <div className="max-w-[1120px] mx-auto">
      <Breadcrumb items={[{ label: "Markets", href: "/markets" }, { label: "Screeners" }]} />

      <header className="mb-6">
        <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-forest-dark mb-2">
          Research · Curated screens
        </div>
        <h1 className="font-[var(--font-heading)] text-[26px] leading-[34px] font-semibold text-ink-900">
          Six lenses on the market
        </h1>
        <p className="mt-2 text-[13px] text-ink-600 max-w-[640px] leading-[20px]">
          Each preset applies a different factor-family lens to the 500-ticker research
          universe. Price-action screens live on <Link href="/markets" className="text-forest hover:underline">Markets</Link> —
          these are the fundamentals-first and setup-driven ones.
        </p>
        <PriceFreshness className="mt-3" />
      </header>

      {/* Phase 2 multi-lens scoring picker — swaps which composite drives
          ranking + the score chip on each preset row. Setup is the swing-
          trade formula; Composite is balanced; Quality is fundamentals-led. */}
      <div className="mb-5 inline-flex rounded-[8px] border border-ink-200 bg-ink-0 p-0.5">
        {(["setup", "composite", "quality"] as Lens[]).map((l) => {
          const active = l === lens;
          return (
            <button
              key={l}
              type="button"
              onClick={() => setLens(l)}
              className={cn(
                "px-3.5 py-1.5 text-[12px] font-semibold rounded-[6px] transition-colors",
                active
                  ? "bg-forest text-ink-0"
                  : "text-ink-600 hover:text-ink-900 hover:bg-ink-50",
              )}
            >
              <span>{LENS_LABEL[l].label}</span>
              <span className={cn("ml-2 text-[10px] font-normal", active ? "opacity-80" : "opacity-60")}>
                {LENS_LABEL[l].sub}
              </span>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[10px] border border-ink-200 bg-ink-0 px-6 py-10 text-center text-[13px] text-ink-500">
          No screener data yet. Check back after the next market-data ingest.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {computed.map(({ preset, matches }) => (
            <PresetCard key={preset.slug} preset={preset} matches={matches} lens={lens} />
          ))}
        </div>
      )}
    </div>
  );
}

function PresetCard({ preset, matches, lens }: { preset: Preset; matches: ScreenerRow[]; lens: Lens }) {
  const fs = FAMILY_STYLE[preset.family];
  const topMatches = matches.slice(0, 5);

  return (
    <section
      className={cn(
        "rounded-[12px] border border-ink-200 bg-ink-0 overflow-hidden border-l-[3px]",
        fs.accent,
      )}
    >
      <header className={cn("px-5 py-4", fs.bg)}>
        <div className="flex items-center justify-between mb-1">
          <div className={cn("inline-flex items-center gap-2 rounded-full px-2 py-0.5", fs.pill)}>
            <span className={cn("inline-block w-1.5 h-1.5 rounded-full", fs.dot)} />
            <span className={cn("font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.08em]", fs.pillText)}>
              {preset.family === "technical" ? "Technical" : preset.family === "fundamentals" ? "Fundamentals" : preset.family === "sentiment" ? "Sentiment" : "Smart Money"}
            </span>
          </div>
          <span className="font-mono text-[11px] text-ink-600">
            {matches.length} {matches.length === 1 ? "match" : "matches"}
          </span>
        </div>
        <h2 className="font-[var(--font-heading)] text-[17px] font-semibold text-ink-900 leading-tight">
          {preset.name}
        </h2>
        <p className="mt-0.5 font-mono text-[11px] text-ink-600">{preset.description}</p>
        <p className="mt-2 font-[var(--font-sans)] text-[12px] text-ink-700 leading-[18px]">
          {preset.read}
        </p>
      </header>

      {topMatches.length === 0 ? (
        <div className="px-5 py-6 text-[12px] text-ink-400 italic">
          No tickers match these filters today.
        </div>
      ) : (
        <ul className="divide-y divide-ink-100">
          {topMatches.map((r) => (
            <li key={r.ticker}>
              <Link
                href={`/stock/${r.ticker}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-ink-50 transition-colors"
              >
                <StockLogo ticker={r.ticker} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="font-[var(--font-heading)] text-[13px] font-bold text-ink-900 leading-tight">
                    {r.ticker}
                  </div>
                  <div className="text-[10px] text-ink-500 truncate leading-tight mt-0.5">
                    {r.name}
                  </div>
                </div>
                <ScoreGradeChip score={lensScore(r, lens)} size="sm" showNum={false} showDelta={false} />
                <PresetMetric row={r} family={preset.family} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {matches.length > topMatches.length && (
        <footer className="px-5 py-3 bg-ink-50 border-t border-ink-100">
          <Link
            href={`/research/screener?preset=${preset.slug}`}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-forest hover:text-forest-dark"
          >
            View all {matches.length} matches <ArrowUpRight className="h-3 w-3" strokeWidth={2.2} />
          </Link>
        </footer>
      )}
    </section>
  );
}

function PresetMetric({ row, family }: { row: ScreenerRow; family: Family }) {
  // Family-specific signature metric shown on the right of each row.
  let label = "";
  let value = "";

  if (family === "fundamentals") {
    if (row.dividendYield != null && row.dividendYield > 0.01) {
      label = "Yld";
      value = `${(row.dividendYield * 100).toFixed(1)}%`;
    } else if (row.forwardPe != null && row.forwardPe > 0) {
      label = "P/E";
      value = row.forwardPe.toFixed(1);
    } else if (row.revenueGrowth != null) {
      label = "Rev";
      value = `+${(row.revenueGrowth * 100).toFixed(0)}%`;
    }
  } else if (family === "technical") {
    if (row.rsi != null) {
      label = "RSI";
      value = row.rsi.toFixed(0);
    } else if (row.week52RangePct != null) {
      label = "52w";
      value = `${row.week52RangePct.toFixed(0)}%`;
    }
  }

  if (!value) {
    // Fallback: show %change
    if (row.changePct != null) {
      return (
        <span className={cn("font-mono text-[11px] font-medium", row.changePct >= 0 ? "text-up" : "text-down")}>
          {row.changePct >= 0 ? "+" : ""}{row.changePct.toFixed(1)}%
        </span>
      );
    }
    return null;
  }

  return (
    <div className="text-right leading-tight">
      <div className="font-mono text-[11px] font-medium text-ink-900">{value}</div>
      <div className="font-mono text-[9px] text-ink-500 uppercase tracking-wide">{label}</div>
    </div>
  );
}
