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
  ReferenceLine,
} from "recharts";
import type { StockSnapshot } from "@/lib/api";

interface Props {
  snapshot: StockSnapshot;
}

export function PerformanceChart({ snapshot: s }: Props) {
  const data = [
    { period: "1W", value: s.perfWeek },
    { period: "1M", value: s.perfMonth },
    { period: "3M", value: s.perfQuarter },
    { period: "YTD", value: s.perfYtd },
    { period: "1Y", value: s.perfYear },
  ].filter((d) => d.value !== null) as { period: string; value: number }[];

  if (data.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-sm font-semibold text-muted-foreground mb-4">
        Performance
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barCategoryGap="25%">
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)", fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`}
            width={45}
          />
          <Tooltip
            contentStyle={{
              background: "#1a1510",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [
              `${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(2)}%`,
              "Return",
            ]}
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.value >= 0
                    ? "rgba(0,184,124,0.7)"
                    : "rgba(239,68,68,0.6)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
