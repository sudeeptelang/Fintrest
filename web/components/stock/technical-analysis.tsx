"use client";

import type { StockSnapshot } from "@/lib/api";

interface Props {
  snapshot: StockSnapshot;
}

type Signal = "Buy" | "Sell" | "Neutral";

function maSignal(pctFrom: number | null): Signal {
  if (pctFrom === null) return "Neutral";
  if (pctFrom > 2) return "Buy";
  if (pctFrom < -2) return "Sell";
  return "Neutral";
}

function rsiSignal(rsi: number | null): Signal {
  if (rsi === null) return "Neutral";
  if (rsi < 30) return "Buy";
  if (rsi > 70) return "Sell";
  return "Neutral";
}

function signalColor(signal: Signal): string {
  return signal === "Buy"
    ? "text-emerald-500"
    : signal === "Sell"
      ? "text-red-500"
      : "text-muted-foreground";
}

function signalBg(signal: Signal): string {
  return signal === "Buy"
    ? "bg-emerald-500/10"
    : signal === "Sell"
      ? "bg-red-500/10"
      : "bg-muted/30";
}

function overallSignal(signals: Signal[]): { label: string; color: string } {
  const buys = signals.filter((s) => s === "Buy").length;
  const sells = signals.filter((s) => s === "Sell").length;
  if (buys > sells + 1) return { label: "Buy", color: "text-emerald-500" };
  if (sells > buys + 1) return { label: "Sell", color: "text-red-500" };
  return { label: "Neutral", color: "text-amber-500" };
}

export function TechnicalAnalysis({ snapshot: s }: Props) {
  const maRows: { label: string; value: string; signal: Signal }[] = [
    {
      label: "SMA 20",
      value: s.ma20 ? `$${s.ma20.toFixed(2)}` : "—",
      signal: maSignal(s.pctFromMa20),
    },
    {
      label: "SMA 50",
      value: s.ma50 ? `$${s.ma50.toFixed(2)}` : "—",
      signal: maSignal(s.pctFromMa50),
    },
    {
      label: "SMA 200",
      value: s.ma200 ? `$${s.ma200.toFixed(2)}` : "—",
      signal: maSignal(s.pctFromMa200),
    },
  ];

  const oscRows: { label: string; value: string; signal: Signal }[] = [
    {
      label: "RSI (14)",
      value: s.rsi !== null ? s.rsi.toFixed(1) : "—",
      signal: rsiSignal(s.rsi),
    },
    {
      label: "ATR",
      value: s.atr !== null ? s.atr.toFixed(2) : "—",
      signal: "Neutral" as Signal,
    },
    {
      label: "ATR %",
      value: s.atrPct !== null ? `${s.atrPct.toFixed(2)}%` : "—",
      signal:
        s.atrPct !== null
          ? s.atrPct < 2
            ? "Buy"
            : s.atrPct > 5
              ? "Sell"
              : ("Neutral" as Signal)
          : ("Neutral" as Signal),
    },
  ];

  const allSignals = [...maRows, ...oscRows].map((r) => r.signal);
  const overall = overallSignal(allSignals);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Technical Analysis
        </h3>
        <span
          className={`text-sm font-bold px-3 py-1 rounded-full ${
            overall.label === "Buy"
              ? "bg-emerald-500/10 text-emerald-500"
              : overall.label === "Sell"
                ? "bg-red-500/10 text-red-500"
                : "bg-amber-500/10 text-amber-500"
          }`}
        >
          {overall.label}
        </span>
      </div>

      {/* Moving Averages */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Moving Averages
        </p>
        <div className="space-y-1.5">
          {maRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between py-1.5 px-3 rounded-lg"
            >
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <span className="font-[var(--font-mono)] text-xs">{row.value}</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-md ${signalBg(row.signal)} ${signalColor(row.signal)}`}
              >
                {row.signal}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Oscillators */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Oscillators
        </p>
        <div className="space-y-1.5">
          {oscRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between py-1.5 px-3 rounded-lg"
            >
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <span className="font-[var(--font-mono)] text-xs">{row.value}</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-md ${signalBg(row.signal)} ${signalColor(row.signal)}`}
              >
                {row.signal}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
