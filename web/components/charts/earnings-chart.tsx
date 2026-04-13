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
import type { EarningsHistoryItem } from "@/lib/api";

interface Props {
  earnings: EarningsHistoryItem[];
}

export function EarningsChart({ earnings }: Props) {
  if (earnings.length === 0) return null;

  // Reverse so oldest is first (left to right chronological)
  const data = [...earnings].reverse().map((e) => ({
    period: e.period,
    revenue: e.revenue ? e.revenue / 1e9 : 0,
    eps: e.eps ?? 0,
    revenueGrowth: e.revenueGrowth ?? 0,
    grossMargin: e.grossMargin ?? 0,
  }));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Revenue (Billions)
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v.toFixed(0)}B`}
              width={50}
            />
            <Tooltip
              contentStyle={{
                background: "#1a1510",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => [`$${Number(value).toFixed(1)}B`, "Revenue"]}
            />
            <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.revenueGrowth >= 0
                      ? "rgba(0,184,124,0.6)"
                      : "rgba(239,68,68,0.5)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          EPS ($)
        </p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v.toFixed(2)}`}
              width={50}
            />
            <Tooltip
              contentStyle={{
                background: "#1a1510",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => [`$${Number(value).toFixed(2)}`, "EPS"]}
            />
            <Bar dataKey="eps" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.eps >= 0
                      ? "rgba(0,184,124,0.6)"
                      : "rgba(239,68,68,0.5)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
