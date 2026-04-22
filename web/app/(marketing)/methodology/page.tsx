import type { Metadata } from "next";
import Link from "next/link";

// Methodology page — the load-bearing trust doc per FINTREST_UX_SPEC §19.
// Linked from every signal footer, the public landing, and the audit log.
// This stub covers the minimum content so a skeptical reader can answer
// "is this legitimate?" in 90 seconds. Richer visual treatment + data-
// source table with live freshness lands in MVP-2.

export const metadata: Metadata = {
  title: "Methodology — Fintrest.ai",
  description:
    "How Fintrest scores, publishes, and audits its research signals. Eight factors, transparent data sources, public audit log.",
};

export default function MethodologyPage() {
  return (
    <main className="max-w-[760px] mx-auto px-4 sm:px-6 py-16 text-ink-800">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-forest-dark">
          How the research works
        </p>
        <h1 className="font-[var(--font-heading)] text-[36px] leading-[44px] font-semibold text-ink-950 tracking-[-0.015em] mt-2">
          Methodology
        </h1>
        <p className="mt-4 text-[15px] leading-[24px] text-ink-600">
          Fintrest publishes research, not recommendations. This page lays out
          exactly how a signal is made, which data feeds it, and how we
          measure whether the engine worked — so you can form your own
          judgment about the process before trusting the output.
        </p>
      </div>

      <section className="space-y-5 mb-10">
        <h2 className="font-[var(--font-heading)] text-[22px] leading-[30px] font-semibold text-ink-900">
          How a signal is made
        </h2>
        <p className="font-[var(--font-lens)] text-[16px] leading-[28px] text-ink-800">
          Every morning at 6:30 AM ET, Fintrest scans the US equity universe
          — roughly 500 liquid large and mid-cap tickers — through an
          eight-factor scoring pipeline. Each factor produces a score from 0
          to 100; those eight scores combine into a weighted composite. A
          ticker only enters today's research set if its composite clears a
          universal bar and no individual factor floor is breached.
        </p>
        <p className="font-[var(--font-lens)] text-[16px] leading-[28px] text-ink-800">
          Every published signal carries reference levels (entry, stop,
          target), a risk-to-reward ratio, and a plain-English Lens thesis
          that names the specific drivers. Published signals are numbered
          sequentially and stored in a public audit log. Nothing is
          retroactively edited or removed.
        </p>
      </section>

      <section className="space-y-4 mb-10">
        <h2 className="font-[var(--font-heading)] text-[22px] leading-[30px] font-semibold text-ink-900">
          The eight factors
        </h2>
        <dl className="space-y-4 text-[14px] leading-[22px]">
          <FactorDef
            name="Momentum"
            desc="Multi-timeframe price strength (5d / 20d / 60d / 120d), RSI, ADX, distance from the 52-week high."
          />
          <FactorDef
            name="Relative volume"
            desc="Today's volume vs. the 30-day average, and the dollar amount traded relative to market cap."
          />
          <FactorDef
            name="News catalyst"
            desc="Article count (24h / 7d) weighted by source quality, sentiment, and EDGAR filings."
          />
          <FactorDef
            name="Earnings quality"
            desc="Four-quarter beat history, revenue and EPS surprise, margin stability, and implied-move pricing on at-the-money options."
          />
          <FactorDef
            name="Sentiment"
            desc="Analyst revisions and target-price changes, social sentiment, and short-interest dynamics."
          />
          <FactorDef
            name="Trend"
            desc="Price relative to 50- and 200-day moving averages, cross-distance, and slope of those averages."
          />
          <FactorDef
            name="Risk"
            desc="Implied-volatility rank, beta, 90-day max drawdown, days to next earnings, and average true range."
          />
          <FactorDef
            name="Smart money"
            desc="Composite of insider Form 4 purchases, 13F changes from tracked institutions, congressional trades, options positioning, and short-interest dynamics."
          />
        </dl>
      </section>

      <section className="space-y-4 mb-10">
        <h2 className="font-[var(--font-heading)] text-[22px] leading-[30px] font-semibold text-ink-900">
          Data sources &amp; freshness
        </h2>
        <p className="font-[var(--font-lens)] text-[16px] leading-[28px] text-ink-800">
          Every source carries a disclosed lag. We don't hide freshness
          issues; we surface them on every row.
        </p>
        <div className="rounded-[10px] border border-ink-200 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-ink-700 uppercase text-[10px] tracking-[0.08em]">
                  Source
                </th>
                <th className="px-4 py-2.5 text-left font-semibold text-ink-700 uppercase text-[10px] tracking-[0.08em]">
                  Feeds
                </th>
                <th className="px-4 py-2.5 text-left font-semibold text-ink-700 uppercase text-[10px] tracking-[0.08em]">
                  Lag
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              <DataRow source="Polygon.io" feeds="Price, volume, indices" lag="Real-time" />
              <DataRow source="Financial Modeling Prep" feeds="Fundamentals, earnings, senate + house" lag="EOD to 45d STOCK Act" />
              <DataRow source="Finnhub / Benzinga" feeds="News, analyst revisions" lag="Near real-time" />
              <DataRow source="SEC EDGAR Form 4" feeds="Insider trades" lag="1–2d disclosure" />
              <DataRow source="SEC EDGAR 13F" feeds="Institutional holdings" lag="Up to 45d reporting" />
              <DataRow source="FINRA + Fintel" feeds="Short interest" lag="Bi-monthly, ~1–2w" />
              <DataRow source="FRED + Cboe" feeds="Macro regime (VIX, 10Y, DXY, HY spread)" lag="EOD" />
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 mb-10">
        <h2 className="font-[var(--font-heading)] text-[22px] leading-[30px] font-semibold text-ink-900">
          Audit log philosophy
        </h2>
        <p className="font-[var(--font-lens)] text-[16px] leading-[28px] text-ink-800">
          Every signal Fintrest has ever published lives in the{" "}
          <Link href="/audit" className="text-forest hover:underline">
            audit log
          </Link>{" "}
          — entries, exits, outcomes, and Lens retrospectives. Losers are not
          hidden. When a signal stops out, we tag the failure with a code
          (commodity regime, earnings surprise, broad-market selloff, etc.)
          and aggregate those counts publicly so patterns in the engine's
          blind spots are visible.
        </p>
      </section>

      <section className="space-y-4 mb-10">
        <h2 className="font-[var(--font-heading)] text-[22px] leading-[30px] font-semibold text-ink-900">
          What Fintrest is not
        </h2>
        <p className="font-[var(--font-lens)] text-[16px] leading-[28px] text-ink-800">
          Fintrest is an educational research publisher. We are not a
          registered investment adviser, broker-dealer, or discretionary
          manager. We do not hold customer funds, we do not execute trades,
          and we do not provide personalized investment advice. Signals are
          published content, not recommendations for any individual. Every
          decision about whether to act on anything we publish is yours.
        </p>
        <p className="text-[11px] italic text-ink-500 mt-3">
          Educational content only — not financial advice. Past signal
          performance does not guarantee future results.{" "}
          <Link href="/disclaimer" className="text-forest hover:underline">
            Full disclaimer
          </Link>
          .
        </p>
      </section>
    </main>
  );
}

function FactorDef({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="border-l-2 border-forest pl-4">
      <dt className="font-semibold text-ink-900">{name}</dt>
      <dd className="text-ink-600 mt-0.5">{desc}</dd>
    </div>
  );
}

function DataRow({ source, feeds, lag }: { source: string; feeds: string; lag: string }) {
  return (
    <tr>
      <td className="px-4 py-2.5 font-semibold text-ink-900">{source}</td>
      <td className="px-4 py-2.5 text-ink-600">{feeds}</td>
      <td className="px-4 py-2.5 text-ink-500 font-[var(--font-mono)] text-[12px]">{lag}</td>
    </tr>
  );
}
