import { cn } from "@/lib/utils";
import type { NewsItem } from "@/lib/api";

/**
 * Related news list. Per docs/DESIGN_TICKER_DEEP_DIVE.md (QA-P2 suggestion),
 * the header surfaces both the article count and how many of them fed the
 * news-catalyst factor — ties the section back to the 8-factor breakdown
 * so the page reads as coherent rather than a grab-bag of data.
 */
export function RelatedNews({
  items,
  title = "Related news",
  limit = 6,
  className,
}: {
  items: NewsItem[] | null | undefined;
  title?: string;
  limit?: number;
  className?: string;
}) {
  if (!items || items.length === 0) return null;

  const visible = items.slice(0, limit);
  const contributedCount = items.filter((n) => n.contributedToScore === true).length;
  // Fallback heuristic for pre-flag data — items with |sentiment| >= 0.3
  // carry enough of a tilt that the scoring engine likely counted them.
  const contributedFallback =
    contributedCount === 0
      ? items.filter((n) => n.sentimentScore != null && Math.abs(n.sentimentScore) >= 0.3).length
      : 0;

  const effectiveContribution = contributedCount > 0 ? contributedCount : contributedFallback;

  return (
    <section className={cn("rounded-[10px] border border-ink-200 bg-ink-0 overflow-hidden", className)}>
      <header className="px-7 py-4 border-b border-ink-100 flex items-baseline justify-between gap-4">
        <h3 className="font-[var(--font-heading)] text-[14px] font-semibold text-ink-900">
          {title}
        </h3>
        <p className="font-[var(--font-sans)] text-[11px] text-ink-500">
          {items.length} {items.length === 1 ? "article" : "articles"}
          {effectiveContribution > 0 && (
            <>
              {" · "}
              <span className="text-ink-700">{effectiveContribution}</span> contributed to news score
            </>
          )}
        </p>
      </header>
      <ul className="divide-y divide-ink-100">
        {visible.map((n, i) => {
          const sent = n.sentimentScore ?? 0;
          const sentColor =
            sent > 0.2 ? "bg-up" : sent < -0.2 ? "bg-down" : "bg-ink-400";
          const contributed =
            n.contributedToScore === true ||
            (contributedCount === 0 && n.sentimentScore != null && Math.abs(n.sentimentScore) >= 0.3);
          return (
            <li
              key={i}
              className="px-7 py-3.5 grid grid-cols-[auto_1fr_auto] gap-4 items-start"
            >
              <span className={cn("mt-[8px] h-1.5 w-1.5 rounded-full shrink-0", sentColor)} />
              <div className="min-w-0">
                <p className="font-[var(--font-sans)] text-[13px] leading-[18px] text-ink-800">
                  {n.headline}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  {n.source && <SourceChip label={n.source} />}
                  {n.catalystType && <SourceChip label={n.catalystType} tone="rust" />}
                  {contributed && (
                    <span
                      className="inline-flex items-center px-1.5 py-[1px] rounded font-[var(--font-mono)] text-[9px] font-semibold uppercase tracking-[0.1em] bg-forest-light text-forest-dark"
                      title="This item contributed to the news catalyst factor score"
                    >
                      Scored
                    </span>
                  )}
                </div>
              </div>
              <div className="font-[var(--font-mono)] text-[11px] text-ink-500 whitespace-nowrap">
                {n.publishedAt && (
                  <span>{new Date(n.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SourceChip({ label, tone = "ink" }: { label: string; tone?: "ink" | "rust" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-[1px] rounded font-[var(--font-mono)] text-[10px]",
        tone === "rust"
          ? "bg-rust-light text-rust-dark"
          : "bg-ink-100 text-ink-700",
      )}
    >
      {label}
    </span>
  );
}
