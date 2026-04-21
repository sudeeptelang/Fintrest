"use client";

import { use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Brain, Target, Newspaper, TrendingUp, Shield, ArrowUpRight } from "lucide-react";
import { useStock, useStockSignals } from "@/lib/hooks";
import { ScoreRing } from "@/components/charts/score-ring";
import { FactorRadar } from "@/components/charts/factor-radar";
import { FactorGauges } from "@/components/charts/factor-gauges";

interface PageProps {
  params: Promise<{ ticker: string }>;
}

const FACTOR_META: Record<string, { label: string; weight: string; source: string; icon: typeof TrendingUp }> = {
  momentum: { label: "Momentum", weight: "25%", source: "Price action 5/20/60d", icon: TrendingUp },
  relVolume: { label: "Rel. Volume", weight: "15%", source: "Volume vs 30d avg", icon: ArrowUpRight },
  news: { label: "News Catalyst", weight: "15%", source: "Finnhub sentiment", icon: Newspaper },
  fundamentals: { label: "Fundamentals", weight: "15%", source: "FMP TTM ratios", icon: Target },
  sentiment: { label: "Sentiment", weight: "10%", source: "News + social", icon: Brain },
  trend: { label: "Trend Strength", weight: "10%", source: "MA20/50/200", icon: TrendingUp },
  risk: { label: "Risk Filter", weight: "10%", source: "ATR + drawdown", icon: Shield },
};

export default function ScoreBreakdownPage({ params }: PageProps) {
  const { ticker } = use(params);
  const { data: stock } = useStock(ticker);
  const { data: signalsData } = useStockSignals(ticker);

  const latest = signalsData?.signals?.[0];
  const breakdown = latest?.breakdown;

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

  const factorRows = breakdown
    ? [
        { key: "momentum", score: breakdown.momentumScore },
        { key: "relVolume", score: breakdown.relVolumeScore },
        { key: "news", score: breakdown.newsScore },
        { key: "fundamentals", score: breakdown.fundamentalsScore },
        { key: "sentiment", score: breakdown.sentimentScore },
        { key: "trend", score: breakdown.trendScore },
        { key: "risk", score: breakdown.riskScore },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/stock/${ticker}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to {ticker.toUpperCase()}
        </Link>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold mt-2">
          {ticker.toUpperCase()} · Score Breakdown
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {stock?.name ?? "Loading..."} · 7-factor confidence scoring
        </p>
      </div>

      {!latest ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No signal data available for this ticker yet.
        </div>
      ) : (
        <>
          {/* Top: Total score + Radar */}
          <div className="grid lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center justify-center"
            >
              <ScoreRing score={latest.scoreTotal} size={200} />
              <div className="mt-4 grid grid-cols-2 gap-6 w-full text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Risk</p>
                  <p
                    className={`text-sm font-semibold mt-1 ${
                      latest.riskLevel === "LOW"
                        ? "text-emerald-400"
                        : latest.riskLevel === "HIGH"
                          ? "text-red-400"
                          : "text-amber-400"
                    }`}
                  >
                    {latest.riskLevel ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Signal</p>
                  <p className="text-sm font-semibold mt-1 text-primary">
                    {latest.signalType.replace("_", " ")}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl border border-border bg-card p-6 lg:col-span-2"
            >
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                Factor Profile
              </h3>
              {breakdown && <FactorRadar breakdown={breakdown} />}
            </motion.div>
          </div>

          {/* Per-factor table with weights, scores, sources */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border bg-card overflow-hidden"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Factor
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Source
                  </th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">
                    Weight
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">
                    Score
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">
                    Bar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {factorRows.map((row) => {
                  const meta = FACTOR_META[row.key];
                  const Icon = meta.icon;
                  const score = Math.round(row.score);
                  const scoreColor =
                    score >= 75
                      ? "text-emerald-500"
                      : score >= 50
                        ? "text-amber-500"
                        : "text-red-500";
                  const barColor =
                    score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
                  return (
                    <tr key={row.key} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{meta.label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        {meta.source}
                      </td>
                      <td className="px-5 py-3.5 text-center font-[var(--font-mono)] text-xs text-muted-foreground">
                        {meta.weight}
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right font-[var(--font-mono)] font-bold ${scoreColor}`}
                      >
                        {score}
                      </td>
                      <td className="px-5 py-3.5 w-40">
                        <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>

          {/* Prospero-style gauges */}
          {breakdown && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <h2 className="font-[var(--font-heading)] text-lg font-semibold mb-4">
                Factor Gauges
              </h2>
              <FactorGauges breakdown={breakdown} />
            </motion.div>
          )}

          {/* AI rationale */}
          {explanation.Summary && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-primary/20 bg-gradient-to-br from-[#1E1B4B] to-[#2D2A6B] p-6 text-white/90"
            >
              <h2 className="font-[var(--font-heading)] text-lg font-semibold mb-3 flex items-center gap-2">
                <Brain className="h-4.5 w-4.5 text-primary" /> Lens&apos;s Rationale
              </h2>
              <p className="text-sm leading-relaxed text-white/80">
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
                      className="text-xs text-white/70 flex items-start gap-2 pl-2 border-l-2 border-emerald-500/40"
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
                      className="text-xs text-white/70 flex items-start gap-2 pl-2 border-l-2 border-red-500/40"
                    >
                      {f}
                    </p>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground text-center pt-2">
        Educational content only — not financial advice. Past signal performance does
        not guarantee future results.
      </p>
    </div>
  );
}
