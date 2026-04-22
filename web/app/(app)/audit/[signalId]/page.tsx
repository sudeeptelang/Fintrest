"use client";

import { use } from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useAuditLogDetail } from "@/lib/hooks";
import { cn } from "@/lib/utils";

// Audit-log signal detail per FINTREST_UX_SPEC §12 — individual signal
// page with entry/exit/outcome + factor profile at issue + Lens
// retrospective. For MVP-1 the retrospective text block is a stub
// ("retrospective text lands with the outcome classifier in MVP-2");
// every other element renders real data from the outcome cron.

export default function AuditSignalDetailPage({ params }: { params: Promise<{ signalId: string }> }) {
  const { signalId: raw } = use(params);
  const signalId = Number(raw);
  const { data, isLoading } = useAuditLogDetail(signalId);

  if (isLoading) {
    return (
      <div className="max-w-[1120px] mx-auto">
        <Breadcrumb items={[{ label: "Audit log", href: "/audit" }, { label: `#${signalId}` }]} />
        <div className="rounded-[10px] border border-ink-200 bg-ink-0 py-12 text-center text-[13px] text-ink-500">
          Loading signal…
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-[1120px] mx-auto">
        <Breadcrumb items={[{ label: "Audit log", href: "/audit" }, { label: `#${signalId}` }]} />
        <div className="rounded-[10px] border border-ink-200 bg-ink-0 px-6 py-10 text-center">
          <p className="text-[14px] font-semibold text-ink-900">Signal not found</p>
          <Link href="/audit" className="mt-3 inline-block text-[13px] text-forest hover:underline">
            Back to audit log →
          </Link>
        </div>
      </div>
    );
  }

  const isClosed = data.outcome !== "open";
  const isWin = data.outcome === "target_hit";
  const isLoss = data.outcome === "stop_hit";

  return (
    <div className="max-w-[1120px] mx-auto space-y-5">
      <Breadcrumb
        items={[
          { label: "Audit log", href: "/audit" },
          { label: `Signal #${data.signalId} · ${data.ticker}` },
        ]}
      />

      <section className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
        <div className="rounded-[10px] border border-ink-200 bg-ink-0 p-6">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="font-[var(--font-heading)] text-[22px] font-semibold text-ink-900">
              {data.ticker}
            </span>
            <span className="text-[12px] text-ink-500">{data.stockName} · {formatType(data.signalType)}</span>
            <OutcomePill outcome={data.outcome} />
          </div>
          <p className="mt-1.5 text-[12px] text-ink-600">
            Issued {formatDate(data.issuedAt)}
            {data.closedAt && <> · closed {formatDate(data.closedAt)}</>}
            {data.durationDays != null && <> · held {data.durationDays} days</>}
          </p>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Stat label="Entry" value={fmtPrice(data.entryPrice)} />
            <Stat label="Stop" value={fmtPrice(data.stopPrice)} />
            <Stat label="Target" value={fmtPrice(data.targetPrice)} />
            <Stat label="Exit" value={fmtPrice(data.exitPrice)} tone={isLoss ? "down" : isWin ? "up" : undefined} />
            <Stat
              label="Outcome"
              value={data.returnPct != null ? `${data.returnPct >= 0 ? "+" : ""}${data.returnPct.toFixed(2)}%` : "—"}
              tone={data.returnPct != null ? (data.returnPct >= 0 ? "up" : "down") : undefined}
            />
          </div>
        </div>

        {data.factorProfile && (
          <div className="rounded-[10px] border border-ink-200 bg-ink-0 p-6">
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500 mb-3">
              Factor profile at issue
            </div>
            <div className="space-y-1.5 text-[12px]">
              <FactorRow name="Momentum" score={data.factorProfile.momentum} />
              <FactorRow name="Rel volume" score={data.factorProfile.relVolume} />
              <FactorRow name="News" score={data.factorProfile.news} />
              <FactorRow name="Fundamentals" score={data.factorProfile.fundamentals} />
              <FactorRow name="Sentiment" score={data.factorProfile.sentiment} />
              <FactorRow name="Trend" score={data.factorProfile.trend} />
              <FactorRow name="Risk" score={data.factorProfile.risk} />
              <div className="pt-2 mt-2 border-t border-ink-100 flex justify-between font-semibold text-ink-900">
                <span>Composite</span>
                <span>{Math.round(data.scoreTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {isClosed && (
        <section
          className={cn(
            "rounded-[10px] border px-5 py-4",
            isLoss ? "bg-[color:rgb(254_226_226/0.4)] border-[rgba(145,32,24,0.3)]" : "bg-forest-light border-forest",
          )}
        >
          <div
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5",
              isLoss ? "text-danger" : "text-forest-dark",
            )}
          >
            Lens retrospective
          </div>
          <p className="font-[var(--font-lens)] text-[13px] leading-[22px] text-ink-800">
            {stubRetrospective(data, isWin, isLoss)}
          </p>
          <p className="mt-3 text-[10px] text-ink-500 italic">
            Full retrospective + failure-mode tagging (commodity regime,
            earnings surprise, broad selloff, etc.) ships with the outcome
            classifier in MVP-2.
          </p>
        </section>
      )}

      <section className="rounded-[10px] border border-ink-200 bg-ink-0 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[12px] text-ink-600">
          Research the ticker's current state + Lens thesis
        </div>
        <Link
          href={`/stock/${data.ticker}`}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest hover:underline"
        >
          Open {data.ticker} →
        </Link>
      </section>

      <p className="text-[11px] text-ink-400 italic">
        Educational content only — not financial advice. Past signal
        performance does not guarantee future results.
      </p>
    </div>
  );
}

function OutcomePill({ outcome }: { outcome: string }) {
  const cfg =
    outcome === "target_hit"
      ? { label: "Target hit", tone: "bg-forest-light text-forest-dark border-forest" }
      : outcome === "stop_hit"
      ? { label: "Stopped out", tone: "bg-[color:rgb(254_226_226)] text-danger border-[rgba(145,32,24,0.3)]" }
      : outcome === "horizon_expired"
      ? { label: "Horizon expired", tone: "bg-ink-100 text-ink-700 border-ink-300" }
      : { label: "Open", tone: "bg-ink-50 text-ink-600 border-ink-200" };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border", cfg.tone)}>
      {cfg.label}
    </span>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  const toneClass = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-ink-900";
  return (
    <div className="rounded-md bg-ink-50 px-3 py-2">
      <div className="text-[9px] text-ink-500 uppercase tracking-[0.08em]">{label}</div>
      <div className={cn("font-[var(--font-mono)] text-[13px] font-semibold mt-1", toneClass)}>{value}</div>
    </div>
  );
}

function FactorRow({ name, score }: { name: string; score: number }) {
  const tone = score >= 70 ? "text-up" : score >= 50 ? "text-ink-800" : score >= 30 ? "text-warn" : "text-down";
  return (
    <div className="flex justify-between">
      <span className="text-ink-600">{name}</span>
      <span className={cn("font-[var(--font-mono)] font-semibold", tone)}>{Math.round(score)}</span>
    </div>
  );
}

function stubRetrospective(
  data: { ticker: string; signalType: string; returnPct: number | null; outcome: string; targetPrice: number | null; stopPrice: number | null; entryPrice: number | null; durationDays: number | null },
  isWin: boolean,
  isLoss: boolean,
): string {
  if (isWin) {
    return `${data.ticker} hit its target${data.targetPrice != null ? ` at $${data.targetPrice.toFixed(2)}` : ""} ${data.durationDays != null ? `after ${data.durationDays} trading days` : ""}, returning ${data.returnPct?.toFixed(2) ?? "—"}%. The setup played out as the factor profile suggested.`;
  }
  if (isLoss) {
    return `${data.ticker} stopped out${data.stopPrice != null ? ` at $${data.stopPrice.toFixed(2)}` : ""}${data.durationDays != null ? ` after ${data.durationDays} trading days` : ""}, closing at a ${data.returnPct?.toFixed(2) ?? "—"}% loss. The factor profile flagged the setup's weaknesses — check the factor breakdown above to see which axes were already soft at issue.`;
  }
  return `${data.ticker} closed at its horizon ${data.durationDays != null ? `after ${data.durationDays} trading days` : ""} without hitting target or stop. Neither directional thesis resolved.`;
}

function fmtPrice(p: number | null | undefined): string {
  if (p == null) return "—";
  return `$${p.toFixed(2)}`;
}

function formatType(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
