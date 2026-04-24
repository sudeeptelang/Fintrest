"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useMarketPulse } from "@/lib/hooks";
import { StockLogo } from "@/components/stock/stock-logo";

/**
 * v2 rebuild — renders the regime strip + Lens morning take as two stacked cards
 * (matches the Today screen in docs/fintrest_app_screens_v2_preview.html).
 *
 * Data preserved from the v1 AthenaPulse: regime dot, SPY return, VIX, signal
 * counts, narrative, top 3 tickers, last-scan timestamp. Dark navy surface
 * dropped; the dashboard lands on the canonical v2 Today layout.
 */
export function AthenaPulse() {
  const { data, isLoading } = useMarketPulse();
  const regimeMeta = getRegimeMeta(data?.regime);
  const spy = data?.spyReturn1d;
  const vix = data?.vixLevel;
  const spyClass =
    spy === null || spy === undefined
      ? "text-ink-500"
      : spy >= 0
      ? "text-[color:var(--up)]"
      : "text-[color:var(--down)]";
  const vixClass =
    vix === null || vix === undefined
      ? "text-ink-500"
      : vix > 25
      ? "text-[color:var(--down)]"
      : vix > 20
      ? "text-[color:var(--warn)]"
      : "text-[color:var(--up)]";

  const scanStr = data?.scanAt
    ? new Date(data.scanAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Regime strip — atom from preview: grid auto auto auto 1fr auto · 16px 24px · ink-0 · 10px · ink-200 */}
      <div className="grid grid-cols-[auto_auto_auto_1fr_auto] gap-4 sm:gap-6 items-center px-4 sm:px-6 py-4 bg-ink-0 border border-ink-200 rounded-[10px] overflow-x-auto">
        {/* Regime pill — forest-light bg, pulsing forest dot, forest-dark text */}
        <div
          className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap"
          style={{
            backgroundColor: `${regimeMeta.color}1A`,
            color: regimeMeta.colorDark,
          }}
        >
          <span className="relative inline-flex h-2 w-2 shrink-0">
            <span
              className="absolute inset-0 rounded-full"
              style={{
                backgroundColor: regimeMeta.color,
                boxShadow: `0 0 0 3px ${regimeMeta.color}26`,
                animation: "pulse 2.4s ease-in-out infinite",
              }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: regimeMeta.color }}
            />
          </span>
          {regimeMeta.label}
        </div>

        <RegimeItem label="SPY" value={spy === null || spy === undefined ? "—" : `${spy >= 0 ? "+" : ""}${spy.toFixed(2)}%`} valueClass={spyClass} />
        <RegimeItem label="VIX" value={vix === null || vix === undefined ? "—" : vix.toFixed(1)} valueClass={vixClass} />

        <div />

        <div className="text-right whitespace-nowrap">
          <div className="text-[10px] font-semibold text-ink-500 tracking-[0.14em] uppercase leading-none mb-1">
            Next scan
          </div>
          <div className="font-[var(--font-mono)] text-[16px] leading-none text-ink-900">
            Tomorrow 6:30 AM
          </div>
        </div>
      </div>

      {/* Lens's morning take — lens-bg card, forest L mark, body-lg narrative, ticker chip row */}
      <div className="rounded-[10px] border border-[rgba(15,79,58,0.18)] bg-[color:var(--lens-bg)] p-7 sm:p-8">
        <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
          <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-[5px] bg-forest text-ink-0 font-[var(--font-heading)] text-[12px] font-bold leading-none">
            L
          </span>
          <span className="text-[11px] font-semibold text-forest-dark tracking-[0.14em] uppercase leading-none">
            Lens&apos;s morning take
          </span>
          <span className="ml-auto font-[var(--font-mono)] text-[11px] text-ink-500">
            {scanStr ? `${scanStr} · ${data?.signalsToday ?? 0} signals passed` : "Scanning…"}
          </span>
        </div>

        <p className="text-[16px] leading-[28px] text-ink-800 max-w-[720px]">
          {isLoading ? "Lens is reading the tape…" : data?.narrative ?? "Lens is preparing today's read."}
        </p>

        {/* Today's research — ticker pills on lens-bg */}
        {data?.topTickers && data.topTickers.length > 0 && (
          <div className="mt-5 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-forest-dark">
              Today&apos;s research
            </span>
            {data.topTickers.map((t) => (
              <Link
                key={t}
                href={`/stock/${t}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ink-0 border border-[rgba(15,79,58,0.2)] hover:bg-forest hover:border-forest hover:text-ink-0 transition-colors group"
              >
                <StockLogo ticker={t} size={16} />
                <span className="font-[var(--font-mono)] text-xs font-semibold text-ink-800 group-hover:text-ink-0">
                  {t}
                </span>
              </Link>
            ))}
            <Link
              href="/picks"
              className="ml-auto text-[12px] text-forest-dark font-semibold hover:text-forest flex items-center gap-1"
            >
              View all signals <ArrowRight className="h-3 w-3" strokeWidth={2} />
            </Link>
          </div>
        )}

        {/* Signature rule + freshness footer */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-[rgba(15,79,58,0.15)]">
          <span className="w-6 h-px bg-forest inline-block" aria-hidden />
          <p className="text-[11px] text-ink-600 italic">
            Signal counts: {data?.buyCount ?? 0} BUY · {data?.watchCount ?? 0} WATCH · Research only — your decision.
          </p>
        </div>
      </div>

      {/* CSS keyframe for the regime pulse animation — scoped to this file */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px ${regimeMeta.color}26; }
          50%      { box-shadow: 0 0 0 6px ${regimeMeta.color}0D; }
        }
      `}</style>
    </div>
  );
}

function RegimeItem({
  label,
  value,
  valueClass = "text-ink-900",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1 whitespace-nowrap">
      <span className="text-[10px] font-semibold text-ink-500 tracking-[0.14em] uppercase leading-none">
        {label}
      </span>
      <span className={`font-[var(--font-mono)] text-[16px] font-medium leading-none ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

function getRegimeMeta(regime: string | undefined): {
  color: string;
  colorDark: string;
  label: string;
} {
  switch (regime) {
    case "bull":    return { color: "#1E63B8", colorDark: "#154785", label: "Bull regime" };
    case "bear":    return { color: "#6B5443", colorDark: "#4A3B2E", label: "Bear regime" };
    case "highvol": return { color: "#B25E09", colorDark: "#8A4A07", label: "Fear spike" };
    default:        return { color: "#1E63B8", colorDark: "#154785", label: "Neutral regime" };
  }
}
