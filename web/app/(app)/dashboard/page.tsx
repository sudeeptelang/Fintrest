"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  Flame,
  Zap,
  Calendar,
  Sparkles,
} from "lucide-react";
import {
  useMarketSummary,
  useTopPicks,
  useMarketTrending,
  useMarketMostActive,
  useMarketEarningsCalendar,
  useMarketIndices,
  useMarketNews,
} from "@/lib/hooks";
import type { TrendingStock, NewsItem } from "@/lib/api";
import { NewsReaderDrawer } from "@/components/news/news-reader-drawer";
import { StockLogo } from "@/components/stock/stock-logo";
import { SetupLensTiles } from "@/components/dashboard/setup-lens-tiles";
import { HeroSignalCard } from "@/components/dashboard/hero-signal-card";
import { AthenaPulse } from "@/components/dashboard/athena-pulse";

export default function DashboardPage() {
  const { data: summary } = useMarketSummary();
  const { data: picks, isLoading } = useTopPicks(20);
  const { data: trending } = useMarketTrending(8);
  const { data: mostActive } = useMarketMostActive(8);
  const { data: earnings } = useMarketEarningsCalendar(14);
  const { data: indices } = useMarketIndices();
  const { data: marketNews } = useMarketNews(8);

  const signals = picks?.signals ?? [];
  const buyCount = signals.filter((s) => s.signalType === "BUY_TODAY").length;
  const watchCount = signals.filter((s) => s.signalType === "WATCH").length;
  const topSignal = signals[0];

  const [readerItem, setReaderItem] = useState<NewsItem | null>(null);

  return (
    <div className="space-y-8">
      {/* Athena's Pulse — regime + narrative + top picks. Replaces static KPI strip. */}
      <AthenaPulse />

      {/* Index ticker strip — clickable, shows ticker + % change + price. Each cell links to /markets. */}
      {indices && indices.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-4 md:grid-cols-8">
            {indices
              .filter((idx) => ["SPY","QQQ","DIA","IWM","GLD","TLT","IBIT","VWO"].includes(idx.ticker))
              .map((idx, i, arr) => {
                const positive = (idx.changePct ?? 0) >= 0;
                const change = idx.changePct === null
                  ? null
                  : `${positive ? "+" : ""}${idx.changePct.toFixed(2)}%`;
                return (
                  <Link
                    key={idx.ticker}
                    href="/markets"
                    className={`group flex flex-col gap-0.5 px-3 py-2.5 transition-colors hover:bg-muted/40 ${
                      i < arr.length - 1 ? "md:border-r border-border" : ""
                    } ${i < 4 ? "border-b md:border-b-0 border-border" : ""}`}
                  >
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-[var(--font-mono)] text-xs font-bold group-hover:text-primary transition-colors">
                        {idx.ticker}
                      </span>
                      <span
                        className={`font-[var(--font-mono)] text-[10px] font-semibold ${
                          positive ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        {change ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                        {idx.label}
                      </span>
                      <span className="font-[var(--font-mono)] text-[10px] text-muted-foreground">
                        {idx.price?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "—"}
                      </span>
                    </div>
                  </Link>
                );
              })}
          </div>
          <div className="border-t border-border px-3 py-1.5 text-right">
            <Link href="/markets" className="text-[10px] text-primary hover:underline">
              View all markets →
            </Link>
          </div>
        </div>
      )}

      {/* Today's Top Signals — balanced 3-up strip, no single hero */}
      {signals.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wider">
                Today&apos;s Top Signals
              </h2>
            </div>
            <Link href="/picks" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {signals.slice(0, 3).map((s, i) => (
              <HeroSignalCard key={s.id} signal={s} rank={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* Today's Setups — compact lens-tile strip. Each tile deep-links to /picks?lens=... */}
      <SetupLensTiles />

      {/* Market Pulse — Trending + Most Active (different data, not redundant with signals) */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-500" /> Trending
            </h2>
          </div>
          {!trending || trending.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No data.</p>
          ) : (
            <div className="space-y-1.5">
              {trending.slice(0, 7).map((s) => (
                <StockMiniRow key={s.ticker} stock={s} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" /> Most Active
            </h2>
          </div>
          {!mostActive || mostActive.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No data.</p>
          ) : (
            <div className="space-y-1.5">
              {mostActive.slice(0, 7).map((s) => (
                <StockMiniRow key={s.ticker} stock={s} showVolume />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Earnings Calendar + News side by side */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Earnings Calendar */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-[var(--font-heading)] text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" /> Earnings Calendar
            </h2>
          </div>
          {!earnings || earnings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No upcoming earnings in the next 14 days.
            </p>
          ) : (
            <div className="space-y-2">
              {earnings.map((e) => (
                <Link
                  key={e.ticker}
                  href={`/stock/${e.ticker}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <StockLogo ticker={e.ticker} size={32} />
                    <div>
                      <p className="font-[var(--font-mono)] font-semibold text-sm">{e.ticker}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{e.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
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
      </div>

      {/* Trending Stock News */}
      {marketNews && marketNews.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-[var(--font-heading)] text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" /> Trending Stock News
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {marketNews.map((item, i) => (
              <button
                key={i}
                onClick={() => setReaderItem(item)}
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
                  <p className="text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">{item.headline}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">{item.source}</span>
                    {item.publishedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.publishedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                    {item.catalystType && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                        {item.catalystType}
                      </span>
                    )}
                    <Sparkles className="h-3 w-3 text-muted-foreground/40 group-hover:text-[#00b87c] transition-colors" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <NewsReaderDrawer item={readerItem} onClose={() => setReaderItem(null)} />
    </div>
  );
}

function StockMiniRow({
  stock: s,
  showVolume,
}: {
  stock: TrendingStock;
  showVolume?: boolean;
}) {
  const positive = s.changePct >= 0;
  return (
    <Link
      href={`/stock/${s.ticker}`}
      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/20 transition-colors"
    >
      <div className="flex items-center gap-3">
        <StockLogo ticker={s.ticker} size={32} />
        <div>
          <p className="font-[var(--font-mono)] font-semibold text-sm">{s.ticker}</p>
          <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">
            {showVolume
              ? `Vol: ${s.volume >= 1e6 ? `${(s.volume / 1e6).toFixed(1)}M` : `${(s.volume / 1e3).toFixed(0)}K`}`
              : s.sector ?? s.name}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-[var(--font-mono)] text-sm font-semibold">${s.price.toFixed(2)}</p>
        <p
          className={`font-[var(--font-mono)] text-xs font-semibold ${
            positive ? "text-emerald-500" : "text-red-500"
          }`}
        >
          {positive ? "+" : ""}
          {s.changePct.toFixed(2)}%
        </p>
      </div>
    </Link>
  );
}
