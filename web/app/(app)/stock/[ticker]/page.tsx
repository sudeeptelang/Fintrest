"use client";

import { use, useRef, useState } from "react";
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
  useInsiderScore,
} from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { DeepDiveAccordion, DeepDiveRow } from "@/components/ui/deep-dive-accordion";
import { SignalDetailHero } from "@/components/signals/signal-detail-hero";
import { LensCardGated } from "@/components/lens/lens-card";
import { PlainEnglishTakeaways } from "@/components/signals/plain-english-takeaways";
import { TradePlan } from "@/components/signals/trade-plan";
import { FactorBreakdownPanel } from "@/components/signals/factor-breakdown-panel";
import { DrivingToday } from "@/components/signals/driving-today";
import { SmartMoneyBreakdown, type SmartMoneySubSignal } from "@/components/signals/smart-money-breakdown";
import { AnalystRatingCard } from "@/components/signals/analyst-rating-card";
import { RelatedNews } from "@/components/signals/related-news";
import { StockSnapshot as StockSnapshotSection } from "@/components/stock/stock-snapshot";
import { PriceChart } from "@/components/charts/price-chart";
import { AthenaSnowflake } from "@/components/stock/athena-snowflake";
import { TechnicalAnalysis } from "@/components/stock/technical-analysis";
import { ValuationSection } from "@/components/stock/valuation-section";
import { PerformanceChart } from "@/components/charts/performance-chart";
import { EarningsHistory } from "@/components/stock/earnings-history";
import { EarningsChart } from "@/components/charts/earnings-chart";
import { OwnershipStrip } from "@/components/stock/ownership-strip";
import { InsiderActivityCard, CongressActivityCard } from "@/components/stock/ticker-activity-cards";
import type { InsiderScore } from "@/lib/api";
import {
  buildTakeaways,
  buildTradePlanBullets,
  getTradePlanNarrative,
  formatMarketCap,
  fundamentalDecomposition,
} from "@/lib/signal-explainer";

interface StockDetailPageProps {
  params: Promise<{ ticker: string }>;
}

// Unified Ticker Detail page (v2 Forest & Rust).
// Spec: docs/DESIGN_TICKER_DEEP_DIVE.md (2026-04-22 mockups, v2 revision).
//
// Above-the-fold blocks, in order:
//   1. Hero — ticker + price + actions + 8-seg composite ring
//   2. Lens thesis — full prose (gated for Free)
//   3. Trade plan — stop · entry · now · target + R:R + supporting bullets
//   4. 8-factor breakdown — radar + numbered list (Smart $ row clickable)
//   5. Smart Money breakdown — indented drill-down of the 8th factor
//
// Deep Dive accordion (collapsed by default): 7 rows — Price chart · Options
// flow detail · Fundamentals · Valuation & sensitivity · Related news ·
// Macro & regime context · Peer comparison.
export default function StockDetailPage({ params }: StockDetailPageProps) {
  const { ticker: rawTicker } = use(params);
  const ticker = rawTicker.toUpperCase();
  const [chartRange, setChartRange] = useState("3m");
  const [smartMoneyOpen, setSmartMoneyOpen] = useState(true);
  const smartMoneyRef = useRef<HTMLDivElement | null>(null);

  const { data: stock } = useStock(ticker);
  const { data: signalsData } = useStockSignals(ticker);
  const { data: snapshot } = useStockSnapshot(ticker);
  const { data: thesis } = useStockThesis(ticker);
  const { data: analyst } = useStockAnalyst(ticker);
  const { data: news } = useStockNews(ticker);
  const { data: chartData } = useStockChart(ticker, chartRange);
  const { data: earnings } = useStockEarnings(ticker);
  const { data: ownership } = useStockOwnership(ticker);
  const { data: insiderScore } = useInsiderScore(ticker);
  const { data: watchlists } = useWatchlists();
  const addToWatchlist = useAddWatchlistItem();
  const createWatchlist = useCreateWatchlist();
  const [watchlistAdding, setWatchlistAdding] = useState(false);

  const signal = signalsData?.signals?.[0];
  const breakdown = signal?.breakdown;
  const fundDecomp = breakdown ? fundamentalDecomposition(breakdown) : null;

  const entry = signal?.entryLow ?? signal?.currentPrice ?? null;
  const stop = signal?.stopLoss ?? null;
  const target = signal?.targetHigh ?? signal?.targetLow ?? null;
  const hasLevels = entry != null && stop != null && target != null;

  const takeaways = signal ? buildTakeaways({ signal, thesis }) : [];
  const tradePlanBullets = signal ? buildTradePlanBullets({ signal, thesis }) : [];
  const tradePlanNote = signal ? getTradePlanNarrative(signal, thesis) : null;

  // Smart Money sub-signals — §14.9. Phase 1 (insider) is live; phases 2+3
  // (institutional, options, congress, short) still show their honest
  // "pending feed" state until the feeds ship.
  const smartMoneySignals: SmartMoneySubSignal[] = buildPlaceholderSmartMoney().map((row) =>
    row.key === "insider" ? hydrateInsiderRow(row, insiderScore ?? null) : row,
  );
  const smartMoneyComposite = computeSmartMoneyComposite(smartMoneySignals);

  function scrollToSmartMoney() {
    setSmartMoneyOpen(true);
    requestAnimationFrame(() => {
      smartMoneyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

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

      {/* 1. Lens thesis */}
      <LensCardGated
        eyebrow={lensEyebrow(signal)}
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

      {/* 2. Trade plan */}
      {hasLevels && (
        <TradePlan
          entry={entry}
          stop={stop}
          target={target}
          now={signal?.currentPrice ?? snapshot?.price ?? null}
          bullets={tradePlanBullets}
          note={tradePlanNote}
        />
      )}

      {/* 3a. What's driving today — per-factor contribution chips vs. baseline */}
      {breakdown && signal && (
        <DrivingToday breakdown={breakdown} composite={signal.scoreTotal} />
      )}

      {/* 3b. 8-factor breakdown */}
      {breakdown && signal && (
        <FactorBreakdownPanel
          breakdown={breakdown}
          composite={signal.scoreTotal}
          smartMoneyScore={smartMoneyComposite}
          onSmartMoneyClick={scrollToSmartMoney}
        />
      )}

      {/* 4. Smart Money breakdown — indented drill-down of the 8th factor */}
      {smartMoneyOpen && (
        <div ref={smartMoneyRef}>
          <SmartMoneyBreakdown
            composite={smartMoneyComposite}
            subSignals={smartMoneySignals}
            collapsible
            onCollapse={() => setSmartMoneyOpen(false)}
          />
        </div>
      )}

      {/* 5. Key takeaways — in plain English */}
      {takeaways.length > 0 && <PlainEnglishTakeaways items={takeaways} />}

      {/* 6. Deep Dive accordion — 7 rows, collapsed by default */}
      <DeepDiveAccordion>
        <DeepDiveRow
          title="Price chart"
          summary="1D · 5D · 3M · 1Y · volume profile · Polygon real-time"
          family="technical"
        >
          <div>
            <div className="flex items-center justify-end mb-4">
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
        </DeepDiveRow>

        <DeepDiveRow
          title="Options flow detail"
          summary="Chain · unusual activity · skew · IV rank"
          emptyMessage="Options flow feed ships with Smart Money phase 3 — targeted for Q3 2026."
          family="smart"
        />

        <DeepDiveRow
          title="Fundamentals"
          summary={fundamentalsSummary(snapshot, fundDecomp)}
          family="fundamentals"
        >
          <div className="space-y-6">
            {fundDecomp && (
              <div>
                <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-forest-dark mb-3">
                  Fundamentals decomposition
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FundamentalSubscoreCard label="Quality" score={fundDecomp.quality} hint="gross margin + leverage discipline" />
                  <FundamentalSubscoreCard label="Profitability" score={fundDecomp.profitability} hint="ROE + op margin + net margin" />
                  <FundamentalSubscoreCard label="Growth" score={fundDecomp.growth} hint="revenue + EPS year-over-year" />
                </div>
                <p className="mt-3 text-[11px] text-ink-500 italic">
                  Each sub-score is sector-normalized — ranked against peers in the same GICS sector.
                </p>
              </div>
            )}
            {snapshot && (
              <AthenaSnowflake snapshot={snapshot} breakdown={breakdown} dividendYield={null} />
            )}
            {snapshot && <StockSnapshotSection snapshot={snapshot} />}
            {snapshot && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TechnicalAnalysis snapshot={snapshot} />
                <PerformanceChart snapshot={snapshot} />
              </div>
            )}
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
          </div>
        </DeepDiveRow>

        <DeepDiveRow
          title="Valuation & sensitivity"
          summary="Fair value · 5-scenario multiple analysis"
          family="fundamentals"
        >
          {snapshot && signal && (
            <ValuationSection ticker={ticker} signal={signal} snapshot={snapshot} earnings={earnings} />
          )}
        </DeepDiveRow>

        <DeepDiveRow
          title="Related news"
          summary={relatedNewsSummary(news)}
          family="sentiment"
        >
          <div className="space-y-6">
            {news && news.length > 0 && <RelatedNews items={news} limit={6} />}
            {analyst && (
              <AnalystRatingCard data={analyst} currentPrice={signal?.currentPrice ?? snapshot?.price} />
            )}
          </div>
        </DeepDiveRow>

        <DeepDiveRow
          title="Macro & regime context"
          summary="Risk-on · VIX · 10Y · DXY · FRED + Cboe"
          emptyMessage="Macro regime classifier coming with the FMP economic-calendar wire-up — targeted for next sprint."
          family="technical"
        />

        <DeepDiveRow
          title="Peer comparison"
          summary=""
          emptyMessage="Peer list ships with FMP /stock-peers integration — on the Week 3 roadmap."
          family="fundamentals"
        />

        <DeepDiveRow
          title="Insider activity"
          summary="Recent Form 4 filings · cash buys, option exercises, dispositions"
          family="smart"
        >
          <InsiderActivityCard ticker={ticker} />
        </DeepDiveRow>

        <DeepDiveRow
          title="Congressional trades"
          summary="Senate + House disclosures · STOCK Act filings"
          family="sentiment"
        >
          <CongressActivityCard ticker={ticker} />
        </DeepDiveRow>

        {ownership && (
          <DeepDiveRow
            title="Ownership strip"
            summary="Insider + institutional + transaction history"
            family="smart"
          >
            <OwnershipStrip data={ownership} />
          </DeepDiveRow>
        )}
      </DeepDiveAccordion>

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
  if (type === "BUY_TODAY") return "Composite setup above the 8-factor bar.";
  if (type === "AVOID") return "Factors flagging avoid — risks outweigh the setup.";
  return "Setup forming — waiting for confirmation.";
}

// Lens thesis eyebrow — picks up signal type (QA-P1-3).
function lensEyebrow(signal: { signalType?: string } | null | undefined): string {
  const type = signal?.signalType?.toUpperCase() ?? "";
  if (type === "BUY_TODAY" || type === "BUY") return "Lens thesis · Event-driven setup";
  if (type === "WATCH") return "Lens thesis · Setup forming";
  if (type === "AVOID" || type === "HIGH_RISK") return "Lens thesis · Risks elevated";
  return "Lens thesis";
}

// Deep Dive summaries — specific beats generic.
function fundamentalsSummary(
  snapshot: { price?: number | null } | null | undefined,
  fundDecomp: { quality: number | null; profitability: number | null; growth: number | null } | null,
): string {
  if (!snapshot) return "Fundamentals data not yet loaded.";
  if (!fundDecomp) return "Financial health · scorecard pending Q/P/G population";
  const populated = [fundDecomp.quality, fundDecomp.profitability, fundDecomp.growth].filter((v) => v != null).length;
  const prefix =
    fundDecomp.profitability != null && fundDecomp.profitability >= 75
      ? "Financial health strong"
      : fundDecomp.profitability != null && fundDecomp.profitability >= 50
      ? "Financial health solid"
      : "Financial health mixed";
  return `${prefix} · ${populated} of 3 sub-scores populated`;
}

function relatedNewsSummary(
  news:
    | { source?: string | null; sentimentScore?: number | null; contributedToScore?: boolean | null }[]
    | null
    | undefined,
): string {
  if (!news || news.length === 0) return "No recent articles.";
  const sources = Array.from(
    new Set(
      news
        .map((n) => n.source)
        .filter((s): s is string => !!s)
        .slice(0, 3),
    ),
  );
  const contributed = news.filter((n) => n.contributedToScore === true).length;
  // Pre-flag fallback: high-sentiment items are a reasonable proxy for
  // "contributed" until the scoring pipeline writes the flag.
  const contributedFallback =
    contributed === 0
      ? news.filter((n) => n.sentimentScore != null && Math.abs(n.sentimentScore) >= 0.3).length
      : 0;
  const effective = contributed > 0 ? contributed : contributedFallback;

  const parts = [`${news.length} articles`];
  if (effective > 0) parts.push(`${effective} contributed to news score`);
  if (sources.length > 0) parts.push(sources.join(" · "));
  return parts.join(" · ");
}

// Smart Money sub-signals. Phase 1 (insider) is live — the row hydrates
// from GET /market/insider-score/{ticker} in hydrateInsiderRow below.
// Phases 2 (short, institutional, congressional) and Phase 3 (options)
// ship in the FMP_ROADMAP Week 2–3 sequence. Until each lands, the row
// renders a clean empty state with source + ETA — no jargon.
function buildPlaceholderSmartMoney(): SmartMoneySubSignal[] {
  return [
    {
      key: "insider",
      label: "Insider activity",
      weightPct: 35,
      score: null,
      evidence: null,
      source: "SEC EDGAR Form 4 · 1–2 day disclosure lag",
      pendingMessage: "No qualifying insider buys in the last 30 days.",
    },
    {
      key: "short",
      label: "Short dynamics",
      weightPct: 10,
      score: null,
      evidence: null,
      source: "FMP short-interest feed · weekly refresh",
      pendingMessage: "Short interest feed shipping in the next sprint — highest-leverage FMP tier-1 wire-up.",
    },
    {
      key: "institutional",
      label: "Institutional flow",
      weightPct: 25,
      score: null,
      evidence: null,
      source: "SEC 13F via Whale Wisdom · 45-day reporting lag",
      pendingMessage: "13F institutional holdings ingest targeted for Q3 2026 once the audit-log depth matures.",
    },
    {
      key: "congressional",
      label: "Congressional",
      weightPct: 15,
      score: null,
      evidence: null,
      source: "FMP /senate-latest + /house-latest · STOCK Act disclosures",
      pendingMessage: "Per-ticker congress activity card ships with the Smart Money phase 2 rollout.",
    },
    {
      key: "options",
      label: "Options positioning",
      weightPct: 15,
      score: null,
      evidence: null,
      source: "Unusual Whales + Cboe · real-time",
      pendingMessage: "Options flow targeted for Q3 2026 — the paid feed is gated by Pro-tier revenue.",
    },
  ];
}

function computeSmartMoneyComposite(signals: SmartMoneySubSignal[]): number | null {
  const populated = signals.filter((s) => s.score != null);
  if (populated.length === 0) return null;
  const totalWeight = populated.reduce((acc, s) => acc + s.weightPct, 0);
  if (totalWeight === 0) return null;
  const weighted = populated.reduce((acc, s) => acc + (s.score ?? 0) * s.weightPct, 0);
  return weighted / totalWeight;
}

// Swap the pending "insider" row for a live one when the nightly job has
// posted a score. The evidence line assembles the single strongest
// open-market buy + pre-computed history note so the row reads like the
// Lens evidence sentences everywhere else (e.g. "CFO Jane Doe bought
// $2.4M — largest purchase since records begin (2023-05-12)").
function hydrateInsiderRow(row: SmartMoneySubSignal, score: InsiderScore | null): SmartMoneySubSignal {
  if (!score) {
    return { ...row, evidence: null, pendingMessage: "No qualifying insider buying in the last 30 days." };
  }
  const title = score.largestPurchaserTitle ?? "Insider";
  const name = score.largestPurchaserName ?? "an insider";
  const dollars = formatDollarsShort(score.largestPurchaseValue);
  const history = score.largestPurchaserHistoryNote;
  const evidence = dollars
    ? `${title} ${name} bought ${dollars}${history ? ` — ${history}` : ""}.`
    : `${score.clusterCount30d ?? 0} insider(s) bought in the last 30 days${history ? ` — ${history}` : ""}.`;
  return { ...row, score: Number(score.score), evidence };
}

function formatDollarsShort(v: number | null | undefined): string | null {
  if (v == null || v === 0) return null;
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
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
        The 8-factor breakdown below shows what drove the score. Reference levels give
        a structural view of where the setup activates, invalidates, and targets — the
        decision to act is yours.
      </p>
    </>
  );
}

function FundamentalSubscoreCard({
  label,
  score,
  hint,
}: {
  label: string;
  score: number | null;
  hint: string;
}) {
  const tone =
    score == null ? "text-ink-400" :
    score >= 70 ? "text-up" :
    score >= 40 ? "text-ink-900" :
    "text-down";
  return (
    <div className="rounded-[10px] border border-ink-200 bg-ink-0 p-5">
      <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500 mb-2">
        {label}
      </div>
      <div className={cn("font-[var(--font-mono)] text-[28px] font-medium leading-none tracking-[-0.015em]", tone)}>
        {score == null ? "—" : Math.round(score)}
      </div>
      <div className="mt-2 font-[var(--font-sans)] text-[11px] text-ink-500">
        {hint}
      </div>
    </div>
  );
}
