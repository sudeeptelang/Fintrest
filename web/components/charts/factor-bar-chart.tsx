"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { SignalBreakdown } from "@/lib/api";

interface Props {
  breakdown: SignalBreakdown;
}

const FACTORS = [
  { key: "momentumScore", label: "Momentum", weight: "22%" },
  { key: "fundamentalsScore", label: "Fundamentals", weight: "18%" },
  { key: "newsScore", label: "Catalyst", weight: "15%" },
  { key: "trendScore", label: "Trend", weight: "13%" },
  { key: "relVolumeScore", label: "Volume", weight: "12%" },
  { key: "sentimentScore", label: "Sentiment", weight: "10%" },
  { key: "riskScore", label: "Risk", weight: "10%" },
] as const;

function scoreColor(score: number): string {
  if (score >= 75) return "rgba(0,184,124,0.8)";
  if (score >= 60) return "rgba(0,184,124,0.5)";
  if (score >= 45) return "rgba(217,119,6,0.6)";
  return "rgba(239,68,68,0.6)";
}

function gradeLabel(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 40) return "D";
  return "F";
}

export function FactorBarChart({ breakdown }: Props) {
  const data = FACTORS.map((f) => ({
    label: f.label,
    weight: f.weight,
    score: Math.round(breakdown[f.key] as number),
    grade: gradeLabel(breakdown[f.key] as number),
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-sm font-semibold text-muted-foreground mb-4">
        Factor Scores
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" barCategoryGap="15%">
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }}
            axisLine={false}
            tickLine={false}
            width={90}
          />
          <Tooltip
            contentStyle={{
              background: "#1a1510",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, _name, props) => [
              `${Number(value)} / 100 (${(props as any).payload.grade})`,
              `${(props as any).payload.label} (${(props as any).payload.weight})`,
            ]}
          />
          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={scoreColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Grade legend */}
      <div className="flex justify-center gap-4 mt-3">
        {data.map((d) => (
          <div key={d.label} className="text-center">
            <span
              className="text-xs font-bold"
              style={{ color: scoreColor(d.score) }}
            >
              {d.grade}
            </span>
            <p className="text-[9px] text-muted-foreground">{d.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
