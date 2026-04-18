"use client";

import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { useMarketPulse } from "@/lib/hooks";
import { StockLogo } from "@/components/stock/stock-logo";
import { AthenaSurface } from "@/components/ui/athena-surface";

/**
 * Athena's Pulse — the alive, editorial replacement for the static KPI strip that
 * used to sit at the top of the dashboard. Shows: regime dot, SPY move, VIX, signal
 * counts, Athena's one-line market read, and the top 3 tickers as quick links.
 *
 * Positioned as a dark navy banner (per the Athena visual treatment rule in CLAUDE.md)
 * so it anchors the dashboard with editorial weight instead of 4 sterile number cards.
 */
export function AthenaPulse() {
  const { data, isLoading } = useMarketPulse();

  const regimeMeta = getRegimeMeta(data?.regime);
  const spy = data?.spyReturn1d;
  const spyColor = spy === null || spy === undefined
    ? "text-white/60"
    : spy >= 0 ? "text-[#7fd8b6]" : "text-[#ff8a73]";
  const vix = data?.vixLevel;
  const vixColor = vix === null || vix === undefined
    ? "text-white/60"
    : vix > 25 ? "text-[#ff8a73]"
    : vix > 20 ? "text-amber-300"
    : "text-[#7fd8b6]";

  return (
    <AthenaSurface accent={regimeMeta.color}>
      <div className="p-5 md:p-6">
        {/* Top row — regime + key stats */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inset-0 rounded-full animate-ping"
                style={{ backgroundColor: regimeMeta.color, opacity: 0.5 }}
              />
              <span className="relative rounded-full h-2 w-2" style={{ backgroundColor: regimeMeta.color }} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: regimeMeta.color }}>
              {regimeMeta.label}
            </span>
          </div>

          <div className="h-4 w-px bg-white/15" />

          <PulseStat label="SPY" value={spy === null || spy === undefined ? "—" : `${spy >= 0 ? "+" : ""}${spy.toFixed(2)}%`} color={spyColor} />
          <PulseStat label="VIX" value={vix === null || vix === undefined ? "—" : vix.toFixed(1)} color={vixColor} />
          <PulseStat label="Signals" value={data?.signalsToday ?? 0} />
          <PulseStat
            label="Buy · Watch"
            value={<><span className="text-[#00b87c] font-bold">{data?.buyCount ?? 0}</span><span className="text-white/40"> · </span><span className="text-amber-300 font-bold">{data?.watchCount ?? 0}</span></>}
          />

          <div className="ml-auto flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[#00b87c]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#00b87c]">
              Lens&apos;s Take
            </span>
          </div>
        </div>

        {/* Narrative row */}
        <p className="mt-4 text-sm leading-relaxed text-white/90 max-w-4xl">
          {isLoading ? "Lens is reading the tape…" : data?.narrative ?? "Lens is preparing today's read."}
        </p>

        {/* Top tickers */}
        {data?.topTickers && data.topTickers.length > 0 && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/50">
              Today&apos;s Research
            </span>
            {data.topTickers.map((t) => (
              <Link
                key={t}
                href={`/stock/${t}`}
                className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-[#00b87c]/10 hover:border-[#00b87c]/30 transition-colors"
              >
                <StockLogo ticker={t} size={16} />
                <span className="font-[var(--font-mono)] text-xs font-bold">{t}</span>
              </Link>
            ))}
            <Link href="/picks" className="ml-auto text-[11px] text-[#00b87c] hover:underline flex items-center gap-0.5">
              View all signals <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>

      {/* Footer strip — freshness */}
      <div className="px-5 md:px-6 py-2 bg-black/25 border-t border-white/5">
        <p className="text-[10px] text-white/50">
          {data?.scanAt
            ? `Last scan: ${new Date(data.scanAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
            : "No scan yet"}
          {" · "}
          Next daily scan: 6:30 AM ET
        </p>
      </div>
    </AthenaSurface>
  );
}

function PulseStat({
  label,
  value,
  color = "text-white",
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-bold uppercase tracking-widest text-white/50">{label}</span>
      <span className={`font-[var(--font-mono)] text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}

function getRegimeMeta(regime: string | undefined): { color: string; label: string } {
  switch (regime) {
    case "bull":    return { color: "#00b87c", label: "Bull Regime" };
    case "bear":    return { color: "#ff8a73", label: "Bear Regime" };
    case "highvol": return { color: "#fbbf24", label: "Fear Spike" };
    default:        return { color: "#94a3b8", label: "Neutral Regime" };
  }
}
