import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Full-width upgrade row that slots into the bottom of a signal table or board.
 * Used for Free users to gate the tail of a paginated list.
 */
export function UpgradeGateRow({
  title,
  sub,
  cta = "Upgrade to Pro · $29/mo",
  href = "/pricing",
  className,
}: {
  title: string;
  sub: string;
  cta?: string;
  href?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-6 px-6 py-5 border-t border-ink-200 bg-gradient-to-b from-ink-50 to-ink-0",
        className,
      )}
    >
      <div className="flex-1">
        <div className="font-[var(--font-heading)] text-[14px] font-semibold text-ink-900 mb-1">
          {title}
        </div>
        <p className="font-[var(--font-sans)] text-[13px] leading-[20px] text-ink-600">
          {sub}
        </p>
      </div>
      <Link
        href={href}
        className="inline-flex items-center px-4 py-2.5 rounded-md bg-forest text-ink-0 text-[13px] font-semibold hover:bg-forest-dark transition-colors whitespace-nowrap"
      >
        {cta}
      </Link>
    </div>
  );
}
