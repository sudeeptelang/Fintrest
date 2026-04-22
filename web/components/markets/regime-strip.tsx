"use client";

import { useMarketRegime } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * Regime strip — 5-card hero per FINTREST_UX_SPEC §05. Renders nothing
 * when the `/market/regime` endpoint hasn't been wired yet so it
 * gracefully degrades; lands with the macro classifier (MVP-2 §14.5).
 *
 * States:
 *   risk-on    → forest accent, "Low vol · tight credit · tech leading"
 *   risk-off   → rust accent,   "High vol · wide credit · flight to safety"
 *   neutral    → ink accent,    "Mixed signals · no clear regime"
 */
export function RegimeStrip() {
  const { data: regime } = useMarketRegime();
  if (!regime) return null;

  const state = regime.state;
  const stateCopy =
    state === "risk-on"
      ? { label: "Risk-on", desc: "Low vol · tight credit · risk appetite", tone: "accent" }
      : state === "risk-off"
      ? { label: "Risk-off", desc: "High vol · wide credit · flight to safety", tone: "rust" }
      : { label: "Neutral", desc: "Mixed signals · no clear regime", tone: "ink" };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 mb-4">
      <div
        className={cn(
          "rounded-md px-3 py-2.5 border",
          stateCopy.tone === "accent"
            ? "bg-forest-light border-forest text-forest-dark"
            : stateCopy.tone === "rust"
            ? "bg-rust-light border-rust text-rust-dark"
            : "bg-ink-100 border-ink-300 text-ink-800",
        )}
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-600">
          Market regime
        </div>
        <div className="text-[16px] font-semibold mt-0.5">{stateCopy.label}</div>
        <div className="text-[10px] text-ink-600 mt-0.5">{stateCopy.desc}</div>
      </div>

      <MacroCard label="VIX" value={regime.vix} />
      <MacroCard label="10Y Yield" value={regime.tenYear} suffix="%" />
      <MacroCard label="DXY" value={regime.dxy} />
      <MacroCard
        label="Updated"
        value={null}
        textOverride={
          regime.updatedAt
            ? new Date(regime.updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "—"
        }
      />
    </div>
  );
}

function MacroCard({
  label,
  value,
  suffix,
  textOverride,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  textOverride?: string;
}) {
  return (
    <div className="rounded-md px-3 py-2.5 bg-ink-50 border border-ink-200">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500">
        {label}
      </div>
      <div className="font-[var(--font-mono)] text-[15px] font-semibold text-ink-900 mt-0.5">
        {textOverride ?? (value != null ? value.toFixed(2) + (suffix ?? "") : "—")}
      </div>
    </div>
  );
}
