"use client";

import { LensCardGated } from "@/components/lens/lens-card";
import type { Holding, PortfolioRating } from "@/lib/api";

/**
 * Lens's take on the user's portfolio — narrative card gated by tier.
 * Pro sees the standard narrative; Elite gets the personalized variant.
 *
 * The narrative is composed from the holdings + rating so the card always has
 * something to say, even before the /advisor response comes back.
 */
export function LensPortfolioNarrative({
  holdings,
  rating,
  className,
}: {
  holdings: Holding[] | null | undefined;
  rating: PortfolioRating | null | undefined;
  className?: string;
}) {
  if (!holdings || holdings.length === 0) return null;

  const analysis = composePortfolioAnalysis(holdings, rating);

  return (
    <LensCardGated
      eyebrow="Lens's take on your portfolio"
      title={analysis.title}
      meta="Refreshed this morning"
      personalizedForElite
      className={className}
    >
      {analysis.body}
    </LensCardGated>
  );
}

type Analysis = { title: string; body: React.ReactNode };

function composePortfolioAnalysis(holdings: Holding[], rating: PortfolioRating | null | undefined): Analysis {
  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const weights = holdings.map((h) => ({
    h,
    w: totalValue > 0 ? h.currentValue / totalValue : 0,
  }));
  const ranked = [...weights].sort((a, z) => z.w - a.w);
  const topThree = ranked.slice(0, 3).map(({ h }) => h.ticker);
  const top = ranked[0];

  const signalHits = holdings.filter((h) => (h.signalScore ?? 0) >= 70);
  const avgSignal = holdings.reduce((s, h) => s + (h.signalScore ?? 0), 0) / holdings.length;

  const bigWinners = holdings.filter((h) => h.unrealizedPnlPct >= 50);
  const bigLosers = holdings.filter((h) => h.unrealizedPnlPct <= -15);

  const ratingLine = rating
    ? `Overall rating ${rating.overall} (${Math.round(rating.overallScore)}/100).`
    : "";

  const concentrationLine =
    top && top.w > 0.15
      ? ` Concentration is elevated — ${top.h.ticker} sits at ${(top.w * 100).toFixed(0)}% of the book.`
      : "";

  const topLine = `Your top three positions — ${topThree.join(", ")} — carry ${
    (ranked.slice(0, 3).reduce((s, r) => s + r.w, 0) * 100).toFixed(0)
  }% of total value.`;

  const signalLine =
    signalHits.length > 0
      ? ` ${signalHits.length} of ${holdings.length} holdings currently score ≥70 on Fintrest signals (portfolio average ${Math.round(avgSignal)}).`
      : "";

  const outcomeLine = (() => {
    if (bigWinners.length > 0 && bigLosers.length === 0)
      return ` The unrealized story is carried by ${bigWinners.length} position${bigWinners.length === 1 ? "" : "s"} up 50%+ — consider whether position sizing has drifted from your original allocation.`;
    if (bigLosers.length > 0)
      return ` ${bigLosers.length} position${bigLosers.length === 1 ? "" : "s"} sit 15%+ below cost — worth a fresh thesis review.`;
    return "";
  })();

  const title = (() => {
    if (top && top.w > 0.15) return `${top.h.ticker} dominates the book.`;
    if (bigLosers.length >= 2) return "Several positions underwater — review the thesis.";
    if (bigWinners.length >= 2) return "Momentum-heavy, running hot.";
    return "Balanced book, no single position dominating.";
  })();

  return {
    title,
    body: (
      <p>
        <strong>{holdings.length}-position portfolio, ${formatMoney(totalValue)} total value.</strong>{" "}
        {ratingLine} {topLine}
        {concentrationLine}
        {signalLine}
        {outcomeLine}
      </p>
    ),
  };
}

function formatMoney(n: number): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n.toFixed(2);
}
