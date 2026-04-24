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
 * v3 factor breakdown — 7- or 8-factor radar with 4-family tinting per
 * UX_AUDIT Part 3.5. Each factor is colored by the family it belongs
 * to, so the eight bars read as four two-factor groups the eye can
 * scan, not eight identical blue bars.
 *
 *   Technical (navy)    — Momentum, Trend, Rel Volume
 *   Fundamentals (amber)— Earnings/Fundamentals, Valuation
 *   Sentiment (plum)    — News catalyst, Sentiment
 *   Smart Money (teal)  — Smart Money, Risk
 *
 * Radar dot per factor uses its family color; rows in the list carry
 * a family pill + a family-tinted progress bar.
 */

type Family = "technical" | "fundamentals" | "sentiment" | "smart";

type FactorSpec = {
  factor: string;      // radar axis label (short)
  label: string;       // list row label (long)
  score: number;
  family: Family;
  smart?: boolean;
};

const FAMILY_STYLE: Record<Family, { label: string; pillBg: string; pillText: string; dot: string; bar: string; rowBg: string }> = {
  technical:    { label: "Technical",    pillBg: "bg-navy-light",  pillText: "text-navy",  dot: "#1E3A5F", bar: "bg-navy",  rowBg: "bg-navy-light/40" },
  fundamentals: { label: "Fundamentals", pillBg: "bg-amber-light", pillText: "text-amber", dot: "#B8862F", bar: "bg-amber", rowBg: "bg-amber-light/40" },
  sentiment:    { label: "Sentiment",    pillBg: "bg-plum-light",  pillText: "text-plum",  dot: "#6B3B5E", bar: "bg-plum",  rowBg: "bg-plum-light/40" },
  smart:        { label: "Smart Money",  pillBg: "bg-teal-light",  pillText: "text-teal",  dot: "#2F7A7A", bar: "bg-teal",  rowBg: "bg-teal-light/40" },
};

export function FactorBreakdownPanel({
  breakdown,
  composite,
  smartMoneyScore,
  onSmartMoneyClick,
  className,
}: {
  breakdown: SignalBreakdown;
  composite: number;
  smartMoneyScore?: number | null;
  onSmartMoneyClick?: () => void;
  className?: string;
}) {
  const base: FactorSpec[] = [
    { factor: "Momentum",  label: "Momentum",          score: breakdown.momentumScore,     family: "technical" },
    { factor: "Trend",     label: "Trend",             score: breakdown.trendScore,        family: "technical" },
    { factor: "Rel Vol",   label: "Relative volume",   score: breakdown.relVolumeScore,    family: "technical" },
    { factor: "Earnings",  label: "Earnings",          score: breakdown.fundamentalsScore, family: "fundamentals" },
    { factor: "News",      label: "News catalyst",     score: breakdown.newsScore,         family: "sentiment" },
    { factor: "Sentiment", label: "Sentiment",         score: breakdown.sentimentScore,    family: "sentiment" },
    { factor: "Risk",      label: "Risk",              score: breakdown.riskScore,         family: "smart" },
  ];

  const rows: FactorSpec[] = smartMoneyScore != null
    ? [...base, { factor: "Smart $", label: "Smart money", score: smartMoneyScore, family: "smart", smart: true }]
    : base;

  const radarData = rows.map((r) => ({
    factor: r.factor,
    score: Math.round(r.score),
    family: r.family,
  }));

  // Compute average per family to surface the "family read" callout.
  const familyAverages = computeFamilyAverages(rows);
  const dominantFamily = familyAverages[0];

  return (
    <section className={cn("rounded-[12px] border border-ink-200 bg-ink-0 p-5 md:p-6", className)}>
      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600">
            {smartMoneyScore != null ? "8-factor breakdown" : "7-factor breakdown"}
          </div>
          <p className="mt-1 font-[var(--font-sans)] text-[12px] text-ink-500">
            Four factor families · tinted in family color
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-[var(--font-mono)] text-[11px] text-ink-500 tracking-[0.02em]">
            Weighted composite
          </div>
          <div className="font-[var(--font-mono)] text-[22px] font-semibold text-ink-900 leading-none mt-1">
            {Math.round(composite)}
            <span className="text-[13px] text-ink-500 font-normal">/100</span>
          </div>
        </div>
      </header>

      {/* Family legend */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {(Object.keys(FAMILY_STYLE) as Family[]).map((f) => {
          const s = FAMILY_STYLE[f];
          const avg = familyAverages.find((x) => x.family === f);
          return (
            <div key={f} className={cn("flex items-center gap-2 px-2.5 py-1 rounded-md", s.pillBg)}>
              <span className={cn("inline-block w-2 h-2 rounded-full", s.bar)} />
              <span className={cn("font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.06em]", s.pillText)}>
                {s.label}
              </span>
              {avg && (
                <span className={cn("font-mono text-[11px] font-medium", s.pillText)}>
                  {Math.round(avg.avg)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,1fr)_1.2fr] gap-8 items-center">
        {/* Radar — dots colored by family */}
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
              <PolarGrid stroke="rgba(16,24,40,0.08)" gridType="polygon" />
              <PolarAngleAxis
                dataKey="factor"
                tick={{ fontSize: 10, fontWeight: 600, fill: "#475467" }}
              />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              {/* Baseline ring */}
              <Radar
                name="Average"
                dataKey={() => 50}
                stroke="rgba(16,24,40,0.14)"
                fill="rgba(16,24,40,0.04)"
                fillOpacity={1}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              {/* Composite shape in brand sky; dots per factor are family-tinted */}
              <Radar
                name="Score"
                dataKey="score"
                stroke="#1E63B8"
                fill="#1E63B8"
                fillOpacity={0.14}
                strokeWidth={2}
                dot={(props) => {
                  const idx = props.index ?? 0;
                  const fam = radarData[idx]?.family ?? "technical";
                  const color = FAMILY_STYLE[fam].dot;
                  return (
                    <circle
                      key={idx}
                      cx={props.cx}
                      cy={props.cy}
                      r={4}
                      fill={color}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  );
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Factor list — family-tinted bars */}
        <ol className="space-y-2">
          {rows.map((r) => (
            <FactorListRow
              key={r.factor}
              name={r.label}
              score={Math.round(r.score)}
              family={r.family}
              smart={!!r.smart}
              onClick={r.smart ? onSmartMoneyClick : undefined}
            />
          ))}
        </ol>
      </div>

      {/* Dominant-family read */}
      {dominantFamily && (
        <div className={cn("mt-5 rounded-md px-4 py-3 border-l-2", FAMILY_STYLE[dominantFamily.family].rowBg)}
             style={{ borderLeftColor: FAMILY_STYLE[dominantFamily.family].dot }}>
          <span className={cn("font-semibold text-[11px] uppercase tracking-[0.08em]", FAMILY_STYLE[dominantFamily.family].pillText)}>
            Family read:
          </span>
          <span className="ml-2 font-[var(--font-sans)] text-[12px] text-ink-800">
            {FAMILY_STYLE[dominantFamily.family].label} is the strongest family ({Math.round(dominantFamily.avg)} avg) — {describeFamily(dominantFamily.family, dominantFamily.avg)}
          </span>
        </div>
      )}
    </section>
  );
}

function FactorListRow({
  name,
  score,
  family,
  smart,
  onClick,
}: {
  name: string;
  score: number;
  family: Family;
  smart: boolean;
  onClick?: () => void;
}) {
  const pct = Math.max(0, Math.min(100, score));
  const fs = FAMILY_STYLE[family];

  return (
    <li
      onClick={onClick}
      className={cn(
        "grid grid-cols-[140px_1fr_60px] items-center gap-3 py-1.5 rounded",
        smart && "bg-ink-50 px-3 mt-2 border-t border-ink-100",
        onClick && "cursor-pointer hover:bg-ink-100",
      )}
    >
      <span className="font-[var(--font-sans)] text-[13px] font-medium text-ink-800 flex items-center gap-2">
        <span className={cn("inline-block w-1.5 h-1.5 rounded-full", fs.bar)} />
        {name}
        {smart && onClick && (
          <span className="ml-2 font-[var(--font-mono)] text-[10px] text-ink-500 font-normal">
            expanded ↓
          </span>
        )}
      </span>
      <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
        <div className={cn("h-full rounded-full", fs.bar)} style={{ width: `${pct}%` }} />
      </div>
      <span
        className={cn(
          "font-[var(--font-mono)] text-[13px] font-semibold justify-self-end",
          score >= 70 ? "text-up" : score >= 40 ? "text-ink-900" : score >= 25 ? "text-warn" : "text-down",
        )}
      >
        {score}
      </span>
    </li>
  );
}

function computeFamilyAverages(rows: FactorSpec[]): { family: Family; avg: number }[] {
  const groups = new Map<Family, number[]>();
  rows.forEach((r) => {
    const arr = groups.get(r.family) ?? [];
    arr.push(r.score);
    groups.set(r.family, arr);
  });
  return Array.from(groups.entries())
    .map(([family, scores]) => ({ family, avg: scores.reduce((a, b) => a + b, 0) / scores.length }))
    .sort((a, b) => b.avg - a.avg);
}

function describeFamily(family: Family, avg: number): string {
  const strong = avg >= 70;
  if (family === "technical") return strong ? "price action is leading this score." : "price action is soft; the thesis leans on other families.";
  if (family === "fundamentals") return strong ? "the business quality is doing the work." : "fundamentals are neutral; watch for earnings-driven re-rating.";
  if (family === "sentiment") return strong ? "news flow and tape sentiment are carrying the score — fragile if the catalyst cools." : "sentiment is quiet; score rests on structural factors.";
  return strong ? "insider + institutional + risk signals are aligned — the highest-conviction family for us." : "smart money positioning is muted; watch for disclosures in the next filing window.";
}
