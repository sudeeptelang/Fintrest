"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import type { StockSnapshot, EarningsHistoryItem, SignalBreakdown } from "@/lib/api";

type SnowflakeInput = {
  snapshot: StockSnapshot;
  earnings?: EarningsHistoryItem[];
  breakdown?: SignalBreakdown | null;
  dividendYield?: number | null;
};

// Each axis scored 0–6 (Simply Wall St uses 0–6 tier scale).
// Higher = better on that dimension.
function scoreValue(s: StockSnapshot): number {
  const pe = s.peRatio ?? s.forwardPe;
  const pb = s.priceToBook;
  const peg = s.pegRatio;
  let score = 0;
  if (pe !== null && pe !== undefined) {
    if (pe < 12) score += 2;
    else if (pe < 20) score += 1.5;
    else if (pe < 30) score += 0.75;
  }
  if (peg !== null && peg !== undefined) {
    if (peg < 1) score += 2;
    else if (peg < 1.5) score += 1.25;
    else if (peg < 2) score += 0.5;
  }
  if (pb !== null && pb !== undefined) {
    if (pb < 2) score += 2;
    else if (pb < 4) score += 1;
    else if (pb < 8) score += 0.25;
  }
  return Math.min(6, score);
}

function scoreGrowth(s: StockSnapshot): number {
  let score = 0;
  if (s.revenueGrowth !== null) {
    if (s.revenueGrowth > 25) score += 3;
    else if (s.revenueGrowth > 10) score += 2;
    else if (s.revenueGrowth > 0) score += 1;
  }
  if (s.epsGrowth !== null) {
    if (s.epsGrowth > 25) score += 3;
    else if (s.epsGrowth > 10) score += 2;
    else if (s.epsGrowth > 0) score += 1;
  }
  return Math.min(6, score);
}

function scorePast(s: StockSnapshot): number {
  let score = 0;
  if (s.perfYear !== null) {
    if (s.perfYear > 30) score += 3;
    else if (s.perfYear > 10) score += 2;
    else if (s.perfYear > 0) score += 1;
  }
  if (s.perfQuarter !== null) {
    if (s.perfQuarter > 10) score += 2;
    else if (s.perfQuarter > 0) score += 1;
  }
  if (s.week52RangePct !== null && s.week52RangePct > 70) score += 1;
  return Math.min(6, score);
}

function scoreHealth(s: StockSnapshot): number {
  let score = 0;
  if (s.debtToEquity !== null) {
    if (s.debtToEquity < 0.5) score += 2;
    else if (s.debtToEquity < 1) score += 1.25;
    else if (s.debtToEquity < 2) score += 0.5;
  }
  if (s.operatingMargin !== null) {
    if (s.operatingMargin > 0.25) score += 2;
    else if (s.operatingMargin > 0.12) score += 1.25;
    else if (s.operatingMargin > 0) score += 0.5;
  }
  if (s.returnOnEquity !== null) {
    if (s.returnOnEquity > 0.2) score += 2;
    else if (s.returnOnEquity > 0.1) score += 1.25;
    else if (s.returnOnEquity > 0) score += 0.5;
  }
  return Math.min(6, score);
}

function scoreIncome(s: StockSnapshot, dividendYield: number | null | undefined): number {
  const y = dividendYield ?? 0;
  if (y >= 5) return 6;
  if (y >= 4) return 5;
  if (y >= 3) return 4;
  if (y >= 2) return 3;
  if (y >= 1) return 2;
  if (y > 0) return 1;
  return 0;
}

export function AthenaSnowflake({ snapshot, breakdown, dividendYield }: SnowflakeInput) {
  const value = scoreValue(snapshot);
  const growth = scoreGrowth(snapshot);
  const past = scorePast(snapshot);
  const health = scoreHealth(snapshot);
  const income = scoreIncome(snapshot, dividendYield);

  const data = [
    { axis: "Value", score: value },
    { axis: "Growth", score: growth },
    { axis: "Past", score: past },
    { axis: "Health", score: health },
    { axis: "Income", score: income },
  ];

  const total = value + growth + past + health + income;
  const avg = total / 5;

  // Color tiers (0-6 scale)
  const overallTier =
    avg >= 4 ? { label: "Strong", color: "#10b981" }
    : avg >= 2.5 ? { label: "Balanced", color: "#2563eb" }
    : avg >= 1.5 ? { label: "Mixed", color: "#d97706" }
    : { label: "Weak", color: "#d94f3d" };

  const radarColor = overallTier.color;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-[var(--font-heading)] text-lg font-semibold">
            Athena Snowflake
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Five-dimensional profile · each axis scored 0–6
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Profile
          </p>
          <p className="text-sm font-semibold" style={{ color: radarColor }}>
            {overallTier.label}
          </p>
        </div>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="rgba(35,29,22,0.12)" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "#1a1510", fontSize: 11, fontWeight: 600 }}
            />
            <PolarRadiusAxis
              domain={[0, 6]}
              tick={{ fill: "#6b6259", fontSize: 9 }}
              tickCount={4}
              angle={90}
            />
            <Radar
              dataKey="score"
              stroke={radarColor}
              fill={radarColor}
              fillOpacity={0.35}
              strokeWidth={2}
              dot={{ fill: radarColor, strokeWidth: 0, r: 3 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-5 gap-2 mt-3 pt-3 border-t border-border">
        {data.map((d) => (
          <div key={d.axis} className="text-center">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {d.axis}
            </p>
            <p
              className="font-[var(--font-mono)] text-base font-bold mt-1"
              style={{
                color:
                  d.score >= 4 ? "#10b981"
                  : d.score >= 2.5 ? "#2563eb"
                  : d.score >= 1.5 ? "#d97706"
                  : "#d94f3d",
              }}
            >
              {d.score.toFixed(1)}
            </p>
          </div>
        ))}
      </div>
      {breakdown && (
        <p className="text-[10px] text-muted-foreground mt-3">
          Derived from fundamentals, growth, performance, health & income signals.
        </p>
      )}
    </div>
  );
}
