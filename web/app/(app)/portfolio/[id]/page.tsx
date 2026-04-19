"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowUpRight, TrendingUp, TrendingDown, AlertTriangle, Upload, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type Holding, type PortfolioReturnBreakdown, type RiskMetrics, type PortfolioRating, type AdvisorResult, type PerformanceSeries, type PerformancePoint, type PortfolioTaxProfile } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { ScoreRing } from "@/components/charts/score-ring";
import { PortfolioAthenaProfile } from "@/components/portfolio/portfolio-athena-profile";

// Sample holdings for the /portfolio/4 demo. Falls back in when the live portfolio has no
// holdings (empty or error), so the page never renders blank for a demo link. Values are
// calibrated for April 2026: NVDA reflects the June 2024 10:1 split (~$52 cost basis,
// not the pre-split $520), and prices approximate quote levels on the backfill cutoff.
// Synthetic sparkline — smooth 60-point random walk starting from a given base
// and ending near a given multiplier, so it visually matches the holding's
// actual gain/loss. Seeded by ticker so each row renders the same chart on
// re-renders (not cryptographically random, just stable).
function makeSparkline(seed: string, startClose: number, endClose: number): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rnd = () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return (h & 0xffffffff) / 0xffffffff;
  };
  const n = 60;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const drift = startClose + (endClose - startClose) * t;
    const noise = (rnd() - 0.5) * startClose * 0.04;
    out.push(Math.max(0.01, drift + noise));
  }
  out[0] = startClose;
  out[n - 1] = endClose;
  return out;
}

const DEMO_HOLDINGS: Holding[] = [
  { id: 1001, stockId: 1, ticker: "AAPL",  stockName: "Apple Inc.",              quantity: 50,  avgCost: 165.20, currentPrice: 215.40, currentValue: 10770.0, unrealizedPnl: 2510.0,  unrealizedPnlPct: 30.39, signalScore: 74, dayChangePct: 0.85,  fairValue: 228.00, fairValueDiscountPct: 5.85,   priceHistory60d: makeSparkline("AAPL", 195.00, 215.40) },
  { id: 1002, stockId: 2, ticker: "MSFT",  stockName: "Microsoft Corp.",         quantity: 25,  avgCost: 380.50, currentPrice: 455.30, currentValue: 11382.5, unrealizedPnl: 1870.0,  unrealizedPnlPct: 19.66, signalScore: 82, dayChangePct: 1.20,  fairValue: 495.00, fairValueDiscountPct: 8.72,   priceHistory60d: makeSparkline("MSFT", 420.00, 455.30) },
  { id: 1003, stockId: 3, ticker: "NVDA",  stockName: "NVIDIA Corp.",            quantity: 300, avgCost: 52.00,  currentPrice: 142.60, currentValue: 42780.0, unrealizedPnl: 27180.0, unrealizedPnlPct: 174.23, signalScore: 89, dayChangePct: 2.40, fairValue: 165.00, fairValueDiscountPct: 15.71,  priceHistory60d: makeSparkline("NVDA", 118.00, 142.60) },
  { id: 1004, stockId: 4, ticker: "GOOGL", stockName: "Alphabet Inc. Class A",   quantity: 20,  avgCost: 138.80, currentPrice: 178.20, currentValue: 3564.0,  unrealizedPnl: 788.0,   unrealizedPnlPct: 28.39, signalScore: 68, dayChangePct: -0.25, fairValue: 195.00, fairValueDiscountPct: 9.43,   priceHistory60d: makeSparkline("GOOGL", 165.00, 178.20) },
  { id: 1005, stockId: 5, ticker: "AMZN",  stockName: "Amazon.com Inc.",         quantity: 15,  avgCost: 142.50, currentPrice: 205.90, currentValue: 3088.5,  unrealizedPnl: 951.0,   unrealizedPnlPct: 44.49, signalScore: 76, dayChangePct: 1.50,  fairValue: 235.00, fairValueDiscountPct: 14.13,  priceHistory60d: makeSparkline("AMZN", 185.00, 205.90) },
  { id: 1006, stockId: 6, ticker: "META",  stockName: "Meta Platforms Inc.",     quantity: 12,  avgCost: 420.00, currentPrice: 575.10, currentValue: 6901.2,  unrealizedPnl: 1861.2,  unrealizedPnlPct: 36.93, signalScore: 80, dayChangePct: 0.95,  fairValue: 610.00, fairValueDiscountPct: 6.07,   priceHistory60d: makeSparkline("META", 530.00, 575.10) },
  { id: 1007, stockId: 7, ticker: "TSLA",  stockName: "Tesla Inc.",              quantity: 20,  avgCost: 280.00, currentPrice: 234.50, currentValue: 4690.0,  unrealizedPnl: -910.0,  unrealizedPnlPct: -16.25, signalScore: 46, dayChangePct: -1.80, fairValue: 210.00, fairValueDiscountPct: -10.45, priceHistory60d: makeSparkline("TSLA", 265.00, 234.50) },
  { id: 1008, stockId: 8, ticker: "JPM",   stockName: "JPMorgan Chase & Co.",    quantity: 25,  avgCost: 175.40, currentPrice: 238.80, currentValue: 5970.0,  unrealizedPnl: 1585.0,  unrealizedPnlPct: 36.15, signalScore: 72, dayChangePct: 0.35,  fairValue: 252.00, fairValueDiscountPct: 5.53,   priceHistory60d: makeSparkline("JPM", 220.00, 238.80) },
];

// Sample rating / returns / risk so /portfolio/4 showcases every new card the
// real page has. Numbers consistent with DEMO_HOLDINGS: ~$89k portfolio value,
// ~$35k unrealized PnL, ~67% return — roughly what a 3yr Mag7-tilted book looks
// like after the AI rally.
const DEMO_RATING: PortfolioRating = {
  overall: "A",
  overallScore: 80,
  categories: {
    Momentum:    { grade: "A", score: 86, label: "Strong" },
    Volume:      { grade: "B", score: 72, label: "Good" },
    Catalyst:    { grade: "B", score: 68, label: "Good" },
    Fundamental: { grade: "A", score: 84, label: "Strong" },
    Sentiment:   { grade: "A", score: 82, label: "Strong" },
    Trend:       { grade: "A", score: 85, label: "Strong" },
    Risk:        { grade: "C", score: 58, label: "Mixed" },
  },
  strengths: ["Momentum", "Fundamental", "Sentiment", "Trend"],
  watchouts: [],
  coverage: 8,
};

const DEMO_RETURNS: PortfolioReturnBreakdown = {
  costBasis: 53311,
  currentValue: 89146.2,
  unrealizedPnl: 35835.2,
  realizedPnl: 0,
  dividendsReceived: 1240,
  totalReturn: 37075.2,
  totalReturnPct: 69.54,
  annualizedReturnPct: 19.3,
  inceptionDate: new Date(Date.now() - 3 * 365 * 86400 * 1000).toISOString(),
  daysSinceInception: 3 * 365,
  benchmarkReturnPct: 41.8,
  alphaPct: 27.74,
};

const DEMO_RISK: RiskMetrics = {
  date: new Date().toISOString(),
  sharpeRatio: 1.42,
  sortinoRatio: 1.98,
  maxDrawdown: 0.186,
  beta: 1.24,
  var95: -0.021,
  volatility: 0.214,
  totalReturn: 0.695,
};

// Tax profile demo numbers. The split mirrors DEMO_HOLDINGS — most gains sit
// in LT territory (3 years in) with TSLA as the harvest candidate and a
// near-LT AMZN lot included to show the color story on all three panels.
const DEMO_TAX: PortfolioTaxProfile = {
  shortTermUnrealizedPnl: 2510,
  longTermUnrealizedPnl:  33325,
  shortTermRealizedPnlYtd: 0,
  longTermRealizedPnlYtd:  1240,
  nearLongTerm: [
    { ticker: "AMZN", quantity: 5, unrealizedPnl: 317, daysUntilLongTerm: 28 },
  ],
  taxLossHarvest: [
    { ticker: "TSLA", quantity: 20, unrealizedPnl: -910, daysHeld: 540, holdingType: "long" },
  ],
};

interface PortfolioDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function PortfolioDetailPage({ params }: PortfolioDetailPageProps) {
  const { id } = use(params);
  const portfolioId = parseInt(id);

  // Portfolio 4 is the reserved demo slot — always renders hardcoded sample holdings
  // with no backend calls. Guarantees a clean, populated page for demo / marketing links
  // regardless of DB state, Athena advisor errors, or Fly backend availability.
  const usingDemoData = portfolioId === 4;

  const { data: holdingsRaw, isLoading: holdingsLoading } = useQuery({
    queryKey: ["portfolio-holdings", portfolioId],
    queryFn: () => api.portfolioHoldings(portfolioId),
    retry: 1,
    throwOnError: false,
    enabled: !usingDemoData,
  });

  const holdings = usingDemoData ? DEMO_HOLDINGS : holdingsRaw;

  // Analytics + advisor are enrichment — skipped entirely for the demo portfolio. For
  // real portfolios, failures (Athena thesis bug, missing risk metrics) degrade gracefully
  // without crashing the page.
  const { data: analytics } = useQuery({
    queryKey: ["portfolio-analytics", portfolioId],
    queryFn: () => api.portfolioAnalytics(portfolioId),
    retry: false,
    throwOnError: false,
    enabled: !usingDemoData,
  });

  const { data: advisorData, isError: advisorErrored } = useQuery({
    queryKey: ["portfolio-advisor", portfolioId],
    queryFn: () => api.portfolioAdvisor(portfolioId),
    retry: false,
    throwOnError: false,
    enabled: !usingDemoData,
  });

  // Return breakdown — pillar #1 of the 10-pillar spec. Powers the header KPIs:
  // total return (split into unrealized + realized + dividends) and annualized CAGR.
  const { data: returns } = useQuery({
    queryKey: ["portfolio-returns", portfolioId],
    queryFn: () => api.portfolioReturns(portfolioId),
    retry: false,
    throwOnError: false,
    enabled: !usingDemoData,
  });

  // Letter-grade rating. Separate endpoint because it piggybacks on the advisor
  // compute (which is slow) and we don't want to block the page on it — renders
  // as soon as ready, degrades to skeleton if it fails.
  const { data: rating } = useQuery({
    queryKey: ["portfolio-rating", portfolioId],
    queryFn: () => api.portfolioRating(portfolioId),
    retry: false,
    throwOnError: false,
    enabled: !usingDemoData,
  });

  // Performance-vs-market time series. Range is user-selectable; query refetches
  // automatically when it changes.
  const [perfRange, setPerfRange] = useState<"1m" | "3m" | "6m" | "1y" | "ytd" | "all">("3m");
  const { data: performance } = useQuery({
    queryKey: ["portfolio-performance", portfolioId, perfRange],
    queryFn: () => api.portfolioPerformance(portfolioId, perfRange),
    retry: false,
    throwOnError: false,
    enabled: !usingDemoData,
  });

  // Tax profile (pillar #10). ST vs LT split + harvest + near-LT flags.
  const { data: taxProfile } = useQuery({
    queryKey: ["portfolio-tax", portfolioId],
    queryFn: () => api.portfolioTax(portfolioId),
    retry: false,
    throwOnError: false,
    enabled: !usingDemoData,
  });

  // Tab state — Holdings / Returns / Narratives. Holdings is default since
  // that's the operational view; Returns is the analysis; Narratives surfaces
  // advisor text + Lens AI write-ups.
  type PortfolioTab = "holdings" | "returns" | "narratives";
  const [activeTab, setActiveTab] = useState<PortfolioTab>("holdings");

  // Unify demo + live sources so the rest of the render branches on one variable.
  const activeReturns     = usingDemoData ? DEMO_RETURNS      : returns;
  const activeRating      = usingDemoData ? DEMO_RATING       : rating;
  const activeRisk        = usingDemoData ? DEMO_RISK         : analytics?.riskMetrics;
  const activePerformance = usingDemoData ? makeDemoPerformance(perfRange) : performance;
  const activeTax         = usingDemoData ? DEMO_TAX          : taxProfile;

  // Sortable holdings
  type HoldingSortKey = "ticker" | "shares" | "avgCost" | "price" | "fairValue" | "dayChange" | "value" | "pnl" | "signal";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<HoldingSortKey>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sortedHoldings = useMemo(() => {
    if (!holdings) return [];
    return [...holdings].sort((a, b) => {
      let diff = 0;
      switch (sortKey) {
        case "ticker": diff = a.ticker.localeCompare(b.ticker); break;
        case "shares": diff = a.quantity - b.quantity; break;
        case "avgCost": diff = a.avgCost - b.avgCost; break;
        case "price": diff = a.currentPrice - b.currentPrice; break;
        case "fairValue": diff = (a.fairValueDiscountPct ?? -Infinity) - (b.fairValueDiscountPct ?? -Infinity); break;
        case "dayChange": diff = (a.dayChangePct ?? 0) - (b.dayChangePct ?? 0); break;
        case "value": diff = a.currentValue - b.currentValue; break;
        case "pnl": diff = a.unrealizedPnlPct - b.unrealizedPnlPct; break;
        case "signal": diff = (a.signalScore ?? 0) - (b.signalScore ?? 0); break;
      }
      return sortDir === "asc" ? diff : -diff;
    });
  }, [holdings, sortKey, sortDir]);

  function handleSort(key: HoldingSortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "ticker" ? "asc" : "desc"); }
  }

  function SortIcon({ k }: { k: HoldingSortKey }) {
    if (sortKey !== k) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/40 inline ml-0.5" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-primary inline ml-0.5" />
      : <ChevronDown className="h-3 w-3 text-primary inline ml-0.5" />;
  }

  const totalValue = holdings?.reduce((sum, h) => sum + h.currentValue, 0) ?? 0;
  const totalPnl = holdings?.reduce((sum, h) => sum + h.unrealizedPnl, 0) ?? 0;
  const totalCost = holdings?.reduce((sum, h) => sum + h.quantity * h.avgCost, 0) ?? 0;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold">
            Portfolio{usingDemoData && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-primary/10 text-primary align-middle">Sample</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {usingDemoData
              ? "Demo portfolio — upload your own to see personalized analysis."
              : `${holdings?.length ?? 0} holdings`}
          </p>
        </div>
        <Link href="/portfolio/upload">
          <Button variant="outline" size="sm"><Upload className="h-3.5 w-3.5 mr-1.5" /> Upload / Import</Button>
        </Link>
      </div>

      {/* SimplyWall.st-style 6-card KPI strip. Each card shows $ + % in the
          same footprint so the whole header tells the full lifetime story at
          a glance. Falls back to "—" on cards we can't fill for a new
          portfolio (e.g. no SPY alpha until 7 days of history). */}
      <PortfolioKpiStrip
        totalValue={totalValue}
        holdingsCount={holdings?.length ?? 0}
        returns={activeReturns}
        advisorData={advisorData}
      />

      {/* Tabs: Holdings / Returns / Narratives */}
      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px">
          {([
            ["holdings",   "Holdings"],
            ["returns",    "Returns"],
            ["narratives", "Narratives"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* --- Returns tab: analysis cards --- */}
      {activeTab === "returns" && (
        <div className="space-y-6">
          {activePerformance && activePerformance.points.length >= 2 && (
            <PerformanceChart
              data={activePerformance}
              range={perfRange}
              onRangeChange={setPerfRange}
            />
          )}
          {activeRating && activeRating.coverage > 0 && (
            <PortfolioRatingCard rating={activeRating} />
          )}
          {activeReturns && activeReturns.costBasis > 0 && (
            <ReturnBreakdownCard data={activeReturns} />
          )}
          {activeRisk && <RiskMetricsCard metrics={activeRisk} />}
          {activeTax && <TaxProfileCard tax={activeTax} />}
          {!advisorErrored && advisorData && (
            <PortfolioAthenaProfile advisor={advisorData} />
          )}
          {!activePerformance && !activeRating && !activeReturns && !activeRisk && !advisorData && (
            <EmptyTabState
              title="No analysis yet"
              body="Analysis populates once the daily scan runs against your holdings. Check back after 6:30 AM ET."
            />
          )}
        </div>
      )}

      {/* --- Narratives tab: advisor recommendations + AI analysis --- */}
      {activeTab === "narratives" && (
        <NarrativesPanel
          advisorData={advisorData}
          advisorErrored={advisorErrored}
          usingDemoData={usingDemoData}
        />
      )}

      {/* --- Holdings tab --- */}
      {activeTab === "holdings" && (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-[var(--font-heading)] text-lg font-semibold">Holdings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {([
                  ["Stock", "ticker", "text-left"],
                  ["Shares", "shares", "text-right"],
                  ["Avg Cost", "avgCost", "text-right"],
                  ["Price", "price", "text-right"],
                  ["Fair Value", "fairValue", "text-right"],
                  ["% Today", "dayChange", "text-right"],
                  ["Value", "value", "text-right"],
                  ["Gain/Loss $", "pnl", "text-right"],
                  ["Return %", "pnl", "text-right"],
                  ["Signal", "signal", "text-center"],
                ] as const).map(([label, key, alignClass], i) => {
                  const active = sortKey === key;
                  return (
                    <th
                      key={`${key}-${i}`}
                      className={`${alignClass} px-5 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors ${
                        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => handleSort(key)}
                      title="Click to sort"
                    >
                      <span className="inline-flex items-center gap-0.5">
                        {label}
                        <SortIcon k={key} />
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {holdingsLoading ? (
                <tr><td colSpan={10} className="px-5 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : sortedHoldings.length === 0 ? (
                <tr><td colSpan={10} className="px-5 py-8 text-center text-muted-foreground">No holdings</td></tr>
              ) : sortedHoldings.map((h) => {
                const costBasis = h.quantity * h.avgCost;
                return (
                  <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/stock/${h.ticker}`} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="font-[var(--font-mono)] text-[10px] font-bold text-primary">{h.ticker.slice(0, 2)}</span>
                        </div>
                        <div>
                          <p className="font-semibold font-[var(--font-mono)]">{h.ticker}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[120px]">{h.stockName}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-right font-[var(--font-mono)]">{h.quantity}</td>
                    <td className="px-5 py-3.5 text-right font-[var(--font-mono)] text-muted-foreground">${h.avgCost.toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <MiniSparkline data={h.priceHistory60d} />
                        <span className="font-[var(--font-mono)]">${h.currentPrice.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-[var(--font-mono)]">
                      {h.fairValue == null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <>
                          <p>${h.fairValue.toFixed(2)}</p>
                          {h.fairValueDiscountPct != null && (
                            <p className={`text-[10px] font-semibold ${
                              h.fairValueDiscountPct >= 15 ? "text-emerald-500"
                                : h.fairValueDiscountPct >= 0 ? "text-emerald-400"
                                : h.fairValueDiscountPct >= -10 ? "text-amber-500"
                                : "text-red-500"
                            }`}>
                              {h.fairValueDiscountPct >= 0 ? "+" : ""}{h.fairValueDiscountPct.toFixed(1)}%
                            </p>
                          )}
                        </>
                      )}
                    </td>
                    <td className={`px-5 py-3.5 text-right font-[var(--font-mono)] font-semibold ${
                      h.dayChangePct === null
                        ? "text-muted-foreground"
                        : h.dayChangePct >= 0 ? "text-emerald-500" : "text-red-500"
                    }`}>
                      {h.dayChangePct === null
                        ? "—"
                        : `${h.dayChangePct >= 0 ? "+" : ""}${h.dayChangePct.toFixed(2)}%`}
                    </td>
                    <td className="px-5 py-3.5 text-right font-[var(--font-mono)]">
                      <p>${h.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      <p className="text-[10px] text-muted-foreground">cost ${costBasis.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </td>
                    <td className={`px-5 py-3.5 text-right font-[var(--font-mono)] font-semibold ${h.unrealizedPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {h.unrealizedPnl >= 0 ? "+$" : "-$"}{Math.abs(h.unrealizedPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className={`px-5 py-3.5 text-right font-[var(--font-mono)] font-semibold ${h.unrealizedPnlPct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {h.unrealizedPnlPct >= 0 ? "+" : ""}{h.unrealizedPnlPct.toFixed(1)}%
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {h.signalScore != null ? (
                        <span className="font-[var(--font-mono)] text-xs font-bold">{Math.round(h.signalScore)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}

/**
 * 6-card KPI strip that sits under the page title. Compact per-card footprint
 * (label top, big number middle, secondary metric small underneath) so the
 * full return story fits at a glance on one row. Cards gracefully fall back
 * to "—" when data is missing (new portfolio, short history, no SPY bars).
 */
function PortfolioKpiStrip({
  totalValue,
  holdingsCount,
  returns,
  advisorData,
}: {
  totalValue: number;
  holdingsCount: number;
  returns: PortfolioReturnBreakdown | null | undefined;
  advisorData: AdvisorResult | null | undefined;
}) {
  const fmt$ = (n: number, sign = true) => {
    const s = n >= 0 ? (sign ? "+" : "") : "−";
    return `${s}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };
  const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

  const unrealizedPct = returns && returns.costBasis > 0
    ? (returns.unrealizedPnl / returns.costBasis) * 100
    : null;
  const realizedPct = returns && returns.costBasis > 0
    ? (returns.realizedPnl / returns.costBasis) * 100
    : null;
  const divYieldPct = returns && returns.costBasis > 0
    ? (returns.dividendsReceived / returns.costBasis) * 100
    : null;

  const cards: Array<{
    label: string;
    value: string;
    sub?: string;
    tone?: "pos" | "neg" | "neutral" | "primary";
  }> = [
    {
      label: "Total Value",
      value: `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      sub: `${holdingsCount} ${holdingsCount === 1 ? "holding" : "holdings"}`,
      tone: "neutral",
    },
    {
      label: "Total Return",
      value: returns ? fmtPct(returns.totalReturnPct) : "—",
      sub: returns?.annualizedReturnPct != null
        ? `${fmtPct(returns.annualizedReturnPct)} CAGR`
        : "awaiting 30d",
      tone: returns ? (returns.totalReturnPct >= 0 ? "pos" : "neg") : "neutral",
    },
    {
      label: "Unrealized",
      value: returns ? fmt$(returns.unrealizedPnl) : "—",
      sub: unrealizedPct != null ? fmtPct(unrealizedPct) : undefined,
      tone: returns ? (returns.unrealizedPnl >= 0 ? "pos" : "neg") : "neutral",
    },
    {
      label: "Realized",
      value: returns ? fmt$(returns.realizedPnl) : "—",
      sub: realizedPct != null ? fmtPct(realizedPct) : undefined,
      tone: returns ? (returns.realizedPnl >= 0 ? "pos" : "neg") : "neutral",
    },
    {
      label: "Dividends",
      value: returns ? `$${returns.dividendsReceived.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—",
      sub: divYieldPct != null ? `${divYieldPct.toFixed(1)}% yield` : undefined,
      tone: "neutral",
    },
    {
      label: "Alpha vs SPY",
      value: returns?.alphaPct != null ? fmtPct(returns.alphaPct) : "—",
      sub: returns?.benchmarkReturnPct != null
        ? `SPY ${fmtPct(returns.benchmarkReturnPct)}`
        : "awaiting history",
      tone: returns?.alphaPct != null
        ? (returns.alphaPct >= 0 ? "primary" : "neg")
        : "neutral",
    },
  ];

  // Silence lint: advisorData available for future "alerts" pill but not used
  // on every card — intentional, keeping the hook for when we add "Alerts" card.
  void advisorData;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => {
        const valueColor =
          c.tone === "pos"     ? "text-emerald-500" :
          c.tone === "neg"     ? "text-red-500"     :
          c.tone === "primary" ? "text-primary"     :
                                 "text-foreground";
        return (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{c.label}</p>
            <p className={`font-[var(--font-mono)] text-xl font-bold mt-1 ${valueColor}`}>
              {c.value}
            </p>
            {c.sub && <p className="text-[11px] text-muted-foreground mt-1">{c.sub}</p>}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Performance-vs-market line chart. Portfolio line + SPY line both indexed to
 * 100 at t0, which makes their relative growth directly comparable — the chart
 * users see on SimplyWall.st, Morningstar, etc. Timeframe toggle chips sit in
 * the card header (1M / 3M / 6M / YTD / 1Y / All).
 */
function PerformanceChart({
  data,
  range,
  onRangeChange,
}: {
  data: PerformanceSeries;
  range: string;
  onRangeChange: (r: "1m" | "3m" | "6m" | "1y" | "ytd" | "all") => void;
}) {
  const chartData = data.points.map((p) => ({
    date: p.date,
    portfolio: p.portfolioIndex,
    benchmark: p.benchmarkIndex,
  }));

  const portfolioFinal = data.finalPortfolioReturnPct;
  const benchmarkFinal = data.finalBenchmarkReturnPct;
  const alphaFinal = data.finalAlphaPct;

  const fmtPct = (n: number | null | undefined) =>
    n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

  const ranges: Array<{ key: "1m" | "3m" | "6m" | "1y" | "ytd" | "all"; label: string }> = [
    { key: "1m",  label: "1M" },
    { key: "3m",  label: "3M" },
    { key: "6m",  label: "6M" },
    { key: "ytd", label: "YTD" },
    { key: "1y",  label: "1Y" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h3 className="font-[var(--font-heading)] text-base font-semibold">
            Performance vs market
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Portfolio indexed to 100 alongside {data.benchmark} over the same window
          </p>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => onRangeChange(r.key)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
                range === r.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Final return summary row — mirrors the chart legend so the value is
          readable without hovering. */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border border-border bg-background/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Portfolio</p>
          <p className={`font-[var(--font-mono)] text-base font-semibold ${
            portfolioFinal == null ? "text-foreground"
            : portfolioFinal >= 0 ? "text-emerald-500" : "text-red-500"
          }`}>
            {fmtPct(portfolioFinal)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{data.benchmark}</p>
          <p className={`font-[var(--font-mono)] text-base font-semibold ${
            benchmarkFinal == null ? "text-foreground"
            : benchmarkFinal >= 0 ? "text-foreground" : "text-red-500"
          }`}>
            {fmtPct(benchmarkFinal)}
          </p>
        </div>
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-primary/80">Alpha</p>
          <p className={`font-[var(--font-mono)] text-base font-semibold ${
            alphaFinal == null ? "text-foreground"
            : alphaFinal >= 0 ? "text-emerald-500" : "text-red-500"
          }`}>
            {fmtPct(alphaFinal)}
          </p>
        </div>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid stroke="rgba(0,0,0,.06)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }}
              tickFormatter={(d: string) =>
                new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              }
              minTickGap={48}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }}
              width={36}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid rgba(0,0,0,.1)",
                background: "rgba(255,255,255,.98)",
              }}
              labelFormatter={(label) => {
                if (typeof label !== "string") return "";
                return new Date(label).toLocaleDateString("en-US", {
                  year: "numeric", month: "short", day: "numeric",
                });
              }}
              formatter={(value, name) => {
                const n = typeof value === "number" ? value : Number(value);
                const pretty = `${n.toFixed(2)} (${(n - 100).toFixed(2)}%)`;
                const label = name === "portfolio" ? "Portfolio" : data.benchmark;
                return [pretty, label];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              formatter={(v) => (v === "portfolio" ? "Portfolio" : data.benchmark)}
            />
            <Line
              type="monotone"
              dataKey="portfolio"
              stroke="rgb(16 185 129)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="benchmark"
              stroke="rgb(107 98 89)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Synthetic performance series for /portfolio/4. Portfolio ends +68% at
 *  current value (matches DEMO_RETURNS); SPY ends +42% (matches DEMO_RETURNS.
 *  benchmarkReturnPct). Both are smooth random walks to that endpoint. */
function makeDemoPerformance(range: string): PerformanceSeries {
  const days = range === "1m" ? 22
    : range === "3m" ? 66
    : range === "6m" ? 130
    : range === "1y" ? 260
    : range === "ytd" ? 80
    : 780; // "all" ≈ 3y
  const targetP = 100 * (1 + 0.695);       // portfolio ends near 169.5
  const targetB = 100 * (1 + 0.418);       // SPY ends near 141.8

  let hP = 0xdeadbeef, hB = 0xbeeffeed;
  const rnd = (state: number) => {
    const s = (state * 1664525 + 1013904223) >>> 0;
    return { n: s, v: (s & 0xffffffff) / 0xffffffff };
  };

  const points = [] as PerformancePoint[];
  for (let i = 0; i < days; i++) {
    const t = i / (days - 1);
    const baseP = 100 + (targetP - 100) * t;
    const baseB = 100 + (targetB - 100) * t;

    const rpP = rnd(hP); hP = rpP.n;
    const rpB = rnd(hB); hB = rpB.n;
    const noiseP = (rpP.v - 0.5) * 3.5;
    const noiseB = (rpB.v - 0.5) * 1.8;

    const p = Math.max(50, baseP + noiseP);
    const b = Math.max(50, baseB + noiseB);

    const date = new Date(Date.now() - (days - 1 - i) * 86400000);
    points.push({
      date:               date.toISOString(),
      portfolioIndex:     p,
      benchmarkIndex:     b,
      portfolioReturnPct: p - 100,
      benchmarkReturnPct: b - 100,
    });
  }
  if (points.length > 0) {
    points[0] = { ...points[0], portfolioIndex: 100, benchmarkIndex: 100, portfolioReturnPct: 0, benchmarkReturnPct: 0 };
    const last = points[points.length - 1];
    points[points.length - 1] = {
      ...last,
      portfolioIndex:     targetP,
      benchmarkIndex:     targetB,
      portfolioReturnPct: targetP - 100,
      benchmarkReturnPct: targetB - 100,
    };
  }
  return {
    benchmark: "SPY",
    range,
    points,
    finalPortfolioReturnPct: targetP - 100,
    finalBenchmarkReturnPct: targetB - 100,
    finalAlphaPct:           (targetP - 100) - (targetB - 100),
  };
}

/**
 * Narratives tab content. Shows the Lens thesis write-ups, advisor
 * recommendations, and alerts together — the "why things look the way they
 * look" narrative layer on top of the Returns tab's numbers.
 */
function NarrativesPanel({
  advisorData,
  advisorErrored,
  usingDemoData,
}: {
  advisorData: AdvisorResult | null | undefined;
  advisorErrored: boolean;
  usingDemoData: boolean;
}) {
  const recs = advisorData?.recommendations ?? [];
  const alerts = advisorData?.alerts ?? [];

  if (usingDemoData) {
    return (
      <EmptyTabState
        title="Narratives are a live-portfolio feature"
        body="Upload your own portfolio to see Lens's research on each holding + rebalance guidance."
      />
    );
  }

  if (advisorErrored && recs.length === 0 && alerts.length === 0) {
    return (
      <EmptyTabState
        title="Narrative write-ups not available"
        body="The advisor run didn't complete for this portfolio. Try again after the next scan."
      />
    );
  }

  if (recs.length === 0 && alerts.length === 0) {
    return (
      <EmptyTabState
        title="No narratives yet"
        body="Lens generates a narrative for each holding after the daily scan. Check back after 6:30 AM ET."
      />
    );
  }

  return (
    <div className="space-y-4">
      {alerts.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold text-sm">Alerts</h3>
          </div>
          <ul className="space-y-2 text-sm">
            {alerts.map((a, i) => (
              <li key={i} className="text-foreground/80 leading-relaxed">• {a}</li>
            ))}
          </ul>
        </div>
      )}

      {recs.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-sm mb-4">Recommendations</h3>
          <div className="space-y-3">
            {recs.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-background/50 p-3">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    {r.type}
                  </span>
                  {r.ticker && (
                    <span className="font-[var(--font-mono)] text-xs font-semibold">
                      {r.ticker}
                    </span>
                  )}
                  <span className="text-xs font-medium text-foreground/75">{r.action}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {Math.round(r.confidence * 100)}% confidence
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{r.reasoning}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Tax profile card (pillar #10). A 2×2 grid splits the return into its four
 * tax buckets — ST/LT realized (YTD) and ST/LT unrealized — because the tax
 * rate differs materially between them. Two action lists below: lots near
 * the 1-year line (hold for lower tax), and underwater lots eligible for
 * harvesting a deductible loss. Empty-state copy when nothing is flagged.
 */
function TaxProfileCard({ tax }: { tax: PortfolioTaxProfile }) {
  const fmt$ = (n: number) => {
    const sign = n > 0 ? "+" : n < 0 ? "−" : "";
    return `${sign}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };
  const tone = (n: number) =>
    n > 0 ? "text-emerald-500" : n < 0 ? "text-red-500" : "text-foreground";

  const cells: Array<{ label: string; value: number; hint: string }> = [
    {
      label: "Short-term unrealized",
      value: tax.shortTermUnrealizedPnl,
      hint: "Would be taxed as ordinary income if sold today",
    },
    {
      label: "Long-term unrealized",
      value: tax.longTermUnrealizedPnl,
      hint: "Held > 1 year · qualifies for lower capital-gains rate",
    },
    {
      label: "Short-term realized (YTD)",
      value: tax.shortTermRealizedPnlYtd,
      hint: "Already booked this year at ordinary income rate",
    },
    {
      label: "Long-term realized (YTD)",
      value: tax.longTermRealizedPnlYtd,
      hint: "Already booked this year at long-term rate",
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h3 className="font-[var(--font-heading)] text-base font-semibold">Tax profile</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Short-term vs long-term breakdown · FIFO lot matching · not tax advice
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cells.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-background/50 p-3.5">
            <p className="text-[11px] text-muted-foreground">{c.label}</p>
            <p className={`font-[var(--font-mono)] text-xl font-semibold mt-1 ${tone(c.value)}`}>
              {fmt$(c.value)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{c.hint}</p>
          </div>
        ))}
      </div>

      {/* Near-long-term lots — holding action, not selling action */}
      {tax.nearLongTerm.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-widest text-teal-500 mb-2">
            Crossing to long-term soon
          </p>
          <div className="space-y-1.5">
            {tax.nearLongTerm.map((lot) => (
              <div
                key={`${lot.ticker}-${lot.daysUntilLongTerm}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-teal-500/20 bg-teal-500/5 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-[var(--font-mono)] font-semibold">{lot.ticker}</span>
                  <span className="text-xs text-muted-foreground">
                    {lot.quantity} sh · gain {fmt$(lot.unrealizedPnl)}
                  </span>
                </div>
                <span className="text-xs font-medium text-teal-500">
                  {lot.daysUntilLongTerm}d to LT
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Harvest candidates — action list */}
      {tax.taxLossHarvest.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-widest text-amber-500 mb-2">
            Tax-loss harvest candidates
          </p>
          <div className="space-y-1.5">
            {tax.taxLossHarvest.map((lot) => (
              <div
                key={`${lot.ticker}-${lot.daysHeld}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-[var(--font-mono)] font-semibold">{lot.ticker}</span>
                  <span className="text-xs text-muted-foreground">
                    {lot.quantity} sh · {lot.daysHeld}d held · {lot.holdingType === "long" ? "LT" : "ST"}
                  </span>
                </div>
                <span className="text-xs font-semibold text-red-500 font-[var(--font-mono)]">
                  {fmt$(lot.unrealizedPnl)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tax.nearLongTerm.length === 0 && tax.taxLossHarvest.length === 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          No lots flagged. Check back during the year — conversions and
          harvest candidates surface as the window and market move.
        </p>
      )}

      <p className="mt-4 pt-3 border-t border-border text-[10px] text-muted-foreground">
        Estimate only · FIFO lot matching, 1-year threshold · does not account
        for wash-sale rules, state tax, or AMT · not tax advice.
      </p>
    </div>
  );
}

function EmptyTabState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{body}</p>
    </div>
  );
}

/**
 * Total-return decomposition card. Shows the three sources of a portfolio's
 * lifetime return side-by-side (price appreciation / realized gains / dividends)
 * plus annualized CAGR so large absolute returns are contextualized by time held.
 */
function ReturnBreakdownCard({ data }: { data: PortfolioReturnBreakdown }) {
  const fmt$ = (n: number) => {
    const sign = n >= 0 ? "+" : "−";
    return `${sign}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };
  const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

  // Horizontal proportional bar — widths derived from absolute contribution so
  // the reader sees at a glance which source drove the total.
  const components = [
    { label: "Unrealized", value: data.unrealizedPnl, color: "bg-emerald-500" },
    { label: "Realized",   value: data.realizedPnl,   color: "bg-blue-500" },
    { label: "Dividends",  value: data.dividendsReceived, color: "bg-amber-500" },
  ];
  const absTotal = components.reduce((s, c) => s + Math.abs(c.value), 0);

  const inception = data.inceptionDate
    ? new Date(data.inceptionDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h3 className="font-[var(--font-heading)] text-base font-semibold">Return breakdown</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Lifetime return split across its three sources
            {inception && ` · since ${inception}`}
          </p>
        </div>
        <div className="flex items-baseline gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total return</p>
            <p className={`font-[var(--font-mono)] text-xl font-bold ${data.totalReturn >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {fmt$(data.totalReturn)}
            </p>
            <p className={`text-xs font-medium ${data.totalReturnPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {fmtPct(data.totalReturnPct)}
            </p>
          </div>
          {data.annualizedReturnPct != null && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Annualized</p>
              <p className={`font-[var(--font-mono)] text-xl font-bold ${data.annualizedReturnPct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {fmtPct(data.annualizedReturnPct)}
              </p>
              <p className="text-xs text-muted-foreground">CAGR · {(data.daysSinceInception / 365.25).toFixed(1)}y</p>
            </div>
          )}
        </div>
      </div>

      {/* Proportional contribution bar */}
      {absTotal > 0 && (
        <div className="mb-4">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
            {components.map((c) => {
              const width = (Math.abs(c.value) / absTotal) * 100;
              if (width < 0.5) return null;
              return (
                <div
                  key={c.label}
                  className={c.color}
                  style={{ width: `${width}%` }}
                  title={`${c.label}: ${fmt$(c.value)}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Three component cards */}
      <div className="grid grid-cols-3 gap-3">
        {components.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-background/50 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`h-2 w-2 rounded-full ${c.color}`} />
              <p className="text-[11px] text-muted-foreground">{c.label}</p>
            </div>
            <p className={`font-[var(--font-mono)] text-base font-semibold ${c.value >= 0 ? "text-foreground" : "text-red-500"}`}>
              {fmt$(c.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Benchmark + alpha — if you'd put the same money in SPY over the same
          window, this is what you'd have done; alpha is the gap. */}
      {data.benchmarkReturnPct != null && data.alphaPct != null && (
        <div className="mt-4 pt-3 border-t border-border grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-border bg-background/50 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground mb-0.5">SPY over same window</p>
            <p className={`font-[var(--font-mono)] text-base font-semibold ${data.benchmarkReturnPct >= 0 ? "text-foreground" : "text-red-500"}`}>
              {fmtPct(data.benchmarkReturnPct)}
            </p>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
            <p className="text-[11px] text-primary/80 mb-0.5">Alpha vs SPY</p>
            <p className={`font-[var(--font-mono)] text-base font-semibold ${data.alphaPct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {fmtPct(data.alphaPct)}
            </p>
          </div>
        </div>
      )}

      {/* Cost basis + current value footnote */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
        <span>
          Invested:{" "}
          <span className="font-[var(--font-mono)] text-foreground/80 font-medium">
            ${data.costBasis.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </span>
        <span>
          Current value:{" "}
          <span className="font-[var(--font-mono)] text-foreground/80 font-medium">
            ${data.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </span>
      </div>
    </div>
  );
}

/**
 * Lightweight inline sparkline. Renders 40 × 14 px SVG polyline normalized to
 * the min/max of the series. Green if the series ended higher than it started,
 * red otherwise. Returns an em-dash when there's no series (fresh ticker, bars
 * missing, etc.) so the cell never renders empty.
 */
function MiniSparkline({ data }: { data: number[] | null }) {
  if (!data || data.length < 2) {
    return <span className="text-xs text-muted-foreground w-10 text-center">—</span>;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 40, H = 14;
  const step = W / (data.length - 1);
  const points = data
    .map((v, i) => `${(i * step).toFixed(1)},${(H - ((v - min) / range) * H).toFixed(1)}`)
    .join(" ");
  const up = data[data.length - 1] >= data[0];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={up ? "rgb(16 185 129)" : "rgb(239 68 68)"}
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Letter-grade portfolio rating card. Big letter on the left,
 * 7 category cells on the right, strengths/watch-outs below. The underlying
 * numeric scores come from the position-weighted factor profile so the
 * rating stays consistent with the radar chart in PortfolioAthenaProfile.
 */
function PortfolioRatingCard({ rating }: { rating: PortfolioRating }) {
  const gradeColor = (g: string) => {
    switch (g) {
      case "A": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";
      case "B": return "text-teal-500 bg-teal-500/10 border-teal-500/30";
      case "C": return "text-amber-500 bg-amber-500/10 border-amber-500/30";
      case "D": return "text-orange-500 bg-orange-500/10 border-orange-500/30";
      case "F": return "text-red-500 bg-red-500/10 border-red-500/30";
      default:  return "text-muted-foreground bg-muted border-border";
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h3 className="font-[var(--font-heading)] text-base font-semibold">Portfolio rating</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Letter grade across the 7-factor research model ·{" "}
            {rating.coverage} {rating.coverage === 1 ? "holding" : "holdings"} with active signals
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-[auto_1fr] gap-5 items-start">
        {/* Giant overall grade */}
        <div className={`w-32 flex flex-col items-center justify-center rounded-xl border ${gradeColor(rating.overall)} py-5`}>
          <p className="font-[var(--font-heading)] text-5xl font-extrabold leading-none">
            {rating.overall}
          </p>
          <p className="font-[var(--font-mono)] text-xs mt-1 opacity-75">
            {rating.overallScore}/100
          </p>
          <p className="text-[10px] uppercase tracking-widest mt-2 opacity-60">Overall</p>
        </div>

        {/* 7 category grades */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(rating.categories).map(([name, c]) => (
            <div
              key={name}
              className={`rounded-lg border px-3 py-2.5 ${gradeColor(c.grade)}`}
              title={`${c.label} · ${c.score}/100`}
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className="text-[10px] uppercase tracking-wider opacity-70">{name}</p>
                <p className="font-[var(--font-heading)] text-lg font-extrabold leading-none">
                  {c.grade}
                </p>
              </div>
              <p className="font-[var(--font-mono)] text-xs opacity-75">{c.score}/100</p>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths / watch-outs chips */}
      {(rating.strengths.length > 0 || rating.watchouts.length > 0) && (
        <div className="mt-5 pt-4 border-t border-border grid sm:grid-cols-2 gap-3">
          {rating.strengths.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-widest text-emerald-500 mb-2">
                Strengths
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rating.strengths.map((s) => (
                  <span
                    key={s}
                    className="text-[11px] px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500"
                  >
                    ✓ {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {rating.watchouts.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-widest text-amber-500 mb-2">
                Watch-outs
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rating.watchouts.map((w) => (
                  <span
                    key={w}
                    className="text-[11px] px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500"
                  >
                    ! {w}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Risk metrics grid (pillar #2). Surfaces the numbers the backend already computes
 * — Sharpe, Sortino, Max drawdown, Beta, Volatility, VaR 95% — so users don't have
 * to take our "health score" on faith. Color coding is directional, not diagnostic:
 * a higher Sharpe is usually better, a higher drawdown is usually worse, Beta near
 * 1.0 means "moves with the market."
 */
function RiskMetricsCard({ metrics }: { metrics: RiskMetrics }) {
  const cells: Array<{
    label: string;
    value: string;
    hint: string;
    good: boolean | null;
  }> = [
    {
      label: "Sharpe Ratio",
      value: metrics.sharpeRatio != null ? metrics.sharpeRatio.toFixed(2) : "—",
      hint: "Return per unit of total risk · higher is better",
      good: metrics.sharpeRatio != null ? metrics.sharpeRatio >= 1.0 : null,
    },
    {
      label: "Sortino Ratio",
      value: metrics.sortinoRatio != null ? metrics.sortinoRatio.toFixed(2) : "—",
      hint: "Return per unit of downside risk · higher is better",
      good: metrics.sortinoRatio != null ? metrics.sortinoRatio >= 1.5 : null,
    },
    {
      label: "Max Drawdown",
      value: metrics.maxDrawdown != null ? `-${(metrics.maxDrawdown * 100).toFixed(1)}%` : "—",
      hint: "Worst peak-to-trough loss · lower is better",
      good: metrics.maxDrawdown != null ? metrics.maxDrawdown < 0.20 : null,
    },
    {
      label: "Beta (vs SPY)",
      value: metrics.beta != null ? metrics.beta.toFixed(2) : "—",
      hint: "Sensitivity to S&P 500 · 1.0 = market · >1 = amplified",
      good: null, // directional, not judgmental
    },
    {
      label: "Volatility",
      value: metrics.volatility != null ? `${(metrics.volatility * 100).toFixed(1)}%` : "—",
      hint: "Annualized standard deviation of returns",
      good: metrics.volatility != null ? metrics.volatility < 0.25 : null,
    },
    {
      label: "VaR 95%",
      value: metrics.var95 != null ? `${(metrics.var95 * 100).toFixed(2)}%` : "—",
      hint: "Expected worst daily loss 95% of the time",
      good: null,
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h3 className="font-[var(--font-heading)] text-base font-semibold">Risk profile</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Measured over the last 90 trading days · recomputed each request
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="rounded-lg border border-border bg-background/50 p-3.5"
          >
            <p className="text-[11px] text-muted-foreground">{cell.label}</p>
            <p
              className={`font-[var(--font-mono)] text-xl font-semibold mt-1 ${
                cell.good === true
                  ? "text-emerald-500"
                  : cell.good === false
                  ? "text-amber-500"
                  : "text-foreground"
              }`}
            >
              {cell.value}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
              {cell.hint}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
