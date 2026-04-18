"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { api, type NewsItem } from "@/lib/api";
import { AthenaSurface } from "@/components/ui/athena-surface";
import Link from "next/link";
import { StockLogo } from "@/components/stock/stock-logo";

/**
 * Side-drawer news reader. User clicks a news item → this opens → Athena generates a
 * 2-3 sentence take tied to the ticker's context (first click only; cached for future views).
 * User can then click through to the source for the full article. Source links open in a new tab.
 */
export function NewsReaderDrawer({
  item,
  onClose,
}: {
  item: NewsItem | null;
  onClose: () => void;
}) {
  const open = item !== null;

  const { data: summary, isLoading } = useQuery({
    queryKey: ["news-athena", item?.id],
    queryFn: () => api.newsAthenaSummary(item!.id),
    enabled: open && !!item?.id,
    staleTime: Infinity, // summaries never change
  });

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !item) return null;

  const sentimentLabel =
    item.sentimentScore === null ? null
    : item.sentimentScore > 0.3 ? "Positive"
    : item.sentimentScore < -0.3 ? "Negative"
    : "Neutral";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 animate-in fade-in"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-screen w-full max-w-[560px] bg-background z-50 shadow-2xl overflow-y-auto animate-in slide-in-from-right">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            {item.ticker && <StockLogo ticker={item.ticker} size={28} />}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {item.ticker ?? "Market"} · {item.source ?? "Source"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {item.publishedAt && new Date(item.publishedAt).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
                {sentimentLabel && <> · <span className={
                  sentimentLabel === "Positive" ? "text-emerald-500" :
                  sentimentLabel === "Negative" ? "text-red-500" : ""
                }>{sentimentLabel}</span></>}
                {item.catalystType && <> · <span className="text-primary font-semibold">{item.catalystType}</span></>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Headline */}
          <h2 className="font-[var(--font-heading)] text-xl font-bold leading-tight">
            {item.headline}
          </h2>

          {/* Athena Take — navy card */}
          <AthenaSurface>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-[#00b87c]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#00b87c]">
                  Lens&apos;s Take
                </span>
                {item.ticker && (
                  <Link
                    href={`/stock/${item.ticker}`}
                    className="ml-auto text-[10px] text-white/60 hover:text-[#00b87c] transition-colors"
                    onClick={onClose}
                  >
                    Full thesis →
                  </Link>
                )}
              </div>
              {isLoading ? (
                <div className="flex items-center gap-2 text-white/70 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-[#00b87c]" />
                  Athena is reading the headline…
                </div>
              ) : summary?.athenaSummary ? (
                <p className="text-sm leading-relaxed text-white/90">
                  {summary.athenaSummary}
                </p>
              ) : (
                <p className="text-sm text-white/60">
                  Athena summary not available for this headline yet.
                </p>
              )}
              <p className="text-[10px] text-white/40 leading-relaxed pt-3 mt-3 border-t border-white/10">
                Educational context only — not financial advice. Past performance does not guarantee future results.
              </p>
            </div>
          </AthenaSurface>

          {/* Read full article at source */}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ExternalLink className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-semibold truncate">
                  Read full article at {item.source ?? "source"}
                </span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                opens new tab
              </span>
            </a>
          )}
        </div>
      </div>
    </>
  );
}
