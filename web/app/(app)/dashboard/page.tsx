"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Flame,
  Zap,
  Calendar,
  Brain,
  Clock,
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
import { SignalRow } from "@/components/signals/signal-row";
import type { TrendingStock, EarningsCalendarItem, Signal, NewsItem } from "@/lib/api";
import { StockLogo } from "@/components/stock/stock-logo";
import { ScreenerTable } from "@/components/dashboard/screener-table";

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {summary?.latestScanAt
            ? `Last scan: ${new Date(summary.latestScanAt).toLocaleString()}`
            : "Good morning. Here's your market overview."}
        </p>
      </div>

      {/* Summary strip — compact, data-dense */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-primary/20 bg-primary/5 p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Top Signal</p>
          <p className="font-[var(--font-mono)] text-xl font-bold mt-1">{topSignal?.ticker ?? "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {topSignal ? `Score ${Math.round(topSignal.scoreTotal)} · ${topSignal.signalType.replace("_"," ")}` : "Run a scan"}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="rounded-xl border border-border bg-card p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Signals Today</p>
          <p className="font-[var(--font-heading)] text-xl font-bold mt-1">{summary?.signalsToday ?? 0}</p>
          <p className="text-xs mt-0.5">
            <span className="text-emerald-500 font-semibold">{buyCount} buy</span>
            <span className="text-muted-foreground"> · </span>
            <span className="text-amber-500 font-semibold">{watchCount} watch</span>
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="rounded-xl border border-border bg-card p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Market</p>
          <p className="font-[var(--font-heading)] text-xl font-bold mt-1 capitalize">
            {summary?.marketStatus?.replace("_", " ") ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {summary?.latestScanAt
              ? new Date(summary.latestScanAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "No scan yet"}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.09 }}
          className="rounded-xl border border-border bg-card p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Avg Score</p>
          <p className="font-[var(--font-heading)] text-xl font-bold mt-1">
            {signals.length > 0
              ? Math.round(signals.reduce((sum, s) => sum + s.scoreTotal, 0) / signals.length)
              : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{signals.length} stocks scanned</p>
        </motion.div>
      </div>

      {/* Index ticker tape — horizontal scroll */}
      {indices && indices.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center overflow-x-auto no-scrollbar">
            {indices.map((idx, i) => {
              const positive = (idx.changePct ?? 0) >= 0;
              return (
                <div
                  key={idx.ticker}
                  className={`flex items-center gap-2.5 px-4 py-3 whitespace-nowrap shrink-0 ${
                    i < indices.length - 1 ? "border-r border-border" : ""
                  }`}
                >
                  <span className="font-[var(--font-mono)] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {idx.label}
                  </span>
                  <span className="font-[var(--font-mono)] text-sm font-bold">
                    {idx.price?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "—"}
                  </span>
                  <span
                    className={`font-[var(--font-mono)] text-xs font-semibold flex items-center gap-0.5 ${
                      positive ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {positive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {idx.changePct === null ? "—" : `${positive ? "+" : ""}${idx.changePct.toFixed(2)}%`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Signal of the Day — hero card */}
      {topSignal && (
        <Link href={`/stock/${topSignal.ticker}`}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-primary/20 bg-gradient-to-br from-[#1E1B4B] to-[#2D2A6B] p-6 text-white flex flex-col sm:flex-row items-start sm:items-center gap-6 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-4 flex-1">
              <StockLogo ticker={topSignal.ticker} size={56} className="rounded-2xl" />
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-[var(--font-heading)] text-2xl font-bold">{topSignal.ticker}</p>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    topSignal.signalType === "BUY_TODAY" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                  }`}>
                    {topSignal.signalType.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm text-white/50 mt-0.5">{topSignal.stockName}</p>
                {topSignal.breakdown?.whyNowSummary && (
                  <p className="text-xs text-white/60 mt-2 max-w-lg leading-relaxed line-clamp-2">
                    {topSignal.breakdown.whyNowSummary}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-6 shrink-0">
              {topSignal.currentPrice && (
                <div className="text-right">
                  <p className="font-[var(--font-mono)] text-xl font-bold">${topSignal.currentPrice.toFixed(2)}</p>
                  {topSignal.changePct !== null && (
                    <p className={`font-[var(--font-mono)] text-sm font-semibold ${
                      topSignal.changePct >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {topSignal.changePct >= 0 ? "+" : ""}{topSignal.changePct.toFixed(2)}%
                    </p>
                  )}
                </div>
              )}
              <div className="text-center">
                <p className="font-[var(--font-heading)] text-3xl font-bold text-primary">
                  {Math.round(topSignal.scoreTotal)}
                </p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Score</p>
              </div>
              {topSignal.entryLow && (
                <div className="text-right hidden md:block">
                  <p className="text-[10px] text-white/40 uppercase">Entry</p>
                  <p className="font-[var(--font-mono)] text-sm font-semibold">
                    ${topSignal.entryLow.toFixed(0)}–${topSignal.entryHigh?.toFixed(0)}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </Link>
      )}

      {/* Main Screener Table — tabbed data-dense view */}
      <ScreenerTable />

      {/* Three-column: Athena Signals + Trending + Most Active */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Athena Signals */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" /> Athena&apos;s Picks
            </h2>
            <Link href="/picks" className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-0.5">
              All <ArrowUpRight className="h-2.5 w-2.5" />
            </Link>
          </div>
          <div className="space-y-1.5">
            {signals.slice(1, 8).map((s) => (
              <Link
                key={s.id}
                href={`/stock/${s.ticker}`}
                className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <StockLogo ticker={s.ticker} size={28} />
                  <div>
                    <p className="font-[var(--font-mono)] text-xs font-bold">{s.ticker}</p>
                    <p className="text-[9px] text-muted-foreground truncate max-w-[80px]">{s.stockName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.changePct !== null && (
                    <span className={`font-[var(--font-mono)] text-[10px] font-semibold ${
                      s.changePct >= 0 ? "text-emerald-500" : "text-red-500"
                    }`}>
                      {s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(1)}%
                    </span>
                  )}
                  <span className="font-[var(--font-mono)] text-xs font-bold w-7 text-right">
                    {Math.round(s.scoreTotal)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Trending */}
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

        {/* Most Active */}
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
              <div
                key={i}
                className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/20 transition-colors"
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
                  <p className="text-sm leading-snug line-clamp-2">{item.headline}</p>
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In Case You Missed — yesterday's signals that are still relevant */}
      {signals.length > 5 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-[var(--font-heading)] text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" /> In Case You Missed
            </h2>
            <Link
              href="/picks"
              className="text-sm text-primary font-medium hover:text-primary/80 flex items-center gap-1"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {signals.slice(5, 12).map((s) => (
              <SignalRow key={s.id} signal={s} />
            ))}
          </div>
        </div>
      )}
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
