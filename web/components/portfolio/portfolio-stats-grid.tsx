import { cn } from "@/lib/utils";

/**
 * Portfolio stats grid — 4 v2 cards at the top of a portfolio page.
 * First card is the "primary" dark card holding total value + today's change.
 * Remaining three are light cards for total returns, unrealized, dividends.
 */
export function PortfolioStatsGrid({
  totalValue,
  todayDelta,
  todayDeltaPct,
  totalReturn,
  totalReturnPct,
  totalReturnMeta,
  unrealized,
  unrealizedPct,
  dividends,
  dividendYield,
  className,
}: {
  totalValue: number;
  todayDelta?: number | null;
  todayDeltaPct?: number | null;
  totalReturn?: number | null;
  totalReturnPct?: number | null;
  totalReturnMeta?: string;
  unrealized?: number | null;
  unrealizedPct?: number | null;
  dividends?: number | null;
  dividendYield?: number | null;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      <div className="rounded-[10px] border border-ink-800 bg-ink-950 text-ink-0 px-6 py-5">
        <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400 mb-2">
          Total value
        </div>
        <div className="font-[var(--font-mono)] text-[28px] font-medium leading-none tracking-[-0.015em] mb-1.5">
          ${formatMoney(totalValue)}
        </div>
        {todayDeltaPct != null && (
          <div
            className={cn(
              "font-[var(--font-mono)] text-[13px] font-medium leading-none",
              todayDeltaPct >= 0 ? "text-up" : "text-down",
            )}
          >
            {todayDelta != null && (
              <>
                {todayDelta >= 0 ? "+" : ""}${formatMoney(Math.abs(todayDelta))} today ·{" "}
              </>
            )}
            {todayDeltaPct >= 0 ? "+" : ""}{todayDeltaPct.toFixed(2)}%
          </div>
        )}
      </div>

      <Stat
        label="Total returns"
        value={totalReturn != null ? `${totalReturn >= 0 ? "+" : "-"}$${formatMoney(Math.abs(totalReturn))}` : "—"}
        sub={
          totalReturnPct != null
            ? `${totalReturnPct >= 0 ? "+" : ""}${totalReturnPct.toFixed(1)}%${totalReturnMeta ? ` · ${totalReturnMeta}` : ""}`
            : undefined
        }
        subTone={totalReturnPct != null ? (totalReturnPct >= 0 ? "up" : "down") : undefined}
      />

      <Stat
        label="Unrealized"
        value={unrealized != null ? `${unrealized >= 0 ? "+" : "-"}$${formatMoney(Math.abs(unrealized))}` : "—"}
        sub={unrealizedPct != null ? `${unrealizedPct >= 0 ? "+" : ""}${unrealizedPct.toFixed(1)}%` : undefined}
        subTone={unrealizedPct != null ? (unrealizedPct >= 0 ? "up" : "down") : undefined}
      />

      <Stat
        label="Dividends (YTD)"
        value={dividends != null ? `$${formatMoney(dividends)}` : "—"}
        sub={dividendYield != null ? `${dividendYield.toFixed(1)}% yield` : undefined}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  subTone,
}: {
  label: string;
  value: string;
  sub?: string;
  subTone?: "up" | "down";
}) {
  return (
    <div className="rounded-[10px] border border-ink-200 bg-ink-0 px-6 py-5">
      <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500 mb-2">
        {label}
      </div>
      <div className="font-[var(--font-mono)] text-[28px] font-medium text-ink-950 leading-none tracking-[-0.015em] mb-1.5">
        {value}
      </div>
      {sub && (
        <div
          className={cn(
            "font-[var(--font-mono)] text-[13px] font-medium leading-none",
            subTone === "up" ? "text-up" : subTone === "down" ? "text-down" : "text-ink-500",
          )}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function formatMoney(n: number): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n.toFixed(2);
}
