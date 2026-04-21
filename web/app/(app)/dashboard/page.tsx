"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTopPicks, usePlan, planMeets } from "@/lib/hooks";
import { RegimeStrip } from "@/components/today/regime-strip";
import { FeaturedSignalCard } from "@/components/today/featured-signal-card";
import { SignalTable } from "@/components/today/signal-table";
import { LensCardGated } from "@/components/lens/lens-card";
import { FilterChip } from "@/components/ui/filter-chip";
import { thesisSnippet } from "@/lib/thesis-snippet";
import type { Signal } from "@/lib/api";

type Filter = "all" | "buy" | "watch" | "breakout" | "momentum" | "dip" | "value" | "earnings";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All signals" },
  { key: "buy", label: "BUY TODAY" },
  { key: "watch", label: "WATCH" },
  { key: "breakout", label: "Breakout" },
  { key: "momentum", label: "Momentum" },
  { key: "dip", label: "Buy the dip" },
  { key: "value", label: "Value setup" },
  { key: "earnings", label: "Earnings this week" },
];

export default function TodayPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data: picks, isLoading } = useTopPicks(50);
  const { plan } = usePlan();
  const isPro = planMeets(plan, "pro");

  const signals = useMemo(() => picks?.signals ?? [], [picks]);

  const counts = useMemo(() => {
    const buys = signals.filter((s) => s.signalType.toUpperCase() === "BUY_TODAY").length;
    return { total: signals.length, buys, watch: signals.length - buys };
  }, [signals]);

  const filtered = useMemo(() => applyFilter(signals, filter), [signals, filter]);
  const featured = filtered.slice(0, 3);
  const tableSignals = filtered.slice(3);

  return (
    <div className="max-w-[1120px] mx-auto space-y-8">
      {/* Page head */}
      <header>
        <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-forest mb-3">
          Research engine · Today
        </div>
        <h1 className="font-[var(--font-heading)] text-[36px] leading-[44px] font-semibold text-ink-950 tracking-[-0.02em] mb-2">
          Today&apos;s Research
        </h1>
        <p className="font-[var(--font-mono)] text-[13px] leading-[20px] text-ink-500">
          Published {publishedAt()} · {counts.total} signals · {counts.buys} BUY TODAY · {counts.watch} WATCH · Regime: Neutral
        </p>
      </header>

      <RegimeStrip />

      {/* Lens morning take — gated for Free */}
      <LensCardGated
        eyebrow="Lens's morning take"
        title={morningTakeTitle(signals)}
        meta={`${publishedAt()} · ${counts.total} signals passed`}
        personalizedForElite
      >
        <MorningTake signals={signals} />
      </LensCardGated>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <FilterChip
            key={f.key}
            active={filter === f.key}
            count={filterCount(signals, f.key)}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </FilterChip>
        ))}
      </div>

      {/* Featured 3 */}
      {featured.length > 0 && (
        <section>
          <div className="flex items-baseline gap-3 mb-5">
            <h2 className="font-[var(--font-heading)] text-[20px] leading-[28px] font-semibold text-ink-900 tracking-[-0.005em]">
              Featured signals
            </h2>
            <span className="font-[var(--font-mono)] text-[13px] text-ink-500">
              Top 3 by score
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((s, i) => (
              <FeaturedSignalCard
                key={s.id}
                signal={s}
                thesis={thesisSnippet(s)}
                locked={!isPro && i > 0}
              />
            ))}
          </div>
        </section>
      )}

      {/* Full table */}
      {tableSignals.length > 0 && (
        <section>
          <div className="flex items-baseline gap-3 mb-5">
            <h2 className="font-[var(--font-heading)] text-[20px] leading-[28px] font-semibold text-ink-900 tracking-[-0.005em]">
              All signals
            </h2>
            <span className="font-[var(--font-mono)] text-[13px] text-ink-500">
              {tableSignals.length} more passed the bar today
            </span>
          </div>
          <SignalTable
            signals={tableSignals}
            getThesis={thesisSnippet}
            freeTier={!isPro}
          />
        </section>
      )}

      {isLoading && signals.length === 0 && (
        <div className="rounded-[10px] border border-ink-200 bg-ink-0 py-16 text-center">
          <p className="font-[var(--font-sans)] text-[13px] text-ink-500">
            Scanning the market…
          </p>
        </div>
      )}

      {!isLoading && signals.length === 0 && (
        <div className="rounded-[10px] border border-ink-200 bg-ink-0 py-16 text-center">
          <p className="font-[var(--font-sans)] text-[13px] text-ink-500">
            No signals passed the bar today. The next scan publishes tomorrow at 6:30 AM ET.
          </p>
        </div>
      )}

      <p className="text-[11px] text-ink-500 italic pt-4">
        Educational content only — not financial advice. Past signal performance does not guarantee future results.
        <Link href="/disclaimer" className="text-forest hover:underline ml-1">
          Full disclaimer →
        </Link>
      </p>
    </div>
  );
}

function applyFilter(signals: Signal[], filter: Filter): Signal[] {
  if (filter === "all") return signals;
  if (filter === "buy") return signals.filter((s) => s.signalType.toUpperCase() === "BUY_TODAY");
  if (filter === "watch") return signals.filter((s) => s.signalType.toUpperCase() !== "BUY_TODAY");
  if (filter === "momentum") return signals.filter((s) => (s.breakdown?.momentumScore ?? 0) >= 70);
  if (filter === "breakout") return signals.filter((s) => (s.breakdown?.trendScore ?? 0) >= 70);
  if (filter === "dip") return signals.filter((s) => (s.changePct ?? 0) < 0 && s.scoreTotal >= 60);
  if (filter === "value") return signals.filter((s) => (s.breakdown?.fundamentalsScore ?? 0) >= 70);
  if (filter === "earnings") return signals.filter((s) => (s.breakdown?.fundamentalsScore ?? 0) >= 60);
  return signals;
}

function filterCount(signals: Signal[], filter: Filter): number {
  return applyFilter(signals, filter).length;
}

function morningTakeTitle(signals: Signal[]): string {
  if (signals.length === 0) return "Quiet scan today.";
  const top = signals[0];
  return `${top.ticker} tops today’s scan at ${Math.round(top.scoreTotal)}.`;
}

function MorningTake({ signals }: { signals: Signal[] }) {
  if (signals.length === 0) {
    return (
      <p>
        No signals cleared the 7-factor bar this morning. The tape is sitting in a neutral regime — the next scan publishes tomorrow before the open.
      </p>
    );
  }
  const top = signals.slice(0, 3);
  const names = top.map((s) => s.ticker).join(", ");
  const buys = signals.filter((s) => s.signalType.toUpperCase() === "BUY_TODAY").length;
  return (
    <p>
      Today&apos;s scan surfaced <strong>{signals.length} signals</strong> above the 7-factor bar,
      {" "}with <strong>{buys} classified BUY TODAY</strong>. The top of the board is carried by{" "}
      <strong>{names}</strong> — momentum and relative-volume factors are doing most of the work.
      The broader tape is sitting in a neutral regime, so risk appetite is moderate; tight stops
      are recommended on anything you choose to act on.
    </p>
  );
}

function publishedAt(): string {
  const d = new Date();
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm} ${Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).format(d).split(" ").pop() ?? "ET"}`;
}
