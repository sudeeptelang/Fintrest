import type { Signal, SignalBreakdown, StockSnapshot, AthenaThesisResponse } from "./api";

export type FactorSummary = { name: string; score: number; summary: string };

/**
 * Expand the 7 breakdown scores into rows for <FactorRow>. Each row gets a
 * plain-English summary that shifts tone with the score. Real thesis (if
 * available) can replace these in the future — the generator just ensures
 * the UI is never empty.
 */
export function expandFactors(b: SignalBreakdown): FactorSummary[] {
  return [
    { name: "Momentum",        score: b.momentumScore,     summary: momentumSummary(b.momentumScore) },
    { name: "Relative volume", score: b.relVolumeScore,    summary: relVolSummary(b.relVolumeScore) },
    { name: "News catalyst",   score: b.newsScore,         summary: newsSummary(b.newsScore) },
    { name: "Fundamentals",    score: b.fundamentalsScore, summary: fundamentalsSummary(b) },
    { name: "Sentiment",       score: b.sentimentScore,    summary: sentimentSummary(b.sentimentScore) },
    { name: "Trend",           score: b.trendScore,        summary: trendSummary(b.trendScore) },
    { name: "Risk",            score: b.riskScore,         summary: riskSummary(b.riskScore) },
  ];
}

/**
 * Q/P/G sub-component of the fundamentals factor — exposed on the signal
 * detail page as a three-card decomposition below the 7-factor breakdown.
 * Returns null when none of the sub-scores are present.
 */
export type FundamentalDecomposition = {
  quality: number | null;
  profitability: number | null;
  growth: number | null;
};

export function fundamentalDecomposition(b: SignalBreakdown): FundamentalDecomposition | null {
  if (b.qualityScore == null && b.profitabilityScore == null && b.growthScore == null) return null;
  return {
    quality: b.qualityScore,
    profitability: b.profitabilityScore,
    growth: b.growthScore,
  };
}

function momentumSummary(s: number): string {
  if (s >= 80) return `Top ${Math.max(5, Math.round((100 - s) / 2))}% of scanned universe. Multi-timeframe momentum aligned.`;
  if (s >= 60) return "Solid relative momentum. Outperforming sector median on 1M/3M.";
  if (s >= 40) return "Mixed momentum. No clear leadership yet.";
  return "Weak relative momentum. Trailing the market.";
}

function relVolSummary(s: number): string {
  if (s >= 80) return "Elevated participation. Volume meaningfully above 30-day average.";
  if (s >= 60) return "Above-average volume. Institutional interest warming up.";
  if (s >= 40) return "Near-average volume. No conviction signal yet.";
  return "Below average. Thin participation on current move.";
}

function newsSummary(s: number): string {
  if (s >= 80) return "Strong positive news flow. Catalysts backing the move.";
  if (s >= 60) return "Supportive news backdrop. Sentiment skewing bullish.";
  if (s >= 40) return "Mixed news. Neutral catalyst picture.";
  return "Limited positive flow. News not the driver here.";
}

function fundamentalsSummary(b: SignalBreakdown): string {
  const s = b.fundamentalsScore;
  // If Q/P/G are present (§14.1), compose a specific summary.
  if (b.qualityScore != null || b.profitabilityScore != null || b.growthScore != null) {
    const parts: string[] = [];
    if (b.qualityScore != null) parts.push(`Quality ${Math.round(b.qualityScore)}`);
    if (b.profitabilityScore != null) parts.push(`Profitability ${Math.round(b.profitabilityScore)}`);
    if (b.growthScore != null) parts.push(`Growth ${Math.round(b.growthScore)}`);
    const prefix = s >= 75 ? "Strong fundamentals" : s >= 55 ? "Solid fundamentals" : s >= 40 ? "Mixed fundamentals" : "Weak fundamentals";
    return `${prefix}. Decomposition: ${parts.join(" · ")}.`;
  }
  if (s >= 80) return "Fundamentals strong. Beat history supports the setup.";
  if (s >= 60) return "Solid fundamentals. Earnings event risk worth tracking.";
  if (s >= 40) return "Mixed fundamentals. Earnings read-through uncertain.";
  return "Weak fundamentals. Growth or profitability under pressure.";
}

function sentimentSummary(s: number): string {
  if (s >= 80) return "Bullish. Social and analyst consensus strongly positive.";
  if (s >= 60) return "Leaning bullish. Crowd sentiment supportive.";
  if (s >= 40) return "Neutral sentiment. No clear consensus.";
  return "Bearish sentiment. Consensus leans cautious.";
}

function trendSummary(s: number): string {
  if (s >= 80) return "Strong trend. Above 20/50/200 MAs, all aligned bullish.";
  if (s >= 60) return "Constructive trend. Most timeframes trending up.";
  if (s >= 40) return "Trend transition. MAs not yet aligned.";
  return "Weak or broken trend. Price below key averages.";
}

function riskSummary(s: number): string {
  if (s >= 80) return "Low risk profile. Contained volatility, clean setup.";
  if (s >= 60) return "Moderate risk. Normal volatility for the name.";
  if (s >= 40) return "Elevated volatility. Position size accordingly.";
  return "High risk. Choppy tape, wide ATR, event-risk clustered.";
}

type Explanation = {
  Summary?: string;
  BullishFactors?: string[];
  BearishFactors?: string[];
  TradeZoneNarrative?: string;
};

function parseExplanation(json: string | null): Explanation {
  if (!json) return {};
  try {
    return JSON.parse(json) as Explanation;
  } catch {
    return {};
  }
}

// Crude substring dedupe — avoids rendering the same insight twice when the
// thesis catalyst and the breakdown BullishFactor restate each other.
function similarText(a: string, b: string): boolean {
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  if (al === bl) return true;
  if (al.length > 20 && bl.length > 20) {
    return al.includes(bl) || bl.includes(al);
  }
  return false;
}

/**
 * Generate 5 plain-English bullets for the "In plain English" card.
 *
 * Merges three sources in priority order:
 *   1. Fresh Lens thesis catalysts + risks (from /thesis API)
 *   2. Signal breakdown's explanationJson BullishFactors + BearishFactors
 *      (generated when the signal was scored — always present)
 *   3. Derivation from 7-factor scores (last-resort fallback)
 *
 * Deduplicates by substring similarity.
 */
export function buildTakeaways({
  signal,
  thesis,
}: {
  signal: Signal;
  thesis?: AthenaThesisResponse | null;
}): React.ReactNode[] {
  const bullish: string[] = [];
  const bearish: string[] = [];

  if (thesis?.catalysts?.length) bullish.push(...thesis.catalysts);
  if (thesis?.risks?.length) bearish.push(...thesis.risks);

  const expl = parseExplanation(signal.breakdown?.explanationJson ?? null);
  if (expl.BullishFactors?.length) {
    for (const f of expl.BullishFactors) {
      if (!bullish.some((b) => similarText(b, f))) bullish.push(f);
    }
  }
  if (expl.BearishFactors?.length) {
    for (const f of expl.BearishFactors) {
      if (!bearish.some((b) => similarText(b, f))) bearish.push(f);
    }
  }

  const merged: React.ReactNode[] = [...bullish.slice(0, 3), ...bearish.slice(0, 2)];
  if (merged.length > 0) return merged.slice(0, 5);

  // Derivation fallback when neither thesis nor explanationJson is populated.
  const items: React.ReactNode[] = [];
  const b = signal.breakdown;
  if (!b) {
    items.push(`Composite score ${Math.round(signal.scoreTotal)}/100 — mid-range setup with one dominant factor.`);
    return items;
  }

  if (b.momentumScore >= 70) {
    items.push(`Momentum is in the top ${Math.max(8, 100 - Math.round(b.momentumScore))}% of US stocks — price has been rising with volume behind it.`);
  }
  if (b.trendScore >= 70) {
    items.push("Above all three moving averages — the trend is intact, no sign of breaking down.");
  }
  if (b.fundamentalsScore >= 60 && b.fundamentalsScore < 80) {
    items.push("Earnings event is nearby — if you take a position, plan whether to close before the call or hold through.");
  }
  if (signal.stopLoss != null && signal.entryLow != null) {
    const riskPct = Math.abs((signal.entryLow - signal.stopLoss) / signal.entryLow) * 100;
    items.push(
      <>Reference stop at <strong>${signal.stopLoss.toFixed(2)}</strong> keeps the risk roughly {riskPct.toFixed(1)}% per share.</>,
    );
  }
  if (b.riskScore < 60) {
    items.push("Elevated volatility — size smaller or wait for a tighter setup.");
  } else if (b.sentimentScore >= 70) {
    items.push("Sentiment is leaning bullish — crowd and analysts both skewing positive.");
  }

  return items.slice(0, 5);
}

/**
 * Build the 6-cell compact technicals strip from a StockSnapshot.
 */
export function buildTechnicalsCells(s: StockSnapshot | null | undefined) {
  if (!s) return [];
  return [
    { label: "Volume",  value: formatVolume(s.volume) },
    { label: "Rel Vol", value: s.relVolume != null ? `${s.relVolume.toFixed(2)}×` : "—", tone: relVolTone(s.relVolume) },
    { label: "RSI (14)", value: s.rsi != null ? s.rsi.toFixed(0) : "—" },
    { label: "SMA 20",  value: s.ma20 != null ? `$${priceShort(s.ma20)}` : "—" },
    { label: "SMA 50",  value: s.ma50 != null ? `$${priceShort(s.ma50)}` : "—" },
    { label: "ATR",     value: s.atr != null ? `$${s.atr.toFixed(2)}` : "—" },
  ] as const;
}

function formatVolume(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toString();
}

function relVolTone(r: number | null): "up" | "down" | undefined {
  if (r == null) return undefined;
  if (r >= 1.2) return "up";
  if (r < 0.8) return "down";
  return undefined;
}

function priceShort(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return p.toFixed(0);
}

/**
 * Surface the trade plan narrative from the freshest available source.
 * Prefers `thesis.tradePlan.narrative` (from /thesis) and falls back to
 * `explanationJson.TradeZoneNarrative` (from the signal breakdown).
 */
export function getTradePlanNarrative(
  signal: Signal,
  thesis?: AthenaThesisResponse | null,
): string | null {
  if (thesis?.tradePlan?.narrative) return thesis.tradePlan.narrative;
  const expl = parseExplanation(signal.breakdown?.explanationJson ?? null);
  return expl.TradeZoneNarrative ?? null;
}

/**
 * Format market cap in human-readable form.
 */
export function formatMarketCap(m: number | null | undefined): string | undefined {
  if (m == null) return undefined;
  if (m >= 1e12) return `$${(m / 1e12).toFixed(2)}T`;
  if (m >= 1e9) return `$${(m / 1e9).toFixed(1)}B`;
  if (m >= 1e6) return `$${(m / 1e6).toFixed(0)}M`;
  return `$${m.toLocaleString("en-US")}`;
}
