"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Sparkles } from "lucide-react";
import type { AdvisorResult } from "@/lib/api";
import { AthenaSurface } from "@/components/ui/athena-surface";

/**
 * Portfolio-level Athena profile — position-weighted 7-factor radar + verdict mix.
 * Uses the same 0-100 scale as the /picks signal rows so users can compare their
 * portfolio's factor shape directly against the opportunity set.
 */
export function PortfolioAthenaProfile({ advisor }: { advisor: AdvisorResult | null | undefined }) {
  const profile = advisor?.factorProfile ?? null;
  const verdictMix = advisor?.verdictMix ?? null;
  const regime = advisor?.regimeContext ?? null;

  if (!profile) {
    return (
      <AthenaSurface>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-[#00b87c]" />
            <h3 className="font-semibold text-sm">Lens Portfolio Profile</h3>
          </div>
          <p className="text-sm text-white/60">
            Add holdings to see your position-weighted factor profile + Lens&apos;s signal mix.
          </p>
        </div>
      </AthenaSurface>
    );
  }

  const radarData = [
    { axis: "Momentum", score: profile.momentum },
    { axis: "Volume", score: profile.volume },
    { axis: "Catalyst", score: profile.catalyst },
    { axis: "Fundamental", score: profile.fundamental },
    { axis: "Sentiment", score: profile.sentiment },
    { axis: "Trend", score: profile.trend },
    { axis: "Risk", score: profile.risk },
  ];

  const avg = radarData.reduce((s, r) => s + r.score, 0) / radarData.length;
  const radarColor = avg >= 70 ? "#00b87c" : avg >= 55 ? "#3b6fd4" : avg >= 40 ? "#fbbf24" : "#ff8a73";
  const regimeMeta = getRegimeMeta(regime);

  const verdicts = verdictMix ? Object.entries(verdictMix).sort((a, b) => b[1] - a[1]) : [];
  const total = verdicts.reduce((s, [, n]) => s + n, 0);

  return (
    <AthenaSurface accent={radarColor}>
      <div className="p-5 md:p-6">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#00b87c]" />
            <h3 className="font-semibold text-sm">Lens Portfolio Profile</h3>
          </div>
          {regime && (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: regimeMeta.color, opacity: 0.5 }} />
                <span className="relative rounded-full h-2 w-2" style={{ backgroundColor: regimeMeta.color }} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: regimeMeta.color }}>
                {regimeMeta.label}
              </span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Radar — position-weighted factors */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">
              Position-Weighted Factor Profile
            </p>
            <p className="text-[11px] text-white/70 mb-2">
              Same 0-100 scale as /picks signals. Based on {profile.coverage} holding{profile.coverage === 1 ? "" : "s"} with active signals.
            </p>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke="rgba(255,255,255,0.12)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 600 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9 }} angle={90} />
                  <Radar
                    dataKey="score"
                    stroke={radarColor}
                    fill={radarColor}
                    fillOpacity={0.35}
                    strokeWidth={2}
                    dot={{ fill: radarColor, strokeWidth: 0, r: 3 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Verdict mix */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">
              Verdict Mix
            </p>
            <p className="text-[11px] text-white/70 mb-3">
              How Lens classifies each of your holdings today.
            </p>
            {verdicts.length === 0 ? (
              <p className="text-xs text-white/60">No verdicts yet — holdings need active signals first.</p>
            ) : (
              <div className="space-y-2">
                {verdicts.map(([v, count]) => {
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  const meta = getVerdictMeta(v);
                  return (
                    <div key={v}>
                      <div className="flex items-center justify-between text-[11px] mb-0.5">
                        <span className="font-semibold" style={{ color: meta.color }}>{v}</span>
                        <span className="text-white/70 font-[var(--font-mono)]">
                          {count} · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: meta.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <p className="text-[10px] text-white/40 leading-relaxed pt-3 mt-4 border-t border-white/10">
          Factor scores are position-weighted across holdings with active signals. Signal mix reflects
          Lens&apos;s classifier run against the current regime. Research only — not financial advice.
        </p>
      </div>
    </AthenaSurface>
  );
}

function getRegimeMeta(regime: string | null): { color: string; label: string } {
  switch (regime) {
    case "bull":    return { color: "#00b87c", label: "Bull Regime" };
    case "bear":    return { color: "#ff8a73", label: "Bear Regime" };
    case "highvol": return { color: "#fbbf24", label: "Fear Spike" };
    default:        return { color: "#94a3b8", label: "Neutral Regime" };
  }
}

function getVerdictMeta(v: string): { color: string } {
  switch (v) {
    case "Buy the Dip":     return { color: "#00b87c" };
    case "Breakout Setup":  return { color: "#3b6fd4" };
    case "Momentum Run":    return { color: "#00b87c" };
    case "Value Setup":     return { color: "#7c5fd4" };
    case "Event-Driven":    return { color: "#c084fc" };
    case "Defensive Hold":  return { color: "#64748b" };
    case "Mean Reversion":  return { color: "#fbbf24" };
    case "Quality Setup":   return { color: "#00b87c" };
    default:                return { color: "#94a3b8" };
  }
}
