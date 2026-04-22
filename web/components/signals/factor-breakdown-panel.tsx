"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import type { SignalBreakdown } from "@/lib/api";

/**
 * Consolidated 7- or 8-factor breakdown — radar on the left, numbered list
 * on the right. Replaces the old FactorRadar + FactorGauges + FactorBarChart
 * trio per docs/DESIGN_TICKER_DEEP_DIVE.md (QA-P1-1). One visualization;
 * the list carries the numbers and one-line summaries. The 8th (Smart Money)
 * axis renders when `smartMoneyScore` is present, and the row is clickable
 * so the caller can scroll/expand the Smart Money breakdown card.
 */
export function FactorBreakdownPanel({
  breakdown,
  composite,
  smartMoneyScore,
  onSmartMoneyClick,
  className,
}: {
  breakdown: SignalBreakdown;
  /** Weighted composite score (0-100). Displayed top-right. */
  composite: number;
  /** Smart Money composite (§14.9). When set, renders as the 8th axis + row. */
  smartMoneyScore?: number | null;
  /** Fires when the Smart Money row is clicked — expand/scroll to the drill-down. */
  onSmartMoneyClick?: () => void;
  className?: string;
}) {
  const base = [
    { factor: "Momentum", score: breakdown.momentumScore },
    { factor: "Rel Vol", score: breakdown.relVolumeScore },
    { factor: "News", score: breakdown.newsScore },
    { factor: "Earnings", score: breakdown.fundamentalsScore },
    { factor: "Sentiment", score: breakdown.sentimentScore },
    { factor: "Trend", score: breakdown.trendScore },
    { factor: "Risk", score: breakdown.riskScore },
  ];
  const rows = (smartMoneyScore != null
    ? [...base, { factor: "Smart $", score: smartMoneyScore }]
    : base
  ).map((r) => ({ ...r, score: Math.round(r.score) }));

  const listRows = (smartMoneyScore != null
    ? [
        { factor: "Momentum", score: breakdown.momentumScore, smart: false },
        { factor: "Relative volume", score: breakdown.relVolumeScore, smart: false },
        { factor: "News catalyst", score: breakdown.newsScore, smart: false },
        { factor: "Earnings", score: breakdown.fundamentalsScore, smart: false },
        { factor: "Sentiment", score: breakdown.sentimentScore, smart: false },
        { factor: "Trend", score: breakdown.trendScore, smart: false },
        { factor: "Risk", score: breakdown.riskScore, smart: false },
        { factor: "Smart money", score: smartMoneyScore, smart: true },
      ]
    : [
        { factor: "Momentum", score: breakdown.momentumScore, smart: false },
        { factor: "Relative volume", score: breakdown.relVolumeScore, smart: false },
        { factor: "News catalyst", score: breakdown.newsScore, smart: false },
        { factor: "Fundamentals", score: breakdown.fundamentalsScore, smart: false },
        { factor: "Sentiment", score: breakdown.sentimentScore, smart: false },
        { factor: "Trend", score: breakdown.trendScore, smart: false },
        { factor: "Risk", score: breakdown.riskScore, smart: false },
      ]).map((r) => ({ ...r, score: Math.round(r.score) }));

  return (
    <section className={cn("rounded-[10px] border border-ink-200 bg-ink-0 p-6", className)}>
      <header className="flex items-baseline justify-between mb-5">
        <div>
          <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-forest-dark">
            7-factor breakdown
          </div>
          <p className="mt-1 font-[var(--font-sans)] text-[12px] text-ink-500">
            What the engine saw
          </p>
        </div>
        <div className="text-right">
          <div className="font-[var(--font-mono)] text-[11px] text-ink-500 tracking-[0.02em]">
            Weighted composite
          </div>
          <div className="font-[var(--font-mono)] text-[20px] font-semibold text-ink-900 leading-none mt-1">
            {Math.round(composite)}
            <span className="text-[13px] text-ink-500 font-normal">/100</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,1fr)_1.2fr] gap-8 items-center">
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={rows} cx="50%" cy="50%" outerRadius="72%">
              <PolarGrid stroke="rgba(16,24,40,0.08)" gridType="polygon" />
              <PolarAngleAxis
                dataKey="factor"
                tick={{ fontSize: 10, fontWeight: 600, fill: "#475467" }}
              />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Average"
                dataKey={() => 50}
                stroke="rgba(16,24,40,0.14)"
                fill="rgba(16,24,40,0.04)"
                fillOpacity={1}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#0F4F3A"
                fill="#0F4F3A"
                fillOpacity={0.18}
                strokeWidth={2}
                dot={{ r: 3.5, fill: "#0F4F3A", stroke: "#fff", strokeWidth: 2 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <ol className="space-y-2">
          {listRows.map((r) => (
            <FactorListRow
              key={r.factor}
              name={r.factor}
              score={r.score}
              smart={r.smart}
              onClick={r.smart ? onSmartMoneyClick : undefined}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}

function FactorListRow({
  name,
  score,
  smart,
  onClick,
}: {
  name: string;
  score: number;
  smart: boolean;
  onClick?: () => void;
}) {
  const tone =
    score >= 70
      ? "text-up"
      : score >= 40
      ? "text-ink-900"
      : score >= 25
      ? "text-warn"
      : "text-down";

  const bar =
    score >= 70 ? "bg-up" : score >= 40 ? "bg-ink-700" : score >= 25 ? "bg-warn" : "bg-down";

  const pct = Math.max(0, Math.min(100, score));

  return (
    <li
      onClick={onClick}
      className={cn(
        "grid grid-cols-[140px_1fr_60px] items-center gap-3 py-1.5 rounded",
        smart && "bg-ink-50 px-3 mt-2 border-t border-ink-100",
        onClick && "cursor-pointer hover:bg-ink-100",
      )}
    >
      <span className="font-[var(--font-sans)] text-[13px] font-medium text-ink-800">
        {name}
        {smart && onClick && (
          <span className="ml-2 font-[var(--font-mono)] text-[10px] text-ink-500 font-normal">
            expanded ↓
          </span>
        )}
      </span>
      <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
        <div className={cn("h-full rounded-full", bar)} style={{ width: `${pct}%` }} />
      </div>
      <span
        className={cn(
          "font-[var(--font-mono)] text-[13px] font-semibold justify-self-end",
          tone,
        )}
      >
        {score}
      </span>
    </li>
  );
}
