"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Mail,
  Calendar,
  Brain,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StockLogo } from "@/components/stock/stock-logo";
import {
  useTopPicks,
  useMarketSectors,
  useMarketIndices,
  useMarketNews,
  usePerformanceOverview,
} from "@/lib/hooks";

function formatWeekOf(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function WeeklySummaryPage() {
  const { data: picks, isLoading } = useTopPicks(10);
  const { data: sectors } = useMarketSectors();
  const { data: indices } = useMarketIndices();
  const { data: news } = useMarketNews(6);
  const { data: perf } = usePerformanceOverview();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const signals = picks?.signals ?? [];
  const topPick = signals[0];
  const buyCount = signals.filter((s) => s.signalType === "BUY_TODAY").length;

  // Indices: top-level US + hot assets
  const keyIndices = (indices ?? [])
    .filter((i) => ["SPY", "QQQ", "GLD", "IBIT"].includes(i.ticker))
    .slice(0, 4);

  // Sectors: best + worst
  const sortedSectors = [...(sectors ?? [])].sort(
    (a, b) => (b.changePct ?? 0) - (a.changePct ?? 0),
  );
  const bestSector = sortedSectors[0];
  const worstSector = sortedSectors[sortedSectors.length - 1];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Weekly Summary
        </p>
        <h1 className="font-[var(--font-heading)] text-3xl font-bold mt-1">
          Week of {formatWeekOf(weekStart)}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Your personalized recap of the week&apos;s signals, market action, and
          what Athena is watching next.
        </p>
      </div>

      {/* Athena's market take — hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-primary/20 bg-gradient-to-br from-[#1E1B4B] to-[#2D2A6B] p-6 text-white"
      >
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="font-[var(--font-heading)] text-lg font-semibold">
            Athena&apos;s Weekly Take
          </h2>
        </div>
        <p className="text-sm text-white/80 leading-relaxed">
          {topPick ? (
            <>
              Markets produced <strong>{signals.length} scored signals</strong> this week, with{" "}
              <strong>{buyCount} high-conviction BUY_TODAY</strong> setups. Your top pick is{" "}
              <strong>{topPick.ticker}</strong> ({topPick.stockName}) at a score of{" "}
              <strong>{Math.round(topPick.scoreTotal)}/100</strong>. The strongest sector was{" "}
              <strong>{bestSector?.sector ?? "Technology"}</strong>
              {bestSector?.changePct != null &&
                ` (${bestSector.changePct >= 0 ? "+" : ""}${bestSector.changePct.toFixed(2)}%)`}
              . Watch the Sensitivity and Analyst Consensus sections for entry timing.
            </>
          ) : (
            "No signals this week — run a scan to generate your weekly recap."
          )}
        </p>
      </motion.div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Signals Generated"
          value={String(signals.length)}
          sub={`${buyCount} buy · ${signals.length - buyCount} watch`}
        />
        <StatCard
          label="Top Score"
          value={topPick ? Math.round(topPick.scoreTotal).toString() : "—"}
          sub={topPick?.ticker ?? "No signals"}
        />
        <StatCard
          label="Win Rate"
          value={perf ? `${perf.winRate.toFixed(1)}%` : "—"}
          sub={`${perf?.totalSignals ?? 0} total tracked`}
        />
        <StatCard
          label="Avg Return"
          value={perf ? `${perf.avgReturn.toFixed(1)}%` : "—"}
          sub="Per published signal"
        />
      </div>

      {/* Market this week — indices */}
      {keyIndices.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Markets This Week</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {keyIndices.map((idx) => {
              const positive = (idx.changePct ?? 0) >= 0;
              return (
                <div key={idx.ticker} className="rounded-lg border border-border p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {idx.label}
                  </p>
                  <p className="font-[var(--font-mono)] text-base font-bold mt-1">
                    {idx.price?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "—"}
                  </p>
                  <p
                    className={`font-[var(--font-mono)] text-xs font-semibold ${
                      positive ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {positive ? (
                      <TrendingUp className="h-3 w-3 inline mr-0.5" />
                    ) : (
                      <TrendingDown className="h-3 w-3 inline mr-0.5" />
                    )}
                    {idx.changePct !== null
                      ? `${positive ? "+" : ""}${idx.changePct.toFixed(2)}%`
                      : "—"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sector winners + losers */}
      {bestSector && worstSector && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">
              Best Sector
            </p>
            <p className="font-[var(--font-heading)] text-xl font-bold">
              {bestSector.sector}
            </p>
            <p className="font-[var(--font-mono)] text-lg font-bold text-emerald-500 mt-1">
              {(bestSector.changePct ?? 0) >= 0 ? "+" : ""}
              {(bestSector.changePct ?? 0).toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {bestSector.stockCount} stocks · {bestSector.signalCount} signals
            </p>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-600 mb-2">
              Worst Sector
            </p>
            <p className="font-[var(--font-heading)] text-xl font-bold">
              {worstSector.sector}
            </p>
            <p className="font-[var(--font-mono)] text-lg font-bold text-red-500 mt-1">
              {(worstSector.changePct ?? 0) >= 0 ? "+" : ""}
              {(worstSector.changePct ?? 0).toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {worstSector.stockCount} stocks · {worstSector.signalCount} signals
            </p>
          </div>
        </div>
      )}

      {/* Top picks this week */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-[var(--font-heading)] text-lg font-semibold">
            Top 5 Picks This Week
          </h3>
          <Link
            href="/picks"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            All signals <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {signals.slice(0, 5).map((s, i) => (
            <Link
              key={s.id}
              href={`/stock/${s.ticker}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
            >
              <span className="font-[var(--font-mono)] text-xs text-muted-foreground w-5">
                #{i + 1}
              </span>
              <StockLogo ticker={s.ticker} size={32} />
              <div className="flex-1 min-w-0">
                <p className="font-[var(--font-mono)] text-sm font-bold">
                  {s.ticker}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {s.stockName}
                </p>
              </div>
              {s.currentPrice && (
                <div className="text-right">
                  <p className="font-[var(--font-mono)] text-sm font-semibold">
                    ${s.currentPrice.toFixed(2)}
                  </p>
                  {s.changePct !== null && (
                    <p
                      className={`font-[var(--font-mono)] text-xs ${
                        s.changePct >= 0 ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {s.changePct >= 0 ? "+" : ""}
                      {s.changePct.toFixed(2)}%
                    </p>
                  )}
                </div>
              )}
              <div className="text-right w-14">
                <p className="font-[var(--font-heading)] text-xl font-bold">
                  {Math.round(s.scoreTotal)}
                </p>
                <p
                  className={`text-[10px] font-bold uppercase ${
                    s.signalType === "BUY_TODAY"
                      ? "text-emerald-500"
                      : "text-amber-500"
                  }`}
                >
                  {s.signalType.replace("_", " ")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Top news */}
      {news && news.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">This Week&apos;s Headlines</h3>
          </div>
          <div className="space-y-3">
            {news.slice(0, 5).map((n, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                    (n.sentimentScore ?? 0) > 0.2
                      ? "bg-emerald-500"
                      : (n.sentimentScore ?? 0) < -0.2
                        ? "bg-red-500"
                        : "bg-amber-400"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug line-clamp-2">
                    {n.headline}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {n.source}
                    </span>
                    {n.catalystType && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                        {n.catalystType}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email CTA */}
      <div className="rounded-xl border border-border bg-muted/30 p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Get this in your inbox</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Every Friday at 4:30 PM ET. Manage preferences in{" "}
            <Link href="/settings" className="text-primary underline">
              Settings
            </Link>
            .
          </p>
        </div>
        <Link href="/settings">
          <Button variant="outline" size="sm">Settings</Button>
        </Link>
      </div>

      {/* Compliance */}
      <p className="text-[10px] text-muted-foreground text-center pt-2">
        Educational content only — not financial advice. Past signal performance
        does not guarantee future results.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="font-[var(--font-heading)] text-2xl font-bold mt-1">
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
