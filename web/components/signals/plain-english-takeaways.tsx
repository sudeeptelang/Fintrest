import { cn } from "@/lib/utils";

/**
 * Key takeaways card — bullet list of 3-6 takeaways that a non-technical
 * reader can act on. Sits beneath the Lens thesis on the signal detail page
 * and is the bridge between Lens-prose and the 7-factor numbers that follow.
 */
export function PlainEnglishTakeaways({
  items,
  title = "Key takeaways",
  className,
}: {
  items: React.ReactNode[];
  title?: string;
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section
      className={cn(
        "rounded-[10px] border border-ink-200 bg-ink-0 px-7 py-6",
        className,
      )}
    >
      <h3 className="font-[var(--font-heading)] text-[14px] font-semibold text-ink-900 mb-4">
        {title}
      </h3>
      <ul className="list-none p-0">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-3.5 py-2.5 font-[var(--font-sans)] text-[14px] leading-[22px] text-ink-800 border-b border-dashed border-ink-200 last:border-b-0"
          >
            <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-forest mt-[9px]" />
            <span className="[&_strong]:font-semibold [&_strong]:text-ink-950">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
