"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import type { SignalBreakdown } from "@/lib/api";

export function FactorRadar({ breakdown }: { breakdown: SignalBreakdown }) {
  const data = [
    { factor: "Momentum", score: breakdown.momentumScore, fullMark: 100 },
    { factor: "Volume", score: breakdown.relVolumeScore, fullMark: 100 },
    { factor: "Catalyst", score: breakdown.newsScore, fullMark: 100 },
    { factor: "Fundamentals", score: breakdown.fundamentalsScore, fullMark: 100 },
    { factor: "Sentiment", score: breakdown.sentimentScore, fullMark: 100 },
    { factor: "Trend", score: breakdown.trendScore, fullMark: 100 },
    { factor: "Risk", score: breakdown.riskScore, fullMark: 100 },
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke="rgba(255,255,255,0.06)" />
        <PolarAngleAxis
          dataKey="factor"
          tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={false}
          axisLine={false}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#00b87c"
          fill="#00b87c"
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
