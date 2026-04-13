"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Flame,
  Zap,
  Calendar,
  Brain,
  Clock,
} from "lucide-react";
import {
  useMarketSummary,
  useTopPicks,
  useMarketTrending,
  useMarketMostActive,
  useMarketEarningsCalendar,
  useMarketIndices,
} from "@/lib/hooks";
import { SignalRow } from "@/components/signals/signal-row";
import type { TrendingStock, EarningsCalendarItem, Signal } from "@/lib/api";

export default function DashboardPage() {
  const { data: summary } = useMarketSummary();
  const { data: picks, isLoading } = useTopPicks(20);
  const { data: trending } = useMarketTrending(8);
  const { data: mostActive } = useMarketMostActive(8);
  const { data: earnings } = useMarketEarningsCalendar(14);
  const { data: indices } = useMarketIndices();

  const signals = picks?.signals ?? [];
  const buyCount = signals.filter((s) => s.signalType === "BUY_TODAY").length;
  const watchCount = signals.filter((s) => s.signalType === "WATCH").length;
  const topSignal = signals[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {summary?.latestScanAt
            ? `Last scan: ${new Date(summary.latestScanAt).toLocaleString()}`
            : "Good morning. Here's your market overview."}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Top Signal"
          value={topSignal?.ticker ?? "—"}
          sub={topSignal ? `Score: ${Math.round(topSignal.scoreTotal)}` : "No signals yet"}
          icon={TrendingUp}
        />
        <SummaryCard
          label="Active Signals"
          value={String(summary?.signalsToday ?? 0)}
          sub={`${buyCount} buy · ${watchCount} watch`}
          icon={Activity}
        />
        <SummaryCard
          label="Market Status"
          value={summary?.marketStatus?.replace("_", " ") ?? "—"}
          icon={BarChart3}
          capitalize
        />
        <SummaryCard
          label="Avg Score"
          value={
            signals.length > 0
              ? String(Math.round(signals.reduce((sum, s) => sum + s.scoreTotal, 0) / signals.length))
              : "—"
          }
          sub={`Across ${signals.length} stocks`}
          icon={TrendingUp}
        />
      </div>

      {/* Index strip */}
      {indices && indices.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {indices.map((idx) => {
            const positive = (idx.changePct ?? 0) >= 0;
            return (
              <div
                key={idx.ticker}
                className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {idx.label}
                  </p>
                  <p className="font-[var(--font-mono)] font-bold mt-0.5">
                    {idx.price?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "—"}
                  </p>
                </div>
                <span
                  className={`font-[var(--font-mono)] text-sm font-semibold flex items-center gap-0.5 ${
                    positive ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {idx.changePct === null ? "—" : `${positive ? "+" : ""}${idx.changePct.toFixed(2)}%`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Two-column: Athena Signals + Trending */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Athena Signals (top picks in navy card) */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-[#0d1a2e] to-[#172640] p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-[var(--font-heading)] text-lg font-semibold flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" /> Athena&apos;s Signals
            </h2>
            <Link
              href="/picks"
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {signals.length === 0 ? (
            <p className="text-sm text-white/50 text-center py-6">No signals yet.</p>
          ) : (
            <div className="space-y-3">
              {signals.slice(0, 5).map((s) => (
                <Link
                  key={s.id}
                  href={`/stock/${s.ticker}`}
                  className="flex items-center justify-between py-2 hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <span className="font-[var(--font-mono)] text-[10px] font-bold text-primary">
                        {s.ticker.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="font-[var(--font-mono)] font-semibold text-sm">{s.ticker}</p>
                      <p className="text-[10px] text-white/40">{s.stockName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-[var(--font-mono)] text-sm font-bold">{Math.round(s.scoreTotal)}</p>
                    <p className={`text-[10px] font-medium ${
                      s.signalType === "BUY_TODAY" ? "text-emerald-400" : "text-amber-400"
                    }`}>
                      {s.signalType.replace("_", " ")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Trending */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-[var(--font-heading)] text-lg font-semibold flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-500" /> Trending
            </h2>
          </div>
          {!trending || trending.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {trending.map((s) => (
                <StockMiniRow key={s.ticker} stock={s} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Two-column: Most Active + Earnings Calendar */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Most Active */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-[var(--font-heading)] text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" /> Most Active
            </h2>
          </div>
          {!mostActive || mostActive.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {mostActive.map((s) => (
                <StockMiniRow key={s.ticker} stock={s} showVolume />
              ))}
            </div>
          )}
        </div>

        {/* Earnings Calendar */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-[var(--font-heading)] text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" /> Earnings Calendar
            </h2>
          </div>
          {!earnings || earnings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No upcoming earnings in the next 14 days.
            </p>
          ) : (
            <div className="space-y-2">
              {earnings.map((e) => (
                <Link
                  key={e.ticker}
                  href={`/stock/${e.ticker}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <span className="font-[var(--font-mono)] text-[10px] font-bold text-purple-500">
                        {e.ticker.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="font-[var(--font-mono)] font-semibold text-sm">{e.ticker}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{e.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">
                      {new Date(e.earningsDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    {e.price && (
                      <p className="font-[var(--font-mono)] text-[10px] text-muted-foreground">
                        ${e.price.toFixed(2)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* In Case You Missed — yesterday's signals that are still relevant */}
      {signals.length > 5 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-[var(--font-heading)] text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" /> In Case You Missed
            </h2>
            <Link
              href="/picks"
              className="text-sm text-primary font-medium hover:text-primary/80 flex items-center gap-1"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {signals.slice(5, 12).map((s) => (
              <SignalRow key={s.id} signal={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  capitalize,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof TrendingUp;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className={`font-[var(--font-heading)] text-2xl font-bold ${capitalize ? "capitalize" : ""}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function StockMiniRow({
  stock: s,
  showVolume,
}: {
  stock: TrendingStock;
  showVolume?: boolean;
}) {
  const positive = s.changePct >= 0;
  return (
    <Link
      href={`/stock/${s.ticker}`}
      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/20 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            positive ? "bg-emerald-500/10" : "bg-red-500/10"
          }`}
        >
          <span
            className={`font-[var(--font-mono)] text-[10px] font-bold ${
              positive ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {s.ticker.slice(0, 2)}
          </span>
        </div>
        <div>
          <p className="font-[var(--font-mono)] font-semibold text-sm">{s.ticker}</p>
          <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">
            {showVolume
              ? `Vol: ${s.volume >= 1e6 ? `${(s.volume / 1e6).toFixed(1)}M` : `${(s.volume / 1e3).toFixed(0)}K`}`
              : s.sector ?? s.name}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-[var(--font-mono)] text-sm font-semibold">${s.price.toFixed(2)}</p>
        <p
          className={`font-[var(--font-mono)] text-xs font-semibold ${
            positive ? "text-emerald-500" : "text-red-500"
          }`}
        >
          {positive ? "+" : ""}
          {s.changePct.toFixed(2)}%
        </p>
      </div>
    </Link>
  );
}
