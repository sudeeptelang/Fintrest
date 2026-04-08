"use client";

import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const systemStats = [
  { label: "Last Scan", value: "6:28 AM ET", status: "ok", icon: Clock },
  { label: "Signals Generated", value: "12", status: "ok", icon: Activity },
  { label: "Provider Status", value: "All Healthy", status: "ok", icon: Server },
  { label: "Alerts Sent", value: "1,247", status: "ok", icon: CheckCircle2 },
];

const recentScans = [
  { id: "scan_048", time: "6:28 AM", signals: 12, duration: "4.2s", status: "success" },
  { id: "scan_047", time: "6:28 AM (prev)", signals: 11, duration: "3.8s", status: "success" },
  { id: "scan_046", time: "6:28 AM (prev)", signals: 13, duration: "5.1s", status: "success" },
  { id: "scan_045", time: "6:28 AM (prev)", signals: 10, duration: "4.0s", status: "success" },
  { id: "scan_044", time: "6:28 AM (prev)", signals: 0, duration: "1.2s", status: "failed" },
];

export default function AdminPage() {
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
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
          Run Manual Scan
        </Button>
      </div>

      {/* System stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {systemStats.map((stat, i) => (
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

      {/* Recent scans */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-[var(--font-heading)] text-lg font-semibold">
            Recent Scan Runs
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Scan ID</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Time</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Signals</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Duration</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentScans.map((scan) => (
                <tr key={scan.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5 font-[var(--font-mono)] text-xs">{scan.id}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{scan.time}</td>
                  <td className="px-5 py-3.5 text-right font-[var(--font-mono)]">{scan.signals}</td>
                  <td className="px-5 py-3.5 text-right font-[var(--font-mono)] text-muted-foreground">{scan.duration}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                      scan.status === "success"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-red-500/10 text-red-500"
                    }`}>
                      {scan.status === "success" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      {scan.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
