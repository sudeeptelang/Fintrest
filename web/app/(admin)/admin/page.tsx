"use client";

import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Server,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  useAdminSystemHealth,
  useAdminRecentScans,
  useAdminRunScan,
} from "@/lib/hooks";
import type { AdminRecentScan } from "@/lib/api";

export default function AdminPage() {
  const { data: health } = useAdminSystemHealth();
  const { data: recent, isLoading: loadingScans } = useAdminRecentScans(10);
  const runScan = useAdminRunScan();

  // Derive the four stat cards from real system-health data.
  const stats = [
    {
      label: "Last Scan",
      value: health?.scan?.lastRunAt ? fmtDateTime(health.scan.lastRunAt) : "—",
      icon: Clock,
    },
    {
      label: health?.scan?.todayRan ? "Signals Today" : "Signals · last run",
      value: health?.scan?.lastRunSignals != null ? String(health.scan.lastRunSignals) : "—",
      icon: Activity,
    },
    {
      label: "Providers",
      value: health?.providers && health.providers.length > 0
        ? `${health.providers.filter((p) => p.lastOk).length} of ${health.providers.length} healthy`
        : "—",
      icon: Server,
    },
    {
      label: "Morning audience",
      value: health?.morningBriefing?.audienceSize != null
        ? String(health.morningBriefing.audienceSize)
        : "—",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold">
            Admin Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            System health and operational dashboard.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/health">
            <Button size="sm" variant="outline">Full health → </Button>
          </Link>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => runScan.mutate()}
            disabled={runScan.isPending}
          >
            {runScan.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : null}
            {runScan.isPending ? "Running…" : "Run Manual Scan"}
          </Button>
        </div>
      </div>

      {/* System stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="font-[var(--font-heading)] text-lg font-bold">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent scans — real data */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-[var(--font-heading)] text-lg font-semibold">
            Recent Scan Runs
          </h2>
          {recent && (
            <span className="font-mono text-xs text-muted-foreground">
              {recent.scans.length} runs
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Scan ID</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Started</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Completed</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Signals</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Duration</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loadingScans && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-muted-foreground text-xs">
                    Loading scan history…
                  </td>
                </tr>
              )}
              {!loadingScans && (!recent || recent.scans.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-muted-foreground text-xs">
                    No scan runs recorded yet. Run one via the button above.
                  </td>
                </tr>
              )}
              {recent?.scans.map((scan) => (
                <ScanRow key={scan.id} scan={scan} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ScanRow({ scan }: { scan: AdminRecentScan }) {
  const succeeded = (scan.status ?? "").toLowerCase() === "completed"
    || (scan.status ?? "").toLowerCase() === "success";

  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-5 py-3.5 font-[var(--font-mono)] text-xs">#{scan.id}</td>
      <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs">
        {fmtDateTime(scan.startedAt)}
      </td>
      <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs">
        {scan.completedAt ? fmtDateTime(scan.completedAt) : "—"}
      </td>
      <td className="px-5 py-3.5 text-right font-[var(--font-mono)]">
        {scan.signalsGenerated}
      </td>
      <td className="px-5 py-3.5 text-right font-[var(--font-mono)] text-muted-foreground">
        {scan.durationMs != null ? `${(scan.durationMs / 1000).toFixed(1)}s` : "—"}
      </td>
      <td className="px-5 py-3.5 text-center">
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
          succeeded
            ? "bg-emerald-500/10 text-emerald-500"
            : "bg-red-500/10 text-red-500"
        }`}>
          {succeeded ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertTriangle className="h-3 w-3" />
          )}
          {scan.status?.toLowerCase() ?? "unknown"}
        </span>
      </td>
    </tr>
  );
}

// Full date + time, local timezone. "Apr 24, 2026, 9:30:42 AM" on most
// browsers; users see both the date and the time so re-runs on the
// same day are distinguishable from yesterday's run.
function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
