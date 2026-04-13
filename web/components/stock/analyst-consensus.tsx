"use client";

import type { AnalystConsensus } from "@/lib/api";

interface Props {
  data: AnalystConsensus;
  currentPrice?: number | null;
}

const LABELS = ["Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"] as const;
const COLORS = [
  "bg-emerald-500",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-red-400",
  "bg-red-500",
];

function ratingLabel(rating: number): string {
  if (rating >= 4.5) return "Strong Buy";
  if (rating >= 3.5) return "Buy";
  if (rating >= 2.5) return "Hold";
  if (rating >= 1.5) return "Sell";
  return "Strong Sell";
}

function ratingColor(rating: number): string {
  if (rating >= 3.5) return "text-emerald-500";
  if (rating >= 2.5) return "text-amber-500";
  return "text-red-500";
}

export function AnalystConsensusWidget({ data, currentPrice }: Props) {
  const counts = [data.strongBuy, data.buy, data.hold, data.sell, data.strongSell];
  const total = data.totalAnalysts;

  if (total === 0) return null;

  const upside =
    data.targetConsensus && currentPrice
      ? ((data.targetConsensus - currentPrice) / currentPrice) * 100
      : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Analyst Consensus
        </h3>
        <span className="text-xs text-muted-foreground">
          {total} analyst{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Rating badge */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className={`font-[var(--font-heading)] text-3xl font-bold ${ratingColor(data.rating)}`}>
            {data.rating.toFixed(1)}
          </p>
          <p className={`text-xs font-semibold mt-0.5 ${ratingColor(data.rating)}`}>
            {ratingLabel(data.rating)}
          </p>
        </div>

        {/* Horizontal stacked bar */}
        <div className="flex-1 space-y-2">
          <div className="flex h-4 rounded-full overflow-hidden bg-muted/30">
            {counts.map((count, i) => {
              const pct = total > 0 ? (count / total) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={i}
                  className={`${COLORS[i]} transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${LABELS[i]}: ${count}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            {counts.map((count, i) => (
              <span key={i} className="text-center">
                <span className="block font-semibold">{count}</span>
                <span className="hidden sm:block">{LABELS[i].split(" ").pop()}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Price target */}
      {data.targetConsensus && (
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Target Price</p>
            <p className="font-[var(--font-mono)] text-lg font-bold">
              ${data.targetConsensus.toFixed(2)}
            </p>
          </div>
          {upside !== null && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Upside</p>
              <p
                className={`font-[var(--font-mono)] text-lg font-bold ${
                  upside >= 0 ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {upside >= 0 ? "+" : ""}
                {upside.toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
