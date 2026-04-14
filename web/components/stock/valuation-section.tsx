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
import type { StockSnapshot, EarningsHistoryItem, Signal, ScreenerRow } from "@/lib/api";
import { useMarketScreener } from "@/lib/hooks";
import { StockLogo } from "@/components/stock/stock-logo";

interface Props {
  ticker: string;
  signal: Signal;
  snapshot: StockSnapshot;
  earnings: EarningsHistoryItem[] | undefined;
}

export function ValuationSection({ ticker, signal, snapshot, earnings }: Props) {
  const { data: screener } = useMarketScreener(50);

  const currentPrice = signal.currentPrice ?? snapshot.price ?? 0;
  const analystTarget = snapshot.analystTargetPrice;
  const w52High = snapshot.week52High;
  const w52Low = snapshot.week52Low;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-[var(--font-heading)] text-xl font-bold">Valuation</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Data-driven fair-value assessment based on analyst consensus, peer
          multiples, and sensitivity to key inputs.
        </p>
      </div>

      {/* Row 1: Fair Value Hero + Valuation Range */}
      <div className="grid lg:grid-cols-2 gap-6">
        <FairValueHero
          ticker={ticker}
          currentPrice={currentPrice}
          analystTarget={analystTarget}
          snapshot={snapshot}
        />
        <ValuationRangeBar
          currentPrice={currentPrice}
          analystTarget={analystTarget}
          w52Low={w52Low}
          w52High={w52High}
        />
      </div>

      {/* Row 2: Key Stats */}
      <KeyStatsGrid snapshot={snapshot} earnings={earnings} />

      {/* Row 3: Peer Comparison + Sensitivity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <PeerComparisonChart
          ticker={ticker}
          sector={snapshot.sector}
          peers={screener ?? []}
          metric="peRatio"
          currentStockPe={snapshot.peRatio ?? snapshot.forwardPe}
        />
        <SensitivityTable snapshot={snapshot} currentPrice={currentPrice} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// FAIR VALUE HERO
// ════════════════════════════════════════════════════════════════

function FairValueHero({
  ticker,
  currentPrice,
  analystTarget,
  snapshot,
}: {
  ticker: string;
  currentPrice: number;
  analystTarget: number | null;
  snapshot: StockSnapshot;
}) {
  if (!analystTarget || !currentPrice) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Analyst target not available</p>
      </div>
    );
  }

  const upsidePct = ((analystTarget - currentPrice) / currentPrice) * 100;
  const positive = upsidePct >= 0;

  // Fair value = blend of analyst target + reasonable multiple × EPS proxy
  // Simple: use analyst target directly, label as Fair Value
  const fairValue = analystTarget;

  return (
    <div className="rounded-2xl border border-primary/20 bg-card p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
          {ticker.toUpperCase()} FAIR VALUE — ANALYST CONSENSUS
        </p>
      </div>
      <div className="text-center py-6">
        <p className="font-[var(--font-heading)] text-6xl font-bold">
          ${fairValue.toFixed(2)}
        </p>
        <p className={`text-sm font-semibold mt-2 ${positive ? "text-emerald-500" : "text-red-500"}`}>
          {positive ? "+" : ""}{upsidePct.toFixed(1)}% vs current ${currentPrice.toFixed(2)}
        </p>
        {snapshot.beta !== null && (
          <p className="text-xs text-muted-foreground mt-4">
            Beta: <span className="font-[var(--font-mono)] font-semibold">{snapshot.beta.toFixed(2)}</span>
            {snapshot.pegRatio !== null && snapshot.pegRatio > 0 && (
              <> · PEG: <span className="font-[var(--font-mono)] font-semibold">{snapshot.pegRatio.toFixed(2)}</span></>
            )}
          </p>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground text-center italic mt-2">
        Based on analyst consensus. Not a guarantee of future price.
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// VALUATION RANGE BAR (Bear / Current / Target / Bull)
// ════════════════════════════════════════════════════════════════

function ValuationRangeBar({
  currentPrice,
  analystTarget,
  w52Low,
  w52High,
}: {
  currentPrice: number;
  analystTarget: number | null;
  w52Low: number | null;
  w52High: number | null;
}) {
  if (!currentPrice || !w52Low || !w52High) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Range data not available</p>
      </div>
    );
  }

  // Bear = 52W low, Bull = max(analyst target, 52W high) × 1.1
  const bear = w52Low;
  const bull = analystTarget
    ? Math.max(analystTarget, w52High) * 1.05
    : w52High * 1.1;
  const target = analystTarget ?? (w52High + w52Low) / 2;
  const range = bull - bear;

  // Positions as percentages across the bar
  const currentPos = ((currentPrice - bear) / range) * 100;
  const targetPos = ((target - bear) / range) * 100;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-4">
        Valuation Range
      </p>
      <p className="text-xs text-muted-foreground mb-6">
        Based on 52-week range + analyst consensus target.
      </p>

      {/* The bar */}
      <div className="relative h-8 mb-8">
        {/* Background gradient: red → amber → green */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500/20 via-amber-400/20 to-emerald-500/30" />

        {/* Current price marker (dashed vertical) */}
        <div
          className="absolute top-0 bottom-0 flex flex-col items-center"
          style={{ left: `${Math.max(0, Math.min(100, currentPos))}%`, transform: "translateX(-50%)" }}
        >
          <div className="h-full w-px border-l-2 border-dashed border-foreground" />
          <div className="absolute -top-5 whitespace-nowrap">
            <span className="text-[10px] font-bold">Current</span>
          </div>
        </div>

        {/* Target marker (solid) */}
        <div
          className="absolute top-0 bottom-0 flex flex-col items-center"
          style={{ left: `${Math.max(0, Math.min(100, targetPos))}%`, transform: "translateX(-50%)" }}
        >
          <div className="h-full w-1 bg-primary rounded" />
        </div>
      </div>

      {/* Labels row */}
      <div className="flex justify-between text-[10px]">
        <div className="text-left">
          <div className="text-red-500 font-bold uppercase tracking-widest">Bear</div>
          <div className="font-[var(--font-mono)] font-semibold mt-1">${bear.toFixed(0)}</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground font-bold uppercase tracking-widest">
            Current
          </div>
          <div className="font-[var(--font-mono)] font-semibold mt-1">${currentPrice.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-primary font-bold uppercase tracking-widest">Target</div>
          <div className="font-[var(--font-mono)] font-semibold mt-1">${target.toFixed(0)}</div>
        </div>
        <div className="text-right">
          <div className="text-emerald-500 font-bold uppercase tracking-widest">Bull</div>
          <div className="font-[var(--font-mono)] font-semibold mt-1">${bull.toFixed(0)}</div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// KEY STATS GRID (Alva-style: Price / TTM Rev / P/E / EV-EBITDA)
// ════════════════════════════════════════════════════════════════

function KeyStatsGrid({
  snapshot,
  earnings,
}: {
  snapshot: StockSnapshot;
  earnings: EarningsHistoryItem[] | undefined;
}) {
  // TTM revenue = sum of last 4 quarters
  const ttmRevenue = earnings && earnings.length >= 4
    ? earnings.slice(0, 4).reduce((sum, e) => sum + (e.revenue ?? 0), 0)
    : null;

  // Approximate EV = Market Cap (we don't have debt data easily)
  const ev = snapshot.marketCap;
  // EBITDA proxy = operating margin × ttm revenue
  const ebitda =
    snapshot.operatingMargin !== null && ttmRevenue !== null
      ? snapshot.operatingMargin * ttmRevenue
      : null;
  const evEbitda = ev !== null && ebitda !== null && ebitda > 0 ? ev / ebitda : null;

  const stats = [
    {
      label: "Price",
      value: snapshot.price ? `$${snapshot.price.toFixed(2)}` : "—",
    },
    {
      label: "TTM Revenue",
      value: ttmRevenue !== null ? fmtMoney(ttmRevenue) : "—",
    },
    {
      label: "P/E (TTM)",
      value: snapshot.peRatio !== null ? snapshot.peRatio.toFixed(1) + "x" : "—",
    },
    {
      label: "EV/EBITDA",
      value: evEbitda !== null ? evEbitda.toFixed(1) + "x" : "—",
    },
    {
      label: "Market Cap",
      value: snapshot.marketCap !== null ? fmtMoney(snapshot.marketCap) : "—",
    },
    {
      label: "Forward P/E",
      value: snapshot.forwardPe !== null ? snapshot.forwardPe.toFixed(1) + "x" : "—",
    },
    {
      label: "ROE",
      value:
        snapshot.returnOnEquity !== null
          ? (snapshot.returnOnEquity * 100).toFixed(1) + "%"
          : "—",
    },
    {
      label: "Op Margin",
      value:
        snapshot.operatingMargin !== null
          ? (snapshot.operatingMargin * 100).toFixed(1) + "%"
          : "—",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-border bg-card p-4"
        >
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            {s.label}
          </p>
          <p className="font-[var(--font-mono)] text-base font-bold mt-1.5">
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// PEER COMPARISON CHART
// ════════════════════════════════════════════════════════════════

function PeerComparisonChart({
  ticker,
  sector,
  peers,
  metric,
  currentStockPe,
}: {
  ticker: string;
  sector: string | null;
  peers: ScreenerRow[];
  metric: "peRatio" | "forwardPe" | "priceToBook";
  currentStockPe: number | null;
}) {
  if (!sector) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-center min-h-[280px]">
        <p className="text-sm text-muted-foreground">No sector data for peer comparison</p>
      </div>
    );
  }

  // Filter same-sector, non-self, has metric, take top 5 by market cap
  const samesector = peers
    .filter(
      (p) =>
        p.sector === sector &&
        p.ticker !== ticker &&
        p[metric] !== null &&
        p[metric]! > 0 &&
        p[metric]! < 200, // filter outliers
    )
    .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
    .slice(0, 5);

  const data = [
    {
      ticker,
      value: currentStockPe ?? 0,
      isSelf: true,
    },
    ...samesector.map((p) => ({
      ticker: p.ticker,
      value: p[metric] as number,
      isSelf: false,
    })),
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Peer P/E Comparison</h3>
        <span className="text-xs text-muted-foreground">{sector}</span>
      </div>
      {data.length < 2 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Not enough peer data
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} barCategoryGap="25%">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0,0,0,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="ticker"
              tick={{ fontSize: 11, fill: "#1a1510", fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#6b6259" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v.toFixed(0)}x`}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: "#fbfaf7",
                border: "1px solid rgba(35,29,22,0.12)",
                borderRadius: 8,
                fontSize: 12,
                color: "#1a1510",
              }}
              formatter={(value) => [`${Number(value).toFixed(1)}x`, "P/E"]}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isSelf ? "#2563EB" : "rgba(100,100,100,0.5)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SENSITIVITY TABLE (one-notch up/down on P/E)
// ════════════════════════════════════════════════════════════════

function SensitivityTable({
  snapshot,
  currentPrice,
}: {
  snapshot: StockSnapshot;
  currentPrice: number;
}) {
  // Fall back to forward P/E if TTM P/E is null (negative earnings period)
  const pe = snapshot.peRatio ?? snapshot.forwardPe;
  if (!pe || pe <= 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-center min-h-[280px]">
        <p className="text-sm text-muted-foreground">P/E not available</p>
      </div>
    );
  }

  // EPS = price / PE
  const eps = currentPrice / pe;

  // Scenarios: different P/E multiples
  const scenarios = [
    { label: "Contraction", multiple: pe * 0.8, note: "20% multiple compression" },
    { label: "Consensus", multiple: pe * 0.9, note: "10% below current" },
    { label: "Current", multiple: pe, note: "Today's market P/E" },
    { label: "Expansion", multiple: pe * 1.1, note: "10% multiple expansion" },
    { label: "Bullish", multiple: pe * 1.2, note: "20% multiple expansion" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-sm font-semibold mb-1">Sensitivity Analysis</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Implied price at different P/E multiples (EPS: ${eps.toFixed(2)})
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left pb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Scenario
            </th>
            <th className="text-right pb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              P/E
            </th>
            <th className="text-right pb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Price
            </th>
            <th className="text-right pb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Return
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {scenarios.map((s) => {
            const impliedPrice = eps * s.multiple;
            const returnPct = ((impliedPrice - currentPrice) / currentPrice) * 100;
            const isCurrent = s.label === "Current";
            return (
              <tr
                key={s.label}
                className={isCurrent ? "bg-primary/5" : ""}
              >
                <td className="py-2.5">
                  <span className={`text-xs font-semibold ${isCurrent ? "text-primary" : ""}`}>
                    {s.label}
                  </span>
                  <p className="text-[10px] text-muted-foreground">{s.note}</p>
                </td>
                <td className="py-2.5 text-right font-[var(--font-mono)] text-xs">
                  {s.multiple.toFixed(1)}x
                </td>
                <td className="py-2.5 text-right font-[var(--font-mono)] text-xs font-bold">
                  ${impliedPrice.toFixed(2)}
                </td>
                <td
                  className={`py-2.5 text-right font-[var(--font-mono)] text-xs font-semibold ${
                    returnPct >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {returnPct >= 0 ? "+" : ""}{returnPct.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

function fmtMoney(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toFixed(0)}`;
}
