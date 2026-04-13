"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { SignalBreakdown } from "@/lib/api";

function gradeLabel(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 40) return "D";
  return "F";
}

function gradeColor(score: number): string {
  if (score >= 70) return "#00b87c";
  if (score >= 50) return "#d97706";
  return "#d94f3d";
}

export function FactorRadar({ breakdown }: { breakdown: SignalBreakdown }) {
  const data = [
    { factor: "Momentum", score: Math.round(breakdown.momentumScore), weight: "22%" },
    { factor: "Volume", score: Math.round(breakdown.relVolumeScore), weight: "12%" },
    { factor: "Catalyst", score: Math.round(breakdown.newsScore), weight: "15%" },
    { factor: "Fundamentals", score: Math.round(breakdown.fundamentalsScore), weight: "18%" },
    { factor: "Sentiment", score: Math.round(breakdown.sentimentScore), weight: "10%" },
    { factor: "Trend", score: Math.round(breakdown.trendScore), weight: "13%" },
    { factor: "Risk", score: Math.round(breakdown.riskScore), weight: "10%" },
  ];

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="rgba(0,0,0,0.08)" gridType="polygon" />
          <PolarAngleAxis
            dataKey="factor"
            tick={({ x, y, payload }) => {
              const item = data.find((d) => d.factor === payload.value);
              const score = item?.score ?? 0;
              return (
                <g transform={`translate(${x},${y})`}>
                  <text
                    textAnchor="middle"
                    dy={-4}
                    fontSize={10}
                    fontWeight={600}
                    fill="#1a1510"
                  >
                    {payload.value}
                  </text>
                  <text
                    textAnchor="middle"
                    dy={10}
                    fontSize={11}
                    fontWeight={700}
                    fill={gradeColor(score)}
                  >
                    {score} ({gradeLabel(score)})
                  </text>
                </g>
              );
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          {/* Benchmark area at 50 (average) */}
          <Radar
            name="Average"
            dataKey={() => 50}
            stroke="rgba(0,0,0,0.1)"
            fill="rgba(0,0,0,0.03)"
            fillOpacity={1}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          {/* Actual scores */}
          <Radar
            name="Score"
            dataKey="score"
            stroke="#00b87c"
            fill="#00b87c"
            fillOpacity={0.2}
            strokeWidth={2.5}
            dot={{
              r: 4,
              fill: "#00b87c",
              stroke: "#fff",
              strokeWidth: 2,
            }}
          />
          <Tooltip
            contentStyle={{
              background: "#fbfaf7",
              border: "1px solid rgba(35,29,22,0.12)",
              borderRadius: 8,
              fontSize: 12,
              color: "#1a1510",
            }}
            formatter={(value) => [`${value} / 100`, "Score"]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
