"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  useStock,
  useStockSignals,
  useStockSnapshot,
  useStockThesis,
  useStockAnalyst,
  useStockNews,
  useStockChart,
  useStockEarnings,
  useStockOwnership,
  useWatchlists,
  useAddWatchlistItem,
  useCreateWatchlist,
} from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SignalDetailHero } from "@/components/signals/signal-detail-hero";
import { LensCardGated } from "@/components/lens/lens-card";
import { PlainEnglishTakeaways } from "@/components/signals/plain-english-takeaways";
import { RefLevelBar } from "@/components/signals/ref-level-bar";
import { FactorBreakdown, FactorRow } from "@/components/signals/factor-row";
import { AnalystRatingCard } from "@/components/signals/analyst-rating-card";
import { RelatedNews } from "@/components/signals/related-news";
import { StockSnapshot as StockSnapshotSection } from "@/components/stock/stock-snapshot";
import { PriceChart } from "@/components/charts/price-chart";
import { FactorRadar } from "@/components/charts/factor-radar";
import { FactorGauges } from "@/components/charts/factor-gauges";
import { FactorBarChart } from "@/components/charts/factor-bar-chart";
import { AthenaSnowflake } from "@/components/stock/athena-snowflake";
import { RewardsRisks } from "@/components/stock/rewards-risks";
import { TechnicalAnalysis } from "@/components/stock/technical-analysis";
import { ValuationSection } from "@/components/stock/valuation-section";
import { PerformanceChart } from "@/components/charts/performance-chart";
import { EarningsHistory } from "@/components/stock/earnings-history";
import { EarningsChart } from "@/components/charts/earnings-chart";
import { OwnershipStrip } from "@/components/stock/ownership-strip";
import {
  expandFactors,
  buildTakeaways,
  getTradePlanNarrative,
  formatMarketCap,
} from "@/lib/signal-explainer";

interface StockDetailPageProps {
  params: Promise<{ ticker: string }>;
}

// Unified Ticker Detail page (v2 Forest & Rust) — ONE page, no teasers to
// another route. Card order:
//
//   Breadcrumb
//   Hero                        — ticker + price + actions + composite score ring
//   Lens's thesis               — full prose (gated for Free)
//   Key takeaways               — plain-English bullets
//   Reference levels            — entry / stop / target + R:R
//   Risk profile                — rewards-vs-risks panel
//   ─── Technical ───           — section heading, all data below
//     7-factor breakdown        — the engine's view
//     Factor profile            — radar + gauges + bar chart detail views
//     Fundamental scorecard     — 5-dimension Simply-Wall-St-style snowflake
//     Price chart               — with range selector
//     Snapshot grid             — valuation · margins · perf · quote · indicators
//     Technical analysis        — RSI / MAs / ATR interpretation
//     Performance               — multi-timeframe
//     Valuation detail          — fair value + street consensus
//   Earnings history            — per-quarter beats/misses + trend
//   Ownership                   — insider + institutional strip
//   Analyst rating              — consensus + target
//   Related news                — headlines with sentiment
export default function StockDetailPage({ params }: StockDetailPageProps) {
  const { ticker: rawTicker } = use(params);
  const ticker = rawTicker.toUpperCase();
  const [chartRange, setChartRange] = useState("3m");

  const { data: stock } = useStock(ticker);
  const { data: signalsData } = useStockSignals(ticker);
  const { data: snapshot } = useStockSnapshot(ticker);
  const { data: thesis } = useStockThesis(ticker);
  const { data: analyst } = useStockAnalyst(ticker);
  const { data: news } = useStockNews(ticker);
  const { data: chartData } = useStockChart(ticker, chartRange);
  const { data: earnings } = useStockEarnings(ticker);
  const { data: ownership } = useStockOwnership(ticker);
  const { data: watchlists } = useWatchlists();
  const addToWatchlist = useAddWatchlistItem();
  const createWatchlist = useCreateWatchlist();
  const [watchlistAdding, setWatchlistAdding] = useState(false);

  const signal = signalsData?.signals?.[0];
  const breakdown = signal?.breakdown;
  const factors = breakdown ? expandFactors(breakdown) : [];

  const entry = signal?.entryLow ?? signal?.currentPrice ?? null;
  const stop = signal?.stopLoss ?? null;
  const target = signal?.targetHigh ?? signal?.targetLow ?? null;
  const hasLevels = entry != null && stop != null && target != null;

  const takeaways = signal ? buildTakeaways({ signal, thesis }) : [];
  const tradePlanNote = signal ? getTradePlanNarrative(signal, thesis) : null;

  const isInWatchlist = watchlists?.some((wl) =>
    wl.items.some((item) => item.ticker.toUpperCase() === ticker),
  );

  async function handleAddToWatchlist() {
    if (!stock || watchlistAdding || isInWatchlist) return;
    setWatchlistAdding(true);
    try {
      let wl = watchlists?.[0];
      if (!wl) wl = await createWatchlist.mutateAsync("My Watchlist");
      await addToWatchlist.mutateAsync({ watchlistId: wl.id, stockId: stock.id });
    } catch {
      /* already in watchlist or error */
    } finally {
      setWatchlistAdding(false);
    }
  }

  return (
    <div className="max-w-[1120px] mx-auto space-y-6 pt-2 pb-16">
      <Breadcrumb
        items={[
          { label: "Today", href: "/dashboard" },
          { label: ticker },
        ]}
      />

      <SignalDetailHero
        ticker={ticker}
        signal={signal}
        stock={stock}
        marketCap={formatMarketCap(stock?.marketCap ?? snapshot?.marketCap)}
        volume={formatVolumeShort(snapshot?.volume)}
        actions={
          <>
            <Link
              href="/boards"
              className="inline-flex items-center px-4 py-2.5 rounded-md bg-forest text-ink-0 text-[13px] font-semibold hover:bg-forest-dark transition-colors"
            >
              Pin to board
            </Link>
            <button
              type="button"
              onClick={handleAddToWatchlist}
              disabled={isInWatchlist || watchlistAdding}
              className={cn(
                "inline-flex items-center px-4 py-2.5 rounded-md border text-[13px] font-semibold transition-colors",
                isInWatchlist
                  ? "border-forest bg-forest-light text-forest"
                  : "bg-ink-0 text-ink-800 border-ink-300 hover:border-ink-500",
              )}
            >
              {isInWatchlist ? "In watchlist" : watchlistAdding ? "Adding…" : "Add to watchlist"}
            </button>
            <Link
              href={`/alerts/create?ticker=${ticker}`}
              className="inline-flex items-center px-4 py-2.5 rounded-md text-ink-700 text-[13px] font-semibold hover:bg-ink-100 transition-colors"
            >
              Set alert
            </Link>
          </>
        }
      />

      {/* 1. Lens's thesis */}
      <LensCardGated
        eyebrow="Lens's thesis"
        title={thesisTitle(thesis, signal)}
        meta={signal ? `Signal #${String(signal.id).padStart(2, "0")}` : undefined}
        personalizedForElite
      >
        {thesis?.thesis ? (
          <>{thesis.thesis}</>
        ) : (
          <ThesisFallback ticker={ticker} signal={signal ?? null} />
        )}
      </LensCardGated>

      {/* 2. Key takeaways */}
      {takeaways.length > 0 && <PlainEnglishTakeaways items={takeaways} />}

      {/* 3. Reference levels */}
      {hasLevels && (
        <RefLevelBar entry={entry} stop={stop} target={target} note={tradePlanNote} />
      )}

      {/* 4. Risk profile */}
      {snapshot && <RewardsRisks snapshot={snapshot} signal={signal ?? null} />}

      {/* 5. Technical section */}
      <section className="pt-2">
        <div className="border-t border-ink-200 pt-6 space-y-6">
          <div className="flex items-baseline gap-3">
            <h2 className="font-[var(--font-heading)] text-[22px] leading-[28px] font-semibold text-ink-900 tracking-[-0.01em]">
              Technical
            </h2>
            <span className="font-[var(--font-mono)] text-[13px] text-ink-500">
              What the engine saw
            </span>
          </div>

          {/* 7-factor breakdown rows */}
          {factors.length > 0 && (
            <div>
              <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-forest-dark mb-3">
                7-factor breakdown
              </div>
              <FactorBreakdown>
                {factors.map((f) => (
                  <FactorRow key={f.name} name={f.name} score={f.score} summary={f.summary} />
                ))}
              </FactorBreakdown>
            </div>
          )}

          {/* Factor profile detail views — radar / gauges / bar chart */}
          {breakdown && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-[10px] border border-ink-200 bg-ink-0 p-6">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500 mb-3">
                  Factor radar
                </div>
                <FactorRadar breakdown={breakdown} />
              </div>
              <div className="rounded-[10px] border border-ink-200 bg-ink-0 p-6 lg:col-span-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500 mb-3">
                  Factor gauges
                </div>
                <FactorGauges breakdown={breakdown} />
              </div>
              <div className="rounded-[10px] border border-ink-200 bg-ink-0 p-6 lg:col-span-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500 mb-3">
                  Factor scores
                </div>
                <FactorBarChart breakdown={breakdown} />
              </div>
            </div>
          )}

          {/* Fundamental scorecard (5-dim) */}
          {snapshot && (
            <AthenaSnowflake snapshot={snapshot} breakdown={breakdown} dividendYield={null} />
          )}

          {/* Price chart */}
          <div className="rounded-[10px] border border-ink-200 bg-ink-0 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-[var(--font-heading)] text-[14px] font-semibold text-ink-900">
                Price chart
              </h3>
              <div className="inline-flex gap-0.5 bg-ink-50 border border-ink-200 rounded-md p-0.5">
                {["1m", "3m", "6m", "1y"].map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setChartRange(range)}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-medium rounded transition-colors",
                      chartRange === range
                        ? "bg-ink-0 text-ink-900 shadow-e1"
                        : "text-ink-600 hover:text-ink-900",
                    )}
                  >
                    {range.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <PriceChart data={chartData ?? []} height={320} />
          </div>

          {/* Snapshot grid — valuation, margins, performance, quote/volume, indicators */}
          {snapshot && <StockSnapshotSection snapshot={snapshot} />}

          {/* Detailed technical analysis + multi-timeframe performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {snapshot && <TechnicalAnalysis snapshot={snapshot} />}
            {snapshot && <PerformanceChart snapshot={snapshot} />}
          </div>

          {/* Valuation detail — fair value + street consensus */}
          {snapshot && signal && (
            <ValuationSection ticker={ticker} signal={signal} snapshot={snapshot} earnings={earnings} />
          )}
        </div>
      </section>

      {/* 6. Earnings history */}
      {earnings && earnings.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <EarningsHistory earnings={earnings} />
          <div className="rounded-[10px] border border-ink-200 bg-ink-0 p-6">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500 mb-3">
              Earnings trend
            </div>
            <EarningsChart earnings={earnings} />
          </div>
        </div>
      )}

      {/* 7. Ownership */}
      {ownership && <OwnershipStrip data={ownership} />}

      {/* 8. Analyst rating */}
      {analyst && (
        <AnalystRatingCard data={analyst} currentPrice={signal?.currentPrice ?? snapshot?.price} />
      )}

      {/* 9. Related news */}
      {news && news.length > 0 && <RelatedNews items={news} limit={6} />}

      <p className="text-[11px] text-ink-500 italic pt-4">
        Educational content only — not financial advice. Past signal performance does not guarantee future results.
        <Link href="/disclaimer" className="text-forest hover:underline ml-1">
          Full disclaimer →
        </Link>
      </p>
    </div>
  );
}

function thesisTitle(
  thesis: { verdict?: string } | null | undefined,
  signal: { signalType?: string } | null | undefined,
): string {
  if (thesis?.verdict) return thesis.verdict;
  const type = signal?.signalType?.toUpperCase() ?? "";
  if (type === "BUY_TODAY") return "Composite setup above the 7-factor bar.";
  if (type === "AVOID") return "Factors flagging avoid — risks outweigh the setup.";
  return "Setup forming — waiting for confirmation.";
}

function formatVolumeShort(v: number | null | undefined): string | undefined {
  if (v == null) return undefined;
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toString();
}

function ThesisFallback({
  ticker,
  signal,
}: {
  ticker: string;
  signal: { scoreTotal: number; breakdown: { momentumScore: number; trendScore: number; riskScore: number } | null } | null;
}) {
  if (!signal) {
    return <p>Loading Lens&apos;s thesis for {ticker}…</p>;
  }
  const b = signal.breakdown;
  return (
    <>
      <p>
        {ticker} scored <strong>{Math.round(signal.scoreTotal)}/100</strong> on today&apos;s scan
        {b ? (
          <>
            {" "}— with momentum at <strong>{Math.round(b.momentumScore)}</strong>,
            trend at <strong>{Math.round(b.trendScore)}</strong>, and risk at <strong>{Math.round(b.riskScore)}</strong>.
          </>
        ) : (
          "."
        )}
      </p>
      <p className="mt-3">
        The 7-factor breakdown below shows what drove the score. Reference levels give
        a structural view of where the setup activates, invalidates, and targets — the
        decision to act is yours.
      </p>
    </>
  );
}
