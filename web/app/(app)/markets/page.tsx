"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { Loader2, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { PriceFreshness } from "@/components/ui/price-freshness";
import {
  useMarketSummary,
  useMarketIndices,
  useMarketScreener,
  useMarketNews,
  useMarketEarningsCalendar,
} from "@/lib/hooks";
import type { MarketIndex, NewsItem } from "@/lib/api";
import { StockLogo } from "@/components/stock/stock-logo";
import { NewsReaderDrawer } from "@/components/news/news-reader-drawer";
import { PaywallGate } from "@/components/billing/paywall-gate";
import { RegimeStrip } from "@/components/markets/regime-strip";
import { MoversGrid } from "@/components/markets/movers-grid";
import { MarketOverviewStrip } from "@/components/markets/market-overview-strip";
import { SectorHeatmap } from "@/components/markets/sector-heatmap";
import { IpoCalendarCard } from "@/components/markets/ipo-calendar-card";
import { Newspaper, Sparkles } from "lucide-react";

export default function MarketsPage() {
  const { data: market, isLoading: summaryLoading } = useMarketSummary();
  const { data: indices } = useMarketIndices();
  const { data: screener } = useMarketScreener(500);
  const { data: marketNews } = useMarketNews(12);
  const { data: earnings } = useMarketEarningsCalendar(14);

  const [newsReaderItem, setNewsReaderItem] = useState<NewsItem | null>(null);

  const indexList = indices ?? [];
  const stocks = useMemo(() => screener ?? [], [screener]);

  // ─── Market Pulse: compute breadth score from screener data
  const pulseData = useMemo(() => {
    if (stocks.length === 0) return { score: 50, label: "Neutral", up: 0, down: 0, flat: 0 };
    const up = stocks.filter((s) => (s.changePct ?? 0) > 0.1).length;
    const down = stocks.filter((s) => (s.changePct ?? 0) < -0.1).length;
    const flat = stocks.length - up - down;
    const ratio = up / stocks.length;
    const score = Math.round(ratio * 100);
    let label = "Neutral";
    if (score >= 75) label = "Extreme Greed";
    else if (score >= 60) label = "Greed";
    else if (score >= 45) label = "Neutral";
    else if (score >= 25) label = "Fear";
    else label = "Extreme Fear";
    return { score, label, up, down, flat };
  }, [stocks]);

  // ─── Heatmap data — top 40 stocks by market cap. Box size = market cap, color = today's % change.
  const heatmapData = useMemo(() => {
    return stocks
      .filter((s) => s.marketCap && s.marketCap > 0 && s.changePct !== null)
      .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
      .slice(0, 100)
      .map((s) => ({
        name: s.ticker,
        size: s.marketCap ?? 0,
        changePct: s.changePct ?? 0,
        stockName: s.name,
        price: s.price,
      }));
  }, [stocks]);

  // Loading check AFTER all hooks (Rules of Hooks)
  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1120px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-ink-900">Markets</h1>
          <p className="text-sm text-ink-600 mt-1">
            {market?.signalsToday || 0} signals · {stocks.length} stocks tracked
          </p>
          {/* Single header badge replaces the hard-coded "Market Open / Pre-
              Market" label that ignored after-hours + weekend states. */}
          <PriceFreshness className="mt-1.5" />
        </div>
        <span className="px-3 py-1 rounded-full bg-forest-light text-forest-dark text-xs font-semibold flex items-center gap-1.5 border border-forest">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-forest"></span>
          </span>
          Live
        </span>
      </div>

      {/* Regime strip — renders when /market/regime has data. §05 of spec.
          Silently hides when the macro classifier endpoint hasn't shipped. */}
      <RegimeStrip />

      {/* Market overview — unified breadth + indices + treasury strip.
          Replaces the old MarketPulse + GlobalIndicesGrid two-card layout. */}
      <MarketOverviewStrip />

      {/* Sector heatmap — compact strip for the at-a-glance "where is
          money flowing today" read. Click any tile to drill into the
          full /heatmap page. Per the 5-competitor audit: Yahoo / Finviz
          lead with this on their markets pages. */}
      <section className="rounded-[12px] border border-ink-200 bg-ink-0 p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-[var(--font-sans)] text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">
            Sector heatmap
          </h2>
          <Link href="/heatmap" className="font-[var(--font-sans)] text-[12px] font-medium text-forest hover:underline whitespace-nowrap">
            Full heatmap →
          </Link>
        </div>
        <SectorHeatmap variant="compact" />
      </section>

      {/* Market movers — consolidated "one grid" per UX_AUDIT. Tabs for
          gainers/losers/52w/unusual, sector + cap filters, inline
          Run Lens + Watchlist. Full screener at /research/screener. */}
      <MoversGrid />

      {/* Popular Stocks Heatmap — Pro only. Finviz-style: box size = market cap, color = today's % change. */}
      <PaywallGate tier="pro" compact>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-[var(--font-heading)] text-lg font-semibold">
              Popular Stocks Heatmap
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Top 100 by market cap · box size = market cap · color = today&apos;s % change · click to open
            </p>
          </div>
        </div>
        {heatmapData.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No stock data yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={420}>
            <Treemap
              data={heatmapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="rgba(0,0,0,0.08)"
              content={<StockCell />}
            >
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]?.payload) return null;
                  const d = payload[0].payload as {
                    name: string;
                    stockName: string;
                    size: number;
                    changePct: number;
                    price: number | null;
                  };
                  return (
                    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                      <p className="font-semibold">{d.name} · {d.stockName}</p>
                      <p className="text-muted-foreground mt-0.5">
                        {d.price ? `$${d.price.toFixed(2)} · ` : ""}
                        {d.size >= 1e12 ? `$${(d.size / 1e12).toFixed(2)}T` :
                         d.size >= 1e9 ? `$${(d.size / 1e9).toFixed(1)}B` :
                         `$${(d.size / 1e6).toFixed(0)}M`} mkt cap
                      </p>
                      <p
                        className={`font-[var(--font-mono)] font-bold mt-1 ${
                          d.changePct >= 0 ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        {d.changePct >= 0 ? "+" : ""}
                        {d.changePct.toFixed(2)}%
                      </p>
                    </div>
                  );
                }}
              />
            </Treemap>
          </ResponsiveContainer>
        )}
      </div>
      </PaywallGate>

      {/* Earnings + IPO calendars side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[var(--font-heading)] text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-500" /> Earnings Calendar
          </h2>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            next 14 days
          </span>
        </div>
        {!earnings || earnings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No upcoming earnings in the next 14 days.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-2">
            {earnings.map((e) => (
              <Link
                key={e.ticker}
                href={`/stock/${e.ticker}`}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StockLogo ticker={e.ticker} size={32} />
                  <div className="min-w-0">
                    <p className="font-[var(--font-mono)] font-semibold text-sm">{e.ticker}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{e.name}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium">
                    {new Date(e.earningsDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  {e.price && (
                    <p className="font-[var(--font-mono)] text-[10px] text-muted-foreground">
                      ${e.price.toFixed(2)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <IpoCalendarCard />
      </div>

      {/* Market News — macro context for the "why" behind the moves above.
          Featured lead story on top + grid of supporting headlines below. */}
      {marketNews && marketNews.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-[var(--font-heading)] text-lg font-semibold flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" /> Market News
            </h2>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {marketNews.length} stories
            </span>
          </div>

          {/* Featured (most recent) — larger editorial card */}
          <button
            onClick={() => setNewsReaderItem(marketNews[0])}
            className="group block w-full text-left rounded-xl border border-border bg-background hover:border-primary/40 transition-all p-5 mb-4"
          >
            <div className="flex items-center gap-2 mb-2 text-[10px] font-bold uppercase tracking-widest">
              <span className={`px-1.5 py-0.5 rounded ${
                (marketNews[0].sentimentScore ?? 0) > 0.2
                  ? "bg-emerald-500/10 text-emerald-500"
                  : (marketNews[0].sentimentScore ?? 0) < -0.2
                    ? "bg-red-500/10 text-red-500"
                    : "bg-amber-500/10 text-amber-500"
              }`}>
                {(marketNews[0].sentimentScore ?? 0) > 0.2 ? "Bullish" : (marketNews[0].sentimentScore ?? 0) < -0.2 ? "Bearish" : "Neutral"}
              </span>
              {marketNews[0].catalystType && (
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  {marketNews[0].catalystType}
                </span>
              )}
              {marketNews[0].ticker && (
                <span className="font-[var(--font-mono)] text-foreground">{marketNews[0].ticker}</span>
              )}
            </div>
            <h3 className="font-[var(--font-heading)] text-lg font-semibold leading-snug group-hover:text-primary transition-colors">
              {marketNews[0].headline}
            </h3>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>{marketNews[0].source}</span>
              {marketNews[0].publishedAt && (
                <>
                  <span>·</span>
                  <span>{new Date(marketNews[0].publishedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                </>
              )}
              <Sparkles className="h-3 w-3 ml-auto text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </div>
          </button>

          {/* Supporting headlines — 2-up grid of compact cards */}
          <div className="grid md:grid-cols-2 gap-3">
            {marketNews.slice(1).map((item) => (
              <button
                key={item.id}
                onClick={() => setNewsReaderItem(item)}
                className="group flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors text-left"
              >
                <div
                  className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                    (item.sentimentScore ?? 0) > 0.2
                      ? "bg-emerald-500"
                      : (item.sentimentScore ?? 0) < -0.2
                        ? "bg-red-500"
                        : "bg-amber-400"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {item.headline}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span>{item.source}</span>
                    {item.ticker && (
                      <span className="font-[var(--font-mono)] font-semibold text-foreground">{item.ticker}</span>
                    )}
                    {item.catalystType && (
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                        {item.catalystType}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <NewsReaderDrawer item={newsReaderItem} onClose={() => setNewsReaderItem(null)} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Global Indices Grid — grouped by category with tabs
// ════════════════════════════════════════════════════════════════

const CATEGORY_ORDER = ["US", "International", "Commodities", "Bonds", "Crypto"] as const;
const CATEGORY_ICONS: Record<string, string> = {
  US: "🇺🇸",
  International: "🌍",
  Commodities: "🛢️",
  Bonds: "🏦",
  Crypto: "₿",
};

function GlobalIndicesGrid({ indices }: { indices: MarketIndex[] }) {
  const [activeCategory, setActiveCategory] = useState<string>("US");

  const grouped = useMemo(() => {
    const map: Record<string, MarketIndex[]> = {};
    indices.forEach((idx) => {
      const cat = idx.category || "Other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(idx);
    });
    return map;
  }, [indices]);

  const activeIndices = grouped[activeCategory] ?? [];
  const categories = CATEGORY_ORDER.filter((c) => (grouped[c]?.length ?? 0) > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4 h-full">
      {/* Category tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <span>{CATEGORY_ICONS[cat]}</span>
            <span>{cat}</span>
            <span className="text-[10px] opacity-60">{grouped[cat]?.length ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Indices for active category */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {activeIndices.map((idx, i) => {
          const positive = (idx.changePct ?? 0) >= 0;
          return (
            <motion.div
              key={idx.ticker}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-lg border border-border bg-background/50 p-3"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                    {idx.label}
                  </p>
                  <p className="font-[var(--font-mono)] text-base font-bold mt-0.5">
                    {idx.price !== null
                      ? idx.price.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "—"}
                  </p>
                </div>
                <span
                  className={`font-[var(--font-mono)] text-[10px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded shrink-0 ${
                    positive
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {positive ? (
                    <TrendingUp className="h-2.5 w-2.5" />
                  ) : (
                    <TrendingDown className="h-2.5 w-2.5" />
                  )}
                  {idx.changePct === null
                    ? "—"
                    : `${positive ? "+" : ""}${idx.changePct.toFixed(2)}%`}
                </span>
              </div>
            </motion.div>
          );
        })}
        {activeIndices.length === 0 && (
          <p className="col-span-full text-xs text-muted-foreground text-center py-6">
            No data yet. Run /seed/ingest for these tickers.
          </p>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Market Pulse — breadth-based sentiment gauge
// ════════════════════════════════════════════════════════════════

function MarketPulse({
  pulse,
}: {
  pulse: { score: number; label: string; up: number; down: number; flat: number };
}) {
  const colors = {
    "Extreme Fear": "text-red-600",
    Fear: "text-red-500",
    Neutral: "text-amber-500",
    Greed: "text-emerald-500",
    "Extreme Greed": "text-emerald-600",
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Market Pulse</h2>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        Breadth: % of tracked stocks up today
      </p>

      {/* Gauge arc */}
      <div className="mt-4 flex flex-col items-center">
        <div className="relative w-40 h-20">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M 10 90 A 90 90 0 0 1 190 90"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              className="text-muted/40"
            />
            {/* Colored arc — 5 segments */}
            <path
              d="M 10 90 A 90 90 0 0 1 46 27"
              stroke="#DC2626"
              strokeWidth="12"
              fill="none"
              strokeLinecap="butt"
              opacity={pulse.score >= 0 ? 1 : 0.3}
            />
            <path
              d="M 46 27 A 90 90 0 0 1 100 10"
              stroke="#F59E0B"
              strokeWidth="12"
              fill="none"
              strokeLinecap="butt"
              opacity={pulse.score >= 25 ? 1 : 0.3}
            />
            <path
              d="M 100 10 A 90 90 0 0 1 154 27"
              stroke="#10B981"
              strokeWidth="12"
              fill="none"
              strokeLinecap="butt"
              opacity={pulse.score >= 50 ? 1 : 0.3}
            />
            <path
              d="M 154 27 A 90 90 0 0 1 190 90"
              stroke="#059669"
              strokeWidth="12"
              fill="none"
              strokeLinecap="butt"
              opacity={pulse.score >= 75 ? 1 : 0.3}
            />
            {/* Needle */}
            <line
              x1="100"
              y1="90"
              x2={100 + 75 * Math.cos(Math.PI - (pulse.score / 100) * Math.PI)}
              y2={90 - 75 * Math.sin(Math.PI - (pulse.score / 100) * Math.PI)}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-foreground"
            />
            <circle cx="100" cy="90" r="4" fill="currentColor" />
          </svg>
        </div>
        <p
          className={`font-[var(--font-heading)] text-3xl font-bold mt-2 ${colors[pulse.label as keyof typeof colors] ?? ""}`}
        >
          {pulse.score}
        </p>
        <p
          className={`text-xs font-bold uppercase tracking-widest mt-0.5 ${colors[pulse.label as keyof typeof colors] ?? ""}`}
        >
          {pulse.label}
        </p>
      </div>

      {/* Breadth stats */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
        <div className="text-center">
          <p className="font-[var(--font-mono)] text-lg font-bold text-emerald-500">
            {pulse.up}
          </p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
            Up
          </p>
        </div>
        <div className="text-center">
          <p className="font-[var(--font-mono)] text-lg font-bold text-muted-foreground">
            {pulse.flat}
          </p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
            Flat
          </p>
        </div>
        <div className="text-center">
          <p className="font-[var(--font-mono)] text-lg font-bold text-red-500">
            {pulse.down}
          </p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
            Down
          </p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Heatmap cell — clickable, jumps to the stock detail page
// ════════════════════════════════════════════════════════════════

function StockCell(props: any) {
  const { x, y, width, height, name, changePct } = props;
  const pct = changePct ?? 0;

  // Color intensity — saturates at ±3% so the heatmap never looks monotone.
  const getColor = () => {
    const intensity = Math.min(Math.abs(pct) / 3, 1);
    if (pct >= 0) return `rgba(16, 185, 129, ${0.22 + intensity * 0.55})`;
    return `rgba(239, 68, 68, ${0.22 + intensity * 0.55})`;
  };

  const tickerSize = Math.min(width, height) < 50 ? 9 : Math.min(width, height) < 90 ? 12 : 15;
  const pctSize = Math.max(tickerSize - 2, 8);

  const handleClick = () => {
    if (typeof window !== "undefined" && name) window.location.href = `/stock/${name}`;
  };

  return (
    <g onClick={handleClick} style={{ cursor: "pointer" }}>
      <rect
        x={x} y={y} width={width} height={height}
        fill={getColor()}
        stroke="rgba(0,0,0,0.08)"
        strokeWidth={1}
        rx={4}
      />
      {width > 40 && height > 28 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 2}
            textAnchor="middle"
            fill="#0F172A"
            fontSize={tickerSize}
            fontWeight={700}
            fontFamily="Monaco, Courier, monospace"
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + tickerSize - 1}
            textAnchor="middle"
            fill={pct >= 0 ? "#065f46" : "#991b1b"}
            fontSize={pctSize}
            fontWeight={700}
            fontFamily="Monaco, Courier, monospace"
          >
            {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
          </text>
        </>
      )}
    </g>
  );
}

