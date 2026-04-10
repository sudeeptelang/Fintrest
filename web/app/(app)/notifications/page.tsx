"use client";

import { motion } from "framer-motion";
import { Bell, Target, TrendingDown, Radio, Bot, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAlerts } from "@/lib/hooks";

interface Notification {
  id: number;
  icon: typeof Bell;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  time: string;
}

export default function NotificationsPage() {
  const { data: alerts, isLoading } = useAlerts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Derive notifications from alerts + static items
  const notifications: Notification[] = [];

  // Add triggered alerts as notifications
  alerts?.filter(a => !a.active).forEach(a => {
    notifications.push({
      id: a.id,
      icon: a.alertType === "stop_loss" ? TrendingDown : Target,
      iconColor: a.alertType === "stop_loss" ? "text-red-500" : "text-emerald-500",
      iconBg: a.alertType === "stop_loss" ? "bg-red-500/10" : "bg-emerald-500/10",
      title: `${a.ticker || "Stock"} — ${a.alertType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} triggered`,
      description: `Alert triggered. Review your position.`,
      time: new Date(a.createdAt).toLocaleDateString(),
    });
  });

  // Add static system notifications
  notifications.push(
    {
      id: -1,
      icon: Radio,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      title: "Today's signals ready",
      description: `${alerts?.length || 0} active alerts monitoring. Check your signals dashboard.`,
      time: "6:31 AM",
    },
    {
      id: -2,
      icon: Bot,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10",
      title: "Athena weekly brief",
      description: "Your weekly market summary is ready to review.",
      time: "Yesterday",
    },
    {
      id: -3,
      icon: Mail,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-500/10",
      title: "Morning briefing sent",
      description: "6:30 AM email delivered with top signals.",
      time: "Yesterday",
    }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">{notifications.length} notifications</p>
        </div>
        <Button variant="ghost" size="sm" className="text-primary text-xs font-semibold">
          Mark all read
        </Button>
      </div>

      <div className="grid gap-3">
        {notifications.map((notif, i) => {
          const Icon = notif.icon;
          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-3 rounded-xl border border-border bg-card px-5 py-4"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${notif.iconBg}`}>
                <Icon className={`h-4.5 w-4.5 ${notif.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{notif.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{notif.description}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">{notif.time}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
