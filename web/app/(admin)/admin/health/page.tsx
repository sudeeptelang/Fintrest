"use client";

import { useState } from "react";
import { RefreshCw, Play, AlertCircle, CheckCircle2, Clock, Activity } from "lucide-react";
import {
  useAdminSystemHealth,
  useAdminRunPipeline,
  useAdminRunScan,
  useAdminRunIngestion,
  useAdminRefreshQuotes,
  useAdminIngestTopCaps,
} from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { SystemHealthResponse } from "@/lib/api";

export default function AdminHealthPage() {
  const { data, isLoading, isError, refetch, isFetching } = useAdminSystemHealth();
  const runPipeline = useAdminRunPipeline();
  const runScan = useAdminRunScan();
  const runIngestion = useAdminRunIngestion();
  const refreshQuotes = useAdminRefreshQuotes();
  const ingestTopCaps = useAdminIngestTopCaps();
  const [confirm, setConfirm] = useState<"pipeline" | "scan" | "ingestion" | "quotes" | "topcaps" | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  return (
    <div className="max-w-[1120px] mx-auto space-y-6 pt-2 pb-16">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-forest mb-3">
            Admin · System health
          </div>
          <h1 className="font-[var(--font-heading)] text-[32px] leading-[40px] font-semibold text-ink-950 tracking-[-0.02em] mb-2">
            System health
          </h1>
          {data && (
            <p className="font-[var(--font-mono)] text-[13px] text-ink-500">
              Last refreshed {new Date(data.nowUtc).toLocaleTimeString()} · ET {new Date(data.nowEt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-ink-300 bg-ink-0 text-ink-800 text-[13px] font-semibold hover:border-ink-500 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} strokeWidth={1.75} />
          Refresh
        </button>
      </header>

      {isLoading && <Skeleton />}
      {isError && (
        <div className="rounded-[10px] border border-danger bg-danger-light px-6 py-5">
          <p className="text-[13px] text-ink-900">
            Failed to load /admin/system-health — check your admin role on the backend, and that the API is running.
          </p>
        </div>
      )}

      {data && (
        <>
          <StatusBanner data={data} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ScanCard data={data} />
            <BriefingCard data={data} />
            <FeatureCard data={data} />
          </div>

          {data.providers.length > 0 && <ProvidersCard data={data} />}

          <JobsCard data={data} />

          <ManualTriggers
            onRun={(which) => { setLastResult(null); setConfirm(which); }}
            confirm={confirm}
            lastResult={lastResult}
            onConfirm={async () => {
              try {
                let r: unknown;
                if (confirm === "pipeline") r = await runPipeline.mutateAsync();
                if (confirm === "scan") r = await runScan.mutateAsync();
                if (confirm === "ingestion") r = await runIngestion.mutateAsync();
                if (confirm === "quotes") r = await refreshQuotes.mutateAsync(500);
                if (confirm === "topcaps") r = await ingestTopCaps.mutateAsync(200);
                setLastResult(JSON.stringify(r));
              } catch (e) {
                setLastResult(`Error: ${String(e)}`);
              }
              setConfirm(null);
            }}
            onCancel={() => setConfirm(null)}
            loading={runPipeline.isPending || runScan.isPending || runIngestion.isPending}
          />

          {data.recentAdminActions.length > 0 && <RecentActions data={data} />}
        </>
      )}
    </div>
  );
}

function StatusBanner({ data }: { data: SystemHealthResponse }) {
  const ok = data.overallStatus === "ok";
  return (
    <section
      className={cn(
        "rounded-[10px] border px-6 py-5",
        ok
          ? "border-[rgba(10,127,79,0.2)] bg-[rgba(10,127,79,0.04)]"
          : "border-[rgba(178,94,9,0.3)] bg-warn-light",
      )}
    >
      <div className="flex items-center gap-3 mb-2">
        {ok ? (
          <CheckCircle2 className="h-5 w-5 text-up" strokeWidth={1.75} />
        ) : (
          <AlertCircle className="h-5 w-5 text-warn" strokeWidth={1.75} />
        )}
        <span
          className={cn(
            "font-[var(--font-sans)] text-[11px] font-semibold uppercase tracking-[0.14em]",
            ok ? "text-up" : "text-warn",
          )}
        >
          {ok ? "All systems OK" : `${data.alerts.length} alert${data.alerts.length === 1 ? "" : "s"}`}
        </span>
      </div>
      {!ok && (
        <ul className="list-none pl-0 space-y-1 mt-2">
          {data.alerts.map((a, i) => (
            <li key={i} className="text-[13px] leading-[20px] text-ink-800">
              · {a}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ScanCard({ data }: { data: SystemHealthResponse }) {
  const s = data.scan;
  const tone = s.todayRan ? "up" : "down";
  return (
    <div className="rounded-[10px] border border-ink-200 bg-ink-0 p-6">
      <Label>Daily scan</Label>
      <div className={cn("mt-2 font-[var(--font-mono)] text-[28px] font-medium leading-none tracking-[-0.015em]", tone === "up" ? "text-up" : "text-down")}>
        {s.todayRan ? "Ran today" : "Missing"}
      </div>
      <div className="mt-3 space-y-1 font-[var(--font-mono)] text-[12px] text-ink-500">
        <div>Last run: {fmt(s.lastRunAt)}</div>
        <div>Status: <span className="text-ink-800">{s.lastRunStatus ?? "—"}</span></div>
        <div>Signals: <span className="text-ink-800">{s.lastRunSignals ?? "—"}</span> / universe {s.lastRunUniverse ?? "—"}</div>
        <div>Hours since: {s.hoursSinceLastRun != null ? s.hoursSinceLastRun.toFixed(1) : "—"}</div>
      </div>
    </div>
  );
}

function BriefingCard({ data }: { data: SystemHealthResponse }) {
  const m = data.morningBriefing;
  const headline = m.todaySent
    ? `${m.todaySentCount} sent today`
    : m.todayStatus === "running"
      ? "Running…"
      : m.todayStatus === "failed"
        ? "Failed today"
        : "Not sent yet";
  const tone = m.todaySent
    ? "text-up"
    : m.todayStatus === "failed"
      ? "text-down"
      : "text-ink-950";
  return (
    <div className="rounded-[10px] border border-ink-200 bg-ink-0 p-6">
      <Label>Morning briefing</Label>
      <div className={cn("mt-2 font-[var(--font-mono)] text-[28px] font-medium leading-none tracking-[-0.015em]", tone)}>
        {headline}
      </div>
      <div className="mt-3 space-y-1 font-[var(--font-mono)] text-[12px] text-ink-500">
        <div>Audience: <span className="text-ink-800">{m.audienceSize} opt-ins</span></div>
        <div>Failed today: <span className={m.todayFailedCount > 0 ? "text-down" : "text-ink-800"}>{m.todayFailedCount}</span></div>
        <div>Last sent: {fmt(m.lastSentAt)}{m.lastSentCount != null && ` (${m.lastSentCount})`}</div>
        <div>Weekly audience: <span className="text-ink-800">{m.weeklyAudienceSize}</span></div>
        {m.lastWeeklyAt && <div>Last weekly: {fmt(m.lastWeeklyAt)}</div>}
        {m.lastError && (
          <div className="pt-1 text-down text-[11px] italic">Last error: {m.lastError}</div>
        )}
      </div>
    </div>
  );
}

function FeatureCard({ data }: { data: SystemHealthResponse }) {
  const f = data.featurePopulation;
  return (
    <div className="rounded-[10px] border border-ink-200 bg-ink-0 p-6">
      <Label>Feature population</Label>
      {f ? (
        <>
          <div className="mt-2 font-[var(--font-mono)] text-[28px] font-medium text-ink-950 leading-none tracking-[-0.015em]">
            {f.universeSize ?? "—"} <span className="text-[14px] text-ink-500">tickers</span>
          </div>
          <div className="mt-3 space-y-1 font-[var(--font-mono)] text-[12px] text-ink-500">
            <div>Trade date: <span className="text-ink-800">{f.tradeDate}</span></div>
            <div>Started: {fmt(f.startedAt)}</div>
            <div>Ended: {fmt(f.endedAt)}</div>
            <div>Sector fallbacks: <span className="text-ink-800">{f.sectorFallbacks}</span></div>
          </div>
        </>
      ) : (
        <div className="mt-3 text-[13px] text-ink-500">No feature run yet.</div>
      )}
    </div>
  );
}

function ProvidersCard({ data }: { data: SystemHealthResponse }) {
  return (
    <section className="rounded-[10px] border border-ink-200 bg-ink-0 overflow-hidden">
      <header className="px-6 py-4 border-b border-ink-100 flex items-baseline gap-3">
        <h3 className="font-[var(--font-heading)] text-[14px] font-semibold text-ink-900">Upstream providers</h3>
        <span className="font-[var(--font-mono)] text-[11px] text-ink-500">Last 24h</span>
      </header>
      <div className="divide-y divide-ink-100">
        {data.providers.map((p) => {
          const healthy = p.successRate >= 0.9;
          const warning = p.successRate < 0.9 && p.successRate >= 0.5;
          return (
            <div key={p.provider} className="grid grid-cols-[1fr_120px_120px_100px_auto] items-center gap-4 px-6 py-3">
              <div className="font-[var(--font-sans)] text-[13px] font-semibold text-ink-900">{p.provider}</div>
              <div className="font-[var(--font-mono)] text-[12px] text-ink-600">
                {p.successes}/{p.totalChecks} ok
              </div>
              <div
                className={cn(
                  "font-[var(--font-mono)] text-[13px] font-medium text-right",
                  healthy ? "text-up" : warning ? "text-warn" : "text-down",
                )}
              >
                {(p.successRate * 100).toFixed(0)}%
              </div>
              <div className="font-[var(--font-mono)] text-[11px] text-ink-500 text-right">
                {p.lastLatencyMs != null ? `${p.lastLatencyMs}ms` : "—"}
              </div>
              <span
                className={cn(
                  "inline-flex items-center px-2 py-[3px] rounded-[3px] border text-[10px] font-semibold tracking-[0.12em] uppercase",
                  p.lastOk
                    ? "bg-forest-light text-forest-dark border-[rgba(15,79,58,0.3)]"
                    : "bg-ink-50 text-ink-500 border-ink-200",
                )}
              >
                {p.lastOk ? "Last ok" : "Last fail"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function JobsCard({ data }: { data: SystemHealthResponse }) {
  return (
    <section className="rounded-[10px] border border-ink-200 bg-ink-0 overflow-hidden">
      <header className="px-6 py-4 border-b border-ink-100">
        <h3 className="font-[var(--font-heading)] text-[14px] font-semibold text-ink-900 flex items-center gap-2">
          <Clock className="h-4 w-4 text-forest" strokeWidth={1.75} /> Scheduled jobs
        </h3>
      </header>
      <div className="divide-y divide-ink-100">
        {data.jobs.map((j) => (
          <div key={j.name} className="grid grid-cols-[1fr_1fr_auto] gap-4 items-center px-6 py-3">
            <div className="font-[var(--font-sans)] text-[13px] font-semibold text-ink-900">{j.name}</div>
            <div className="font-[var(--font-sans)] text-[12px] text-ink-600">{j.pattern}</div>
            <div className="font-[var(--font-mono)] text-[12px] text-ink-500">
              next {fmt(j.nextFireEt)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ManualTriggers({
  onRun,
  confirm,
  onConfirm,
  onCancel,
  loading,
  lastResult,
}: {
  onRun: (which: "pipeline" | "scan" | "ingestion" | "quotes" | "topcaps") => void;
  confirm: "pipeline" | "scan" | "ingestion" | "quotes" | "topcaps" | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  lastResult?: string | null;
}) {
  return (
    <section className="rounded-[10px] border border-ink-200 bg-ink-0 px-6 py-5">
      <h3 className="font-[var(--font-heading)] text-[14px] font-semibold text-ink-900 mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-forest" strokeWidth={1.75} /> Manual triggers
      </h3>
      <div className="flex flex-wrap gap-2">
        <TriggerButton label="Refresh live quotes (500)" onClick={() => onRun("quotes")} />
        <TriggerButton label="Ingest top-caps (200)" onClick={() => onRun("topcaps")} />
        <TriggerButton label="Full pipeline" onClick={() => onRun("pipeline")} />
        <TriggerButton label="Scan only" onClick={() => onRun("scan")} />
        <TriggerButton label="Ingestion only" onClick={() => onRun("ingestion")} />
      </div>
      {lastResult && (
        <div className="mt-4 rounded-[8px] border border-ink-200 bg-ink-50 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[0.1em] text-ink-500 font-semibold mb-1">Last response</div>
          <pre className="font-mono text-[11px] text-ink-800 whitespace-pre-wrap break-all max-h-48 overflow-auto">{lastResult}</pre>
        </div>
      )}
      {confirm && (
        <div className="mt-4 rounded-[8px] border border-warn bg-warn-light px-4 py-3 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-warn shrink-0" strokeWidth={1.75} />
          <span className="text-[13px] text-ink-900 flex-1">
            Run <strong>{confirm}</strong> now? This hits live data providers and writes to the DB.
          </span>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 text-[12px] font-semibold rounded-md text-ink-700 hover:bg-ink-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-3 py-1.5 text-[12px] font-semibold rounded-md bg-warn text-ink-0 hover:bg-[#8e4707] disabled:opacity-50"
          >
            {loading ? "Running…" : "Run now"}
          </button>
        </div>
      )}
    </section>
  );
}

function TriggerButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-forest text-ink-0 text-[13px] font-semibold hover:bg-forest-dark transition-colors"
    >
      <Play className="h-3.5 w-3.5" strokeWidth={1.75} /> {label}
    </button>
  );
}

function RecentActions({ data }: { data: SystemHealthResponse }) {
  return (
    <section className="rounded-[10px] border border-ink-200 bg-ink-0 overflow-hidden">
      <header className="px-6 py-4 border-b border-ink-100">
        <h3 className="font-[var(--font-heading)] text-[14px] font-semibold text-ink-900">Recent admin actions</h3>
      </header>
      <div className="divide-y divide-ink-100">
        {data.recentAdminActions.map((a) => (
          <div key={a.id} className="grid grid-cols-[120px_160px_1fr_auto] items-center gap-4 px-6 py-3 font-[var(--font-mono)] text-[12px]">
            <span className="text-ink-500">{fmt(a.createdAt)}</span>
            <span className="text-ink-900">{a.action}</span>
            <span className="text-ink-600">{a.entityType ?? ""} {a.entityId ?? ""}</span>
            <span className="text-ink-500">by #{a.actorUserId ?? "—"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">
      {children}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-[10px] border border-ink-200 bg-ink-50 h-16" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-[10px] border border-ink-200 bg-ink-50 h-40" />
        <div className="rounded-[10px] border border-ink-200 bg-ink-50 h-40" />
        <div className="rounded-[10px] border border-ink-200 bg-ink-50 h-40" />
      </div>
    </div>
  );
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return "never";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
