import { cn } from "@/lib/utils";
import type { PortfolioReturnBreakdown } from "@/lib/api";

/**
 * Returns breakdown card — decomposes total portfolio return into its
 * components. v2 styling: ink card, tight rows, semantic tones on amounts.
 *
 *   Unrealized gains
 *   Realized gains
 *   Dividends received
 *   Currency impact (if present)
 *
 * Each row shows the dollar amount (up / down tone) and percentage of total
 * portfolio value. The total footer shows the composite return + annualized
 * CAGR + benchmark alpha.
 */
export function ReturnsBreakdown({
  data,
  className,
}: {
  data: PortfolioReturnBreakdown;
  className?: string;
}) {
  const base = data.costBasis > 0 ? data.costBasis : data.currentValue;
  const pct = (v: number) => (base > 0 ? (v / base) * 100 : 0);

  const rows = [
    { label: "Unrealized gains", value: data.unrealizedPnl, pct: pct(data.unrealizedPnl) },
    { label: "Realized gains", value: data.realizedPnl, pct: pct(data.realizedPnl) },
    { label: "Dividends received", value: data.dividendsReceived, pct: pct(data.dividendsReceived) },
  ];

  return (
    <section className={cn("rounded-[10px] border border-ink-200 bg-ink-0 px-7 py-6", className)}>
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="font-[var(--font-heading)] text-[14px] font-semibold text-ink-900">
          Returns breakdown
        </h3>
        <span className="font-[var(--font-mono)] text-[11px] text-ink-500">
          Since inception
          {data.daysSinceInception > 0 && ` · ${Math.round(data.daysSinceInception / 30)} mo`}
        </span>
      </div>

      <div className="divide-y divide-ink-100">
        {rows.map((r) => (
          <Row key={r.label} label={r.label} value={r.value} pct={r.pct} />
        ))}

        <div className="grid grid-cols-[1fr_120px_80px] items-center gap-5 py-3.5 pt-4">
          <div className="font-[var(--font-sans)] text-[13px] font-semibold text-ink-900">
            Total return
          </div>
          <div
            className={cn(
              "font-[var(--font-mono)] text-[15px] font-semibold text-right leading-none",
              data.totalReturn >= 0 ? "text-up" : "text-down",
            )}
          >
            {data.totalReturn >= 0 ? "+" : "-"}${formatMoney(Math.abs(data.totalReturn))}
          </div>
          <div
            className={cn(
              "font-[var(--font-mono)] text-[13px] font-medium text-right leading-none",
              data.totalReturnPct >= 0 ? "text-up" : "text-down",
            )}
          >
            {data.totalReturnPct >= 0 ? "+" : ""}{data.totalReturnPct.toFixed(1)}%
          </div>
        </div>
      </div>

      {(data.annualizedReturnPct != null || data.benchmarkReturnPct != null || data.alphaPct != null) && (
        <div className="mt-5 pt-4 border-t border-ink-200 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {data.annualizedReturnPct != null && (
            <FooterMetric
              label="Annualized (CAGR)"
              value={`${data.annualizedReturnPct >= 0 ? "+" : ""}${data.annualizedReturnPct.toFixed(1)}%`}
              tone={data.annualizedReturnPct >= 0 ? "up" : "down"}
            />
          )}
          {data.benchmarkReturnPct != null && (
            <FooterMetric
              label="Benchmark (SPY)"
              value={`${data.benchmarkReturnPct >= 0 ? "+" : ""}${data.benchmarkReturnPct.toFixed(1)}%`}
              tone={data.benchmarkReturnPct >= 0 ? "up" : "down"}
            />
          )}
          {data.alphaPct != null && (
            <FooterMetric
              label="Alpha vs benchmark"
              value={`${data.alphaPct >= 0 ? "+" : ""}${data.alphaPct.toFixed(1)}%`}
              tone={data.alphaPct >= 0 ? "up" : "down"}
            />
          )}
        </div>
      )}
    </section>
  );
}

function Row({ label, value, pct }: { label: string; value: number; pct: number }) {
  const tone = value === 0 ? "flat" : value > 0 ? "up" : "down";
  return (
    <div className="grid grid-cols-[1fr_120px_80px] items-center gap-5 py-3">
      <div className="font-[var(--font-sans)] text-[13px] text-ink-800">{label}</div>
      <div
        className={cn(
          "font-[var(--font-mono)] text-[14px] font-medium text-right leading-none",
          tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-ink-500",
        )}
      >
        {value === 0 ? "$0" : `${value > 0 ? "+" : "-"}$${formatMoney(Math.abs(value))}`}
      </div>
      <div className="font-[var(--font-mono)] text-[12px] text-right leading-none text-ink-500">
        {pct === 0 ? "0.0%" : `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`}
      </div>
    </div>
  );
}

function FooterMetric({ label, value, tone }: { label: string; value: string; tone: "up" | "down" }) {
  return (
    <div>
      <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500 mb-1.5">
        {label}
      </div>
      <div
        className={cn(
          "font-[var(--font-mono)] text-[18px] font-medium leading-none",
          tone === "up" ? "text-up" : "text-down",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function formatMoney(n: number): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n.toFixed(2);
}
