"use client";

import { motion } from "framer-motion";
import { Bell, Plus, Loader2, Target, TrendingDown, BarChart3, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAlerts } from "@/lib/hooks";
import Link from "next/link";
import type { AlertResponse } from "@/lib/api";

const alertIcons: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  price: { icon: Bell, color: "text-blue-500", bg: "bg-blue-500/10" },
  stop_loss: { icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10" },
  target: { icon: Target, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  volume: { icon: BarChart3, color: "text-amber-500", bg: "bg-amber-500/10" },
};

function parseThreshold(json: string | null): number | null {
  if (!json) return null;
  try { return JSON.parse(json).value; } catch { return null; }
}

function AlertCard({ alert }: { alert: AlertResponse }) {
  const config = alertIcons[alert.alertType] || alertIcons.price;
  const Icon = config.icon;
  const threshold = parseThreshold(alert.thresholdJson);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-between rounded-xl border px-5 py-4 ${
        !alert.active ? "border-border bg-card opacity-60" : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bg}`}>
          <Icon className={`h-4.5 w-4.5 ${config.color}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">
              {alert.ticker || "—"} — {alert.alertType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {threshold ? (alert.alertType === "volume" ? `At ${threshold}% avg vol` : `At $${threshold.toFixed(2)}`) : "—"}
            {" · "}{alert.channel}
            {" · "}{new Date(alert.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
          alert.active
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
        }`}
      >
        {alert.active ? "Active" : "Triggered"}
      </span>
    </motion.div>
  );
}

export default function AlertsPage() {
  const { data: alerts, isLoading, error } = useAlerts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Failed to load alerts. Please try again.</p>
      </div>
    );
  }

  const triggered = alerts?.filter(a => !a.active) || [];
  const active = alerts?.filter(a => a.active) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold">Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {active.length} active · {triggered.length} triggered
          </p>
        </div>
        <Link href="/alerts/create">
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> New Alert
          </Button>
        </Link>
      </div>

      {!alerts || alerts.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-[var(--font-heading)] text-xl font-bold">No alerts yet</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Set up price, stop-loss, or target alerts from any stock detail page.
          </p>
          <Link href="/alerts/create">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white mt-2">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Create First Alert
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {triggered.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-3">
                Triggered
              </p>
              <div className="grid gap-3">
                {triggered.map(a => <AlertCard key={a.id} alert={a} />)}
              </div>
            </div>
          )}

          {active.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Active Alerts
              </p>
              <div className="grid gap-3">
                {active.map(a => <AlertCard key={a.id} alert={a} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
