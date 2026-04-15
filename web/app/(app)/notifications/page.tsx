"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bell,
  Target,
  Radio,
  Bot,
  Mail,
  Loader2,
  Calendar,
  Newspaper,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAlerts,
  useTopPicks,
  useMarketEarningsCalendar,
  useMarketNews,
  useMarketSummary,
  useCurrentUser,
} from "@/lib/hooks";

interface Notification {
  id: string;
  icon: typeof Bell;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  time: string;
  href?: string;
  timestamp: Date;
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) {
    const mins = Math.floor(diff / 60000);
    return mins < 1 ? "Just now" : `${mins}m ago`;
  }
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const { data: user } = useCurrentUser();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const { data: picks } = useTopPicks(5);
  const { data: earnings } = useMarketEarningsCalendar(7);
  const { data: news } = useMarketNews(5);
  const { data: summary } = useMarketSummary();

  if (alertsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const notifications: Notification[] = [];

  // 1. Latest scan completion
  if (summary?.latestScanAt && picks?.signals?.length) {
    const scanTime = new Date(summary.latestScanAt);
    notifications.push({
      id: "scan-complete",
      icon: Radio,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      title: `Today's scan complete · ${picks.signals.length} signals`,
      description: `Top pick: ${picks.signals[0]?.ticker} (${Math.round(picks.signals[0]?.scoreTotal)}/100)`,
      time: timeAgo(scanTime),
      href: "/picks",
      timestamp: scanTime,
    });
  }

  // 2. Morning briefing sent (if opted-in and scan is today)
  if (user?.receiveMorningBriefing && summary?.latestScanAt) {
    const scanDate = new Date(summary.latestScanAt);
    if (scanDate.toDateString() === new Date().toDateString()) {
      notifications.push({
        id: "morning-briefing",
        icon: Mail,
        iconColor: "text-blue-500",
        iconBg: "bg-blue-500/10",
        title: "Morning briefing delivered",
        description: `${picks?.signals.length ?? 0} signals sent to ${user.email}`,
        time: timeAgo(scanDate),
        timestamp: scanDate,
      });
    }
  }

  // 3. Top signals
  picks?.signals.slice(0, 3).forEach((s) => {
    notifications.push({
      id: `signal-${s.id}`,
      icon: TrendingUp,
      iconColor:
        s.signalType === "BUY_TODAY" ? "text-emerald-500" : "text-amber-500",
      iconBg:
        s.signalType === "BUY_TODAY" ? "bg-emerald-500/10" : "bg-amber-500/10",
      title: `${s.ticker} · ${s.signalType.replace("_", " ")} · Score ${Math.round(s.scoreTotal)}`,
      description:
        s.breakdown?.whyNowSummary ??
        `${s.stockName} flagged by the scoring engine`,
      time: timeAgo(new Date(s.createdAt)),
      href: `/stock/${s.ticker}`,
      timestamp: new Date(s.createdAt),
    });
  });

  // 4. Active alerts user has set up
  alerts?.slice(0, 3).forEach((a) => {
    notifications.push({
      id: `alert-${a.id}`,
      icon: Target,
      iconColor: a.active ? "text-emerald-500" : "text-muted-foreground",
      iconBg: a.active ? "bg-emerald-500/10" : "bg-muted",
      title: `${a.ticker ?? "Alert"} · ${a.alertType.replace(/_/g, " ")}`,
      description: a.active
        ? `Monitoring via ${a.channel}. Created ${new Date(a.createdAt).toLocaleDateString()}`
        : "Alert disabled",
      time: timeAgo(new Date(a.createdAt)),
      href: "/alerts",
      timestamp: new Date(a.createdAt),
    });
  });

  // 5. Upcoming earnings
  earnings?.slice(0, 3).forEach((e) => {
    const earningsDate = new Date(e.earningsDate);
    const daysAway = Math.ceil(
      (earningsDate.getTime() - Date.now()) / (1000 * 3600 * 24),
    );
    notifications.push({
      id: `earnings-${e.ticker}`,
      icon: Calendar,
      iconColor: "text-purple-500",
      iconBg: "bg-purple-500/10",
      title: `${e.ticker} reports earnings ${daysAway <= 1 ? "tomorrow" : `in ${daysAway}d`}`,
      description: `${e.name} · ${earningsDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      time: `in ${daysAway}d`,
      href: `/stock/${e.ticker}`,
      timestamp: earningsDate,
    });
  });

  // 6. Recent news with catalysts
  news?.filter((n) => n.catalystType).slice(0, 3).forEach((n, i) => {
    if (!n.publishedAt) return;
    notifications.push({
      id: `news-${i}`,
      icon: Newspaper,
      iconColor:
        (n.sentimentScore ?? 0) > 0.2
          ? "text-emerald-500"
          : (n.sentimentScore ?? 0) < -0.2
            ? "text-red-500"
            : "text-muted-foreground",
      iconBg:
        (n.sentimentScore ?? 0) > 0.2
          ? "bg-emerald-500/10"
          : (n.sentimentScore ?? 0) < -0.2
            ? "bg-red-500/10"
            : "bg-muted",
      title: n.headline,
      description: `${n.catalystType} · ${n.source ?? "News"}`,
      time: timeAgo(new Date(n.publishedAt)),
      timestamp: new Date(n.publishedAt),
    });
  });

  // Sort by timestamp desc
  notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold">
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {notifications.length} recent events
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary text-xs font-semibold"
        >
          <Bot className="h-3.5 w-3.5 mr-1" /> Mark all read
        </Button>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No notifications yet. Run a scan or set up alerts to see updates
            here.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {notifications.map((notif, i) => {
            const Icon = notif.icon;
            const Wrapper = notif.href ? Link : "div";
            const wrapperProps = notif.href
              ? { href: notif.href }
              : ({} as { href?: string });

            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
              >
                <Wrapper
                  {...(wrapperProps as { href: string })}
                  className={`flex items-start gap-3 rounded-xl border border-border bg-card px-5 py-4 ${
                    notif.href ? "hover:border-border/80 transition-colors cursor-pointer" : ""
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${notif.iconBg}`}
                  >
                    <Icon className={`h-4.5 w-4.5 ${notif.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notif.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {notif.time}
                    </p>
                  </div>
                </Wrapper>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
