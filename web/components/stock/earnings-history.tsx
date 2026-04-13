"use client";

import type { EarningsHistoryItem } from "@/lib/api";

interface Props {
  earnings: EarningsHistoryItem[];
}

function fmtRevenue(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toFixed(0)}`;
}

export function EarningsHistory({ earnings }: Props) {
  if (earnings.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-sm font-semibold text-muted-foreground mb-4">
        Earnings History
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left pb-2 text-xs font-medium text-muted-foreground">
                Period
              </th>
              <th className="text-right pb-2 text-xs font-medium text-muted-foreground">
                Revenue
              </th>
              <th className="text-right pb-2 text-xs font-medium text-muted-foreground">
                Rev Growth
              </th>
              <th className="text-right pb-2 text-xs font-medium text-muted-foreground">
                EPS
              </th>
              <th className="text-right pb-2 text-xs font-medium text-muted-foreground">
                Gross Margin
              </th>
              <th className="text-right pb-2 text-xs font-medium text-muted-foreground">
                Op Margin
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {earnings.map((e, i) => (
              <tr key={i} className="hover:bg-muted/20 transition-colors">
                <td className="py-2.5 font-[var(--font-mono)] text-xs font-semibold">
                  {e.period}
                </td>
                <td className="py-2.5 text-right font-[var(--font-mono)] text-xs">
                  {fmtRevenue(e.revenue)}
                </td>
                <td
                  className={`py-2.5 text-right font-[var(--font-mono)] text-xs font-semibold ${
                    (e.revenueGrowth ?? 0) >= 0
                      ? "text-emerald-500"
                      : "text-red-500"
                  }`}
                >
                  {e.revenueGrowth !== null
                    ? `${e.revenueGrowth >= 0 ? "+" : ""}${e.revenueGrowth.toFixed(1)}%`
                    : "—"}
                </td>
                <td className="py-2.5 text-right font-[var(--font-mono)] text-xs font-semibold">
                  {e.eps !== null ? `$${e.eps.toFixed(2)}` : "—"}
                </td>
                <td className="py-2.5 text-right font-[var(--font-mono)] text-xs text-muted-foreground">
                  {e.grossMargin !== null
                    ? `${e.grossMargin.toFixed(1)}%`
                    : "—"}
                </td>
                <td className="py-2.5 text-right font-[var(--font-mono)] text-xs text-muted-foreground">
                  {e.operatingMargin !== null
                    ? `${e.operatingMargin.toFixed(1)}%`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
