"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Target,
  Newspaper,
  TrendingUp,
  Shield,
  Clock,
  ArrowUpRight,
  Star,
  Bell,
  Check,
  Loader2,
} from "lucide-react";
import { useStock, useStockSignals, useStockNews, useStockChart, useWatchlists, useAddWatchlistItem, useCreateWatchlist } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/charts/score-ring";
import { FactorRadar } from "@/components/charts/factor-radar";
import { PriceChart } from "@/components/charts/price-chart";

interface StockDetailPageProps {
  params: Promise<{ ticker: string }>;
}

const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4 },
  }),
};

export default function StockDetailPage({ params }: StockDetailPageProps) {
  const { ticker } = use(params);
  const [chartRange, setChartRange] = useState("3m");

  const { data: stock } = useStock(ticker);
  const { data: signalsData } = useStockSignals(ticker);
  const { data: news } = useStockNews(ticker);
  const { data: chartData } = useStockChart(ticker, chartRange);
  const { data: watchlists } = useWatchlists();
  const addToWatchlist = useAddWatchlistItem();
  const createWatchlist = useCreateWatchlist();
  const [watchlistAdding, setWatchlistAdding] = useState(false);

  const isInWatchlist = watchlists?.some(wl =>
    wl.items.some(item => item.ticker.toUpperCase() === ticker.toUpperCase())
  );

  async function handleAddToWatchlist() {
    if (!stock || watchlistAdding) return;
    setWatchlistAdding(true);
    try {
      let wl = watchlists?.[0];
      if (!wl) {
        wl = await createWatchlist.mutateAsync("My Watchlist");
      }
      await addToWatchlist.mutateAsync({ watchlistId: wl.id, stockId: stock.id });
    } catch {
      // already in watchlist or error
    } finally {
      setWatchlistAdding(false);
    }
  }

  const latestSignal = signalsData?.signals?.[0];
  const breakdown = latestSignal?.breakdown;

  // Parse explanation
  let explanation: {
    Summary?: string;
    BullishFactors?: string[];
    BearishFactors?: string[];
    TradeZoneNarrative?: string;
  } = {};
  if (breakdown?.explanationJson) {
    try {
      explanation = JSON.parse(breakdown.explanationJson);
    } catch {
      /* */
    }
  }

  const factors = breakdown
    ? [
        { label: "Momentum", score: breakdown.momentumScore, weight: "25%", icon: TrendingUp },
        { label: "Rel. Volume", score: breakdown.relVolumeScore, weight: "15%", icon: ArrowUpRight },
        { label: "News Catalyst", score: breakdown.newsScore, weight: "15%", icon: Newspaper },
        { label: "Fundamentals", score: breakdown.fundamentalsScore, weight: "15%", icon: Target },
        { label: "Sentiment", score: breakdown.sentimentScore, weight: "10%", icon: Brain },
        { label: "Trend Strength", score: breakdown.trendScore, weight: "10%", icon: TrendingUp },
        { label: "Risk Filter", score: breakdown.riskScore, weight: "10%", icon: Shield },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="font-[var(--font-mono)] text-lg font-bold text-primary">
              {ticker.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase">
                {ticker}
              </h1>
              {latestSignal && (
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    latestSignal.signalType === "BUY_TODAY"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : latestSignal.signalType === "WATCH"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {latestSignal.signalType.replace("_", " ")}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {stock?.name ?? "Loading..."}{" "}
              {stock?.exchange ? `· ${stock.exchange}` : ""}{" "}
              {stock?.sector ? `· ${stock.sector}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddToWatchlist}
            disabled={isInWatchlist || watchlistAdding}
            className={isInWatchlist ? "border-primary/30 text-primary" : ""}
          >
            {watchlistAdding ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : isInWatchlist ? (
              <Check className="h-3.5 w-3.5 mr-1.5" />
            ) : (
              <Star className="h-3.5 w-3.5 mr-1.5" />
            )}
            {isInWatchlist ? "In Watchlist" : "Watchlist"}
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
            <Bell className="h-3.5 w-3.5 mr-1.5" /> Set Alert
          </Button>
        </div>
      </div>

      {/* Score ring + Radar + Key metrics row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Score ring */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center justify-center"
        >
          {latestSignal ? (
            <ScoreRing score={latestSignal.scoreTotal} size={180} />
          ) : (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
              No signal data
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-4 w-full">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Risk</p>
              <p
                className={`text-sm font-semibold ${
                  latestSignal?.riskLevel === "LOW"
                    ? "text-emerald-400"
                    : latestSignal?.riskLevel === "HIGH"
                      ? "text-red-400"
                      : "text-amber-400"
                }`}
              >
                {latestSignal?.riskLevel ?? "—"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Horizon</p>
              <p className="text-sm font-semibold">
                {latestSignal?.horizonDays ? `${latestSignal.horizonDays}d` : "—"}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Radar chart */}
        <motion.div
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Factor Profile
          </h3>
          {breakdown ? (
            <FactorRadar breakdown={breakdown} />
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
              No breakdown data
            </div>
          )}
        </motion.div>

        {/* Trade zone + details */}
        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="rounded-2xl border border-border bg-card p-6 space-y-5"
        >
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              Trade Zone
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Entry</span>
                <span className="font-[var(--font-mono)] font-semibold">
                  {latestSignal?.entryLow
                    ? `$${latestSignal.entryLow.toFixed(2)} – $${latestSignal.entryHigh?.toFixed(2)}`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Target</span>
                <span className="font-[var(--font-mono)] font-semibold text-emerald-400">
                  {latestSignal?.targetHigh
                    ? `$${latestSignal.targetLow?.toFixed(2)} – $${latestSignal.targetHigh.toFixed(2)}`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Stop Loss</span>
                <span className="font-[var(--font-mono)] font-semibold text-red-400">
                  {latestSignal?.stopLoss ? `$${latestSignal.stopLoss.toFixed(2)}` : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Market Cap</span>
                <span className="font-[var(--font-mono)]">
                  {stock?.marketCap ? `$${(stock.marketCap / 1e9).toFixed(1)}B` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sector</span>
                <span className="text-xs">{stock?.sector ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Exchange</span>
                <span className="text-xs">{stock?.exchange ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Float</span>
                <span className="font-[var(--font-mono)] text-xs">
                  {stock?.floatShares
                    ? `${(stock.floatShares / 1e6).toFixed(0)}M`
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Price Chart */}
      <motion.div
        custom={3}
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[var(--font-heading)] text-lg font-semibold">
            Price Chart
          </h2>
          <div className="flex gap-1">
            {["1m", "3m", "6m", "1y"].map((range) => (
              <button
                key={range}
                onClick={() => setChartRange(range)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                  chartRange === range
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <PriceChart data={chartData ?? []} height={350} />
      </motion.div>

      {/* Factor bars + AI + News */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* 7-Factor Score Bars */}
        {breakdown && (
          <motion.div
            custom={4}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <h2 className="font-[var(--font-heading)] text-lg font-semibold mb-5 flex items-center gap-2">
              <Target className="h-4.5 w-4.5 text-muted-foreground" /> Score
              Breakdown
            </h2>
            <div className="space-y-4">
              {factors.map((f, i) => (
                <motion.div
                  key={f.label}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={fadeIn}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <f.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{f.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {f.weight}
                      </span>
                      <span className="font-[var(--font-mono)] text-sm font-bold w-7 text-right">
                        {Math.round(f.score)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted/30 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        f.score >= 70
                          ? "bg-emerald-500"
                          : f.score >= 50
                            ? "bg-amber-400"
                            : "bg-red-400"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${f.score}%` }}
                      transition={{ delay: 0.3 + i * 0.05, duration: 0.6 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="space-y-6">
          {/* AI Explanation */}
          {explanation.Summary && (
            <motion.div
              custom={5}
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <h2 className="font-[var(--font-heading)] text-lg font-semibold mb-3 flex items-center gap-2">
                <Brain className="h-4.5 w-4.5 text-muted-foreground" /> AI
                Analysis
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {explanation.Summary}
              </p>
              {(explanation.BullishFactors?.length ?? 0) > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                    Bullish
                  </p>
                  {explanation.BullishFactors?.map((f, i) => (
                    <p
                      key={i}
                      className="text-xs text-muted-foreground flex items-start gap-2 pl-2 border-l-2 border-emerald-500/30"
                    >
                      {f}
                    </p>
                  ))}
                </div>
              )}
              {(explanation.BearishFactors?.length ?? 0) > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">
                    Bearish
                  </p>
                  {explanation.BearishFactors?.map((f, i) => (
                    <p
                      key={i}
                      className="text-xs text-muted-foreground flex items-start gap-2 pl-2 border-l-2 border-red-500/30"
                    >
                      {f}
                    </p>
                  ))}
                </div>
              )}
              {explanation.TradeZoneNarrative && (
                <p className="mt-4 text-xs text-muted-foreground italic border-t border-border pt-3">
                  {explanation.TradeZoneNarrative}
                </p>
              )}
            </motion.div>
          )}

          {/* News */}
          <motion.div
            custom={6}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <h2 className="font-[var(--font-heading)] text-lg font-semibold mb-3 flex items-center gap-2">
              <Newspaper className="h-4.5 w-4.5 text-muted-foreground" /> Recent
              News
            </h2>
            <div className="space-y-3">
              {(news ?? []).slice(0, 6).map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                      (item.sentimentScore ?? 0) > 0.2
                        ? "bg-emerald-500"
                        : (item.sentimentScore ?? 0) < -0.2
                          ? "bg-red-500"
                          : "bg-amber-400"
                    }`}
                  />
                  <div>
                    <p className="text-sm leading-snug">{item.headline}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {item.source}
                      </span>
                      {item.publishedAt && (
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(item.publishedAt).toLocaleDateString()}
                        </span>
                      )}
                      {item.catalystType && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {item.catalystType}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {(!news || news.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  No recent news for this ticker.
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
