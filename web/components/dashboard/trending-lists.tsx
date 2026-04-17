"use client";

import { Info } from "lucide-react";

/**
 * Popular Screeners — Finviz-style pill grid. Clicking a pill sets an active
 * screener key in parent state; the MoversTable below filters/repopulates based on it.
 * Emoji badges keep it lightweight without bespoke icons.
 */
export type ScreenerKey =
  | "gainers"
  | "losers"
  | "ai-selected"
  | "penny"
  | "unusual-volume"
  | "oversold"
  | "premarket-gainers"
  | "afterhours-gainers"
  | "new-highs"
  | "new-lows"
  | "sectors"
  | "hot-sentiment";

type Screener = {
  key: ScreenerKey;
  emoji: string;
  bg: string;
  label: string;
};

export const SCREENERS: Screener[] = [
  { key: "gainers",             emoji: "🚀", bg: "bg-emerald-100", label: "Biggest Gainers" },
  { key: "losers",              emoji: "📉", bg: "bg-red-100",     label: "Biggest Losers" },
  { key: "ai-selected",         emoji: "🧠", bg: "bg-indigo-100",  label: "AI Selected" },
  { key: "penny",               emoji: "🪙", bg: "bg-amber-100",   label: "Penny Stocks" },
  { key: "unusual-volume",      emoji: "⚡",  bg: "bg-yellow-100",  label: "Unusual Volume" },
  { key: "oversold",            emoji: "🥶", bg: "bg-sky-100",     label: "Oversold" },
  { key: "premarket-gainers",   emoji: "🌅", bg: "bg-orange-100",  label: "Pre-Market Gainers" },
  { key: "afterhours-gainers",  emoji: "🌙", bg: "bg-violet-100",  label: "After-Hours Gainers" },
  { key: "new-highs",           emoji: "📈", bg: "bg-green-100",   label: "New Highs (52W)" },
  { key: "new-lows",            emoji: "📊", bg: "bg-rose-100",    label: "New Lows (52W)" },
  { key: "sectors",             emoji: "🏭", bg: "bg-teal-100",    label: "Sectors" },
  { key: "hot-sentiment",       emoji: "🔥", bg: "bg-fuchsia-100", label: "Hot Sentiment" },
];

export function TrendingLists({
  activeKey,
  onSelect,
}: {
  activeKey: ScreenerKey | null;
  onSelect: (key: ScreenerKey | null) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-[var(--font-heading)] text-lg font-semibold flex items-center gap-2">
          Popular Screeners
          <Info className="h-3.5 w-3.5 text-muted-foreground/60" aria-label="Click a screener to filter the movers grid below" />
        </h2>
        {activeKey && (
          <button
            onClick={() => onSelect(null)}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {SCREENERS.map((s) => {
          const active = activeKey === s.key;
          return (
            <button
              key={s.key}
              onClick={() => onSelect(active ? null : s.key)}
              className={`group inline-flex items-center gap-2 pl-1 pr-3.5 py-1 rounded-full border transition-all ${
                active
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-background hover:border-primary/40 hover:shadow-sm"
              }`}
            >
              <span
                className={`flex items-center justify-center h-7 w-7 rounded-full ${s.bg} text-sm`}
                aria-hidden
              >
                {s.emoji}
              </span>
              <span className={`text-sm font-semibold transition-colors ${active ? "text-primary" : "group-hover:text-primary"}`}>
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
