import type { Signal, SignalBreakdown } from "./api";

/**
 * Generate a short plain-English thesis snippet from a signal's breakdown
 * scores. Used for Today screen table rows where running useStockThesis on
 * every row would be 20+ API calls. Deep thesis still comes from the API on
 * the signal detail page.
 */
export function thesisSnippet(signal: Signal): string {
  const b = signal.breakdown;
  if (b?.whyNowSummary) return b.whyNowSummary;
  if (!b) return fallback(signal);

  const top = topFactors(b, 2);
  const notes = top.map((t) => `${t.label} ${Math.round(t.score)}`);

  const phrase =
    signal.signalType.toUpperCase() === "BUY_TODAY"
      ? "Breakout setup"
      : signal.signalType.toUpperCase() === "AVOID"
        ? "Flagged as avoid"
        : "Watch setup";

  return `${phrase}. ${notes.join(" · ")}.`;
}

function topFactors(b: SignalBreakdown, n: number) {
  const rows: { label: string; score: number }[] = [
    { label: "Momentum", score: b.momentumScore },
    { label: "Rel Vol", score: b.relVolumeScore },
    { label: "News", score: b.newsScore },
    { label: "Earnings", score: b.fundamentalsScore },
    { label: "Sentiment", score: b.sentimentScore },
    { label: "Trend", score: b.trendScore },
    { label: "Risk", score: b.riskScore },
  ];
  return rows.sort((a, z) => z.score - a.score).slice(0, n);
}

function fallback(signal: Signal): string {
  if (signal.scoreTotal >= 75) return "High composite score across the 7-factor scan.";
  if (signal.scoreTotal >= 60) return "Solid composite score, multiple factors aligned.";
  return "Mid-range setup — one or two factors carrying the score.";
}
