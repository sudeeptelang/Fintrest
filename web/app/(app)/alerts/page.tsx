"use client";

import { motion } from "framer-motion";
import { Bell, Loader2 } from "lucide-react";
import { useAlerts } from "@/lib/hooks";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold">Alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {alerts?.filter((a) => a.active).length || 0} active &middot;{" "}
          {alerts?.length || 0} total
        </p>
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
        </div>
      ) : (
        <div className="grid gap-3">
          {alerts.map((alert, i) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    alert.active
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold capitalize">{alert.alertType.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {alert.channel} &middot;{" "}
                    {new Date(alert.createdAt).toLocaleDateString()}
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
                {alert.active ? "Active" : "Inactive"}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
