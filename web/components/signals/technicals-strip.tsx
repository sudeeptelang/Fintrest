import { cn } from "@/lib/utils";

type Cell = {
  label: string;
  value: string;
  tone?: "up" | "down" | "dim";
};

/**
 * Compact technicals strip — label/value cells in a row. The signal detail
 * page renders all the raw numbers directly; lens thesis and key takeaways
 * above do the explaining.
 */
export function TechnicalsStrip({
  cells,
  title = "Key technicals",
  className,
}: {
  cells: Cell[];
  title?: string;
  className?: string;
}) {
  return (
    <section className={className}>
      <h3 className="font-[var(--font-heading)] text-[14px] font-semibold text-ink-900 mb-3">
        {title}
      </h3>
      <div
        className="rounded-[10px] border border-ink-200 bg-ink-0 px-6 py-4 grid gap-0"
        style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}
      >
        {cells.map((c, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col gap-1 pl-4 first:pl-0",
              i < cells.length - 1 && "border-r border-ink-100",
              i < cells.length - 1 && "pr-4",
            )}
          >
            <span className="font-[var(--font-sans)] text-[10px] font-medium uppercase tracking-[0.06em] text-ink-500">
              {c.label}
            </span>
            <span
              className={cn(
                "font-[var(--font-mono)] text-[14px] font-medium leading-none",
                c.tone === "up"
                  ? "text-up"
                  : c.tone === "down"
                    ? "text-down"
                    : c.tone === "dim"
                      ? "text-ink-500"
                      : "text-ink-900",
              )}
            >
              {c.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
