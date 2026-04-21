import Link from "next/link";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string };

export function Breadcrumb({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-2 font-[var(--font-mono)] text-[12px] leading-none text-ink-500",
        className,
      )}
    >
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-2">
            {c.href && !last ? (
              <Link href={c.href} className="hover:text-ink-800 transition-colors">
                {c.label}
              </Link>
            ) : (
              <span className={last ? "text-ink-900" : ""}>{c.label}</span>
            )}
            {!last && <span className="text-ink-400">›</span>}
          </span>
        );
      })}
    </nav>
  );
}
