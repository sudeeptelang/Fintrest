"use client";

import { useState } from "react";
import Link from "next/link";
import { Newspaper, TrendingUp, Filter } from "lucide-react";
import { useMarketNews } from "@/lib/hooks";
import type { NewsItem } from "@/lib/api";

const CATALYST_FILTERS = [
  { key: "all", label: "All News" },
  { key: "earnings", label: "Earnings" },
  { key: "upgrade", label: "Upgrades" },
  { key: "product", label: "Product" },
  { key: "regulatory", label: "Regulatory" },
  { key: "m&a", label: "M&A" },
] as const;

function sentimentColor(score: number | null): string {
  if (score === null) return "bg-muted-foreground/30";
  if (score > 0.2) return "bg-emerald-500";
  if (score < -0.2) return "bg-red-500";
  return "bg-amber-400";
}

function sentimentLabel(score: number | null): string {
  if (score === null) return "Neutral";
  if (score > 0.2) return "Bullish";
  if (score < -0.2) return "Bearish";
  return "Neutral";
}

function sentimentTextColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score > 0.2) return "text-emerald-500";
  if (score < -0.2) return "text-red-500";
  return "text-amber-500";
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NewsPage() {
  const { data: news, isLoading } = useMarketNews(50);
  const [filter, setFilter] = useState<string>("all");

  const filtered = (news ?? []).filter((item) => {
    if (filter === "all") return true;
    return item.catalystType === filter;
  });

  const catalystCounts = (news ?? []).reduce(
    (acc, item) => {
      if (item.catalystType) {
        acc[item.catalystType] = (acc[item.catalystType] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold">
            Market News
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Latest stock-moving news across the S&P 500 with AI sentiment
            analysis.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Newspaper className="h-4 w-4" />
          {(news ?? []).length} articles
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {CATALYST_FILTERS.map((f) => {
          const count =
            f.key === "all"
              ? (news ?? []).length
              : catalystCounts[f.key] || 0;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-muted/30 text-muted-foreground border border-transparent hover:bg-muted/50"
              }`}
            >
              {f.label}
              {count > 0 && (
                <span className="ml-1.5 text-[10px] opacity-60">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* News list */}
      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Loading news...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No news matching this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, i) => (
            <NewsCard key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:border-border/80 transition-colors">
      <div className="flex items-start gap-4">
        {/* Sentiment indicator */}
        <div className="mt-1 flex flex-col items-center gap-1.5 shrink-0">
          <div
            className={`h-3 w-3 rounded-full ${sentimentColor(item.sentimentScore)}`}
          />
          <span
            className={`text-[9px] font-semibold uppercase tracking-wider ${sentimentTextColor(item.sentimentScore)}`}
          >
            {sentimentLabel(item.sentimentScore)}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug">{item.headline}</p>
          {item.summary && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
              {item.summary}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {item.source && (
              <span className="text-[10px] text-muted-foreground font-medium">
                {item.source}
              </span>
            )}
            {item.publishedAt && (
              <span className="text-[10px] text-muted-foreground">
                {timeAgo(item.publishedAt)}
              </span>
            )}
            {item.catalystType && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {item.catalystType}
              </span>
            )}
            {item.sentimentScore !== null && (
              <span
                className={`text-[10px] font-[var(--font-mono)] font-semibold ${sentimentTextColor(item.sentimentScore)}`}
              >
                {item.sentimentScore > 0 ? "+" : ""}
                {(item.sentimentScore * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        {/* Link out */}
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline shrink-0 mt-1"
          >
            Read →
          </a>
        )}
      </div>
    </div>
  );
}
