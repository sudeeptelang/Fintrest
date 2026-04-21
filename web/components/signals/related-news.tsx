import { cn } from "@/lib/utils";
import type { NewsItem } from "@/lib/api";

/**
 * Related news list — v2 styling. Shows headline + source + date with a subtle
 * sentiment dot on the left.
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

  return (
    <section className={cn("rounded-[10px] border border-ink-200 bg-ink-0 overflow-hidden", className)}>
      <header className="px-7 py-4 border-b border-ink-100">
        <h3 className="font-[var(--font-heading)] text-[14px] font-semibold text-ink-900">
          {title}
        </h3>
      </header>
      <ul className="divide-y divide-ink-100">
        {items.slice(0, limit).map((n, i) => {
          const sent = n.sentimentScore ?? 0;
          const sentColor =
            sent > 0.2 ? "bg-up" : sent < -0.2 ? "bg-down" : "bg-ink-400";
          return (
            <li
              key={i}
              className="px-7 py-3.5 grid grid-cols-[auto_1fr_auto] gap-4 items-start"
            >
              <span className={cn("mt-[8px] h-1.5 w-1.5 rounded-full shrink-0", sentColor)} />
              <p className="font-[var(--font-sans)] text-[13px] leading-[18px] text-ink-800">
                {n.headline}
              </p>
              <div className="flex items-center gap-2 font-[var(--font-mono)] text-[11px] text-ink-500 whitespace-nowrap">
                {n.source && <span>{n.source}</span>}
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
