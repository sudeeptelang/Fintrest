"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Bell, Plus, TrendingUp, TrendingDown, Target, BarChart3, Newspaper, Clock3, CheckCircle2, Info } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useAlerts, useTopPicks, useMarketNews } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { AlertResponse } from "@/lib/api";

// Unified Inbox — replaces the split /alerts + /notifications pages per
// FINTREST_UX_SPEC §14. Filter chips: All · Signals · Alerts · Reviews ·
// System. Each item is a tappable row that deep-links into the relevant
// ticker or configuration page.
//
// Minimal-change approach: pulls from existing hooks (useAlerts,
// useTopPicks, useMarketNews). Review flags + system notifications stay
// synthetic until we have dedicated data sources; the UI shape is
// correct so swapping in real feeds later is a thin-diff.

type Filter = "all" | "signals" | "alerts" | "reviews" | "system";

type InboxItem = {
  id: string;
  kind: Filter;
  title: string;
  body: string;
  meta: string;
  timestamp: Date;
  href?: string;
  unread?: boolean;
};

export default function InboxPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data: alerts } = useAlerts();
  const { data: topPicks } = useTopPicks(8);
  const { data: news } = useMarketNews(5);

  const items = useMemo<InboxItem[]>(() => {
    const out: InboxItem[] = [];

    // Signals — today's drop (top picks). Shown as "new signal" events.
    (topPicks?.signals ?? []).slice(0, 6).forEach((s, i) => {
      out.push({
        id: `signal-${s.id}`,
        kind: "signals",
        title: `${s.ticker} · Signal #${s.id}`,
        body: `Composite ${Math.round(s.scoreTotal)} · ${s.horizonDays ?? 15}–${(s.horizonDays ?? 15) + 5} day horizon`,
        meta: "Today's drop",
        timestamp: new Date(s.createdAt),
        href: `/stock/${s.ticker}`,
        unread: i < 3,
      });
    });

    // Alerts — user-defined triggers (active + triggered history).
    (alerts ?? []).slice(0, 8).forEach((a) => {
      out.push({
        id: `alert-${a.id}`,
        kind: "alerts",
        title: `${a.ticker ?? "—"} · ${formatAlertType(a.alertType)}`,
        body: describeAlert(a),
        meta: a.active ? "Active" : "Triggered",
        timestamp: new Date(a.createdAt),
        href: a.ticker ? `/stock/${a.ticker}` : "/inbox",
      });
    });

    // System — product + news items (placeholder; real events land as
    // we wire portfolio review flags + audit-log close events).
    (news ?? []).slice(0, 3).forEach((n) => {
      out.push({
        id: `sys-${n.id}`,
        kind: "system",
        title: n.headline.slice(0, 80) + (n.headline.length > 80 ? "…" : ""),
        body: n.source ?? "Fintrest system",
        meta: "Market news",
        timestamp: n.publishedAt ? new Date(n.publishedAt) : new Date(),
        href: n.url ?? undefined,
      });
    });

    return out.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [alerts, topPicks, news]);

  const filtered = filter === "all" ? items : items.filter((i) => i.kind === filter);
  const unreadCount = items.filter((i) => i.unread).length;

  return (
    <div className="max-w-[1120px] mx-auto">
      <Breadcrumb items={[{ label: "Inbox" }]} />

      <header className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-[var(--font-heading)] text-[22px] leading-[28px] font-semibold text-ink-900">
            Inbox
          </h1>
          <p className="mt-1 text-[13px] text-ink-600">
            {unreadCount > 0 ? `${unreadCount} unread · ` : ""}
            {items.length} item{items.length === 1 ? "" : "s"} · filter below
          </p>
        </div>
        <Link
          href="/alerts/create"
          className="inline-flex items-center gap-1.5 bg-forest text-ink-0 px-3.5 py-2 rounded-md text-[13px] font-semibold hover:bg-forest-dark transition-colors"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          New alert
        </Link>
      </header>

      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "signals", "alerts", "reviews", "system"] as const).map((f) => {
          const count = f === "all" ? items.length : items.filter((i) => i.kind === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors",
                filter === f
                  ? "bg-forest-light border-forest text-forest-dark"
                  : "bg-ink-0 border-ink-200 text-ink-600 hover:border-ink-400",
              )}
            >
              {labelFor(f)}
              <span className="font-[var(--font-mono)] text-[10px] text-ink-400">{count}</span>
            </button>
          );
        })}
      </div>

      <section className="rounded-[10px] border border-ink-200 bg-ink-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Bell className="h-5 w-5 text-ink-300 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-[13px] text-ink-500">
              {filter === "all"
                ? "Nothing yet. New signals and alerts will land here."
                : `No ${labelFor(filter).toLowerCase()} right now.`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {filtered.map((item) => (
              <InboxRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>

      <p className="mt-4 text-[11px] text-ink-400">
        Reviews and system notifications currently surface from your alerts
        + news feeds. Portfolio review flags (holdings whose Lens score
        dropped 20+ pts) and signal-close retrospectives land in MVP-2.
      </p>
    </div>
  );
}

function InboxRow({ item }: { item: InboxItem }) {
  const { icon: Icon, tone } = iconFor(item);
  const content = (
    <div className="flex items-start gap-4 px-6 py-4">
      <div
        className={cn(
          "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
          tone,
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.7} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h3 className={cn("text-[13px] font-semibold text-ink-900", item.unread && "font-bold")}>
            {item.title}
          </h3>
          {item.unread && <span className="h-1.5 w-1.5 rounded-full bg-forest shrink-0 mt-2" />}
        </div>
        <p className="text-[12px] text-ink-600 mt-0.5">{item.body}</p>
        <p className="text-[10px] text-ink-400 mt-1">
          {item.meta} · {timeAgo(item.timestamp)}
        </p>
      </div>
    </div>
  );

  if (item.href) {
    return (
      <li>
        <Link href={item.href} className="block hover:bg-ink-50 transition-colors">
          {content}
        </Link>
      </li>
    );
  }
  return <li>{content}</li>;
}

function iconFor(item: InboxItem): { icon: typeof Bell; tone: string } {
  switch (item.kind) {
    case "signals":
      return { icon: TrendingUp, tone: "bg-forest-light text-forest-dark" };
    case "alerts":
      return { icon: Bell, tone: "bg-rust-light text-rust-dark" };
    case "reviews":
      return { icon: CheckCircle2, tone: "bg-ink-100 text-ink-700" };
    case "system":
      return { icon: Info, tone: "bg-ink-100 text-ink-600" };
    default:
      return { icon: Bell, tone: "bg-ink-100 text-ink-600" };
  }
}

function labelFor(f: Filter): string {
  switch (f) {
    case "all": return "All";
    case "signals": return "Signals";
    case "alerts": return "Alerts";
    case "reviews": return "Reviews";
    case "system": return "System";
  }
}

function formatAlertType(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function describeAlert(a: AlertResponse): string {
  if (!a.thresholdJson) return "Threshold not set";
  try {
    const trigger = JSON.parse(a.thresholdJson).value as number | undefined;
    if (trigger == null) return `Channel ${a.channel}`;
    if (a.alertType === "volume") return `Trigger at ${trigger}% of avg volume · ${a.channel}`;
    return `Trigger at $${trigger.toFixed(2)} · ${a.channel}`;
  } catch {
    return `Channel ${a.channel}`;
  }
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
