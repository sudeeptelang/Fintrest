import Link from "next/link";
import { Construction } from "lucide-react";

/**
 * Shared placeholder for routes that are wired into the IA (sidebar,
 * breadcrumbs, search) but whose detail page lands in a later MVP
 * tranche. Keeps every nav entry navigable so QA never hits a 404.
 *
 * Copy discipline: say what the page *will* do, when, and which
 * existing surface does the related job today. No dead-ends.
 */
export function ComingSoon({
  title,
  subtitle,
  plannedIn = "MVP-2",
  relatedLabel,
  relatedHref,
}: {
  title: string;
  subtitle: string;
  plannedIn?: string;
  relatedLabel?: string;
  relatedHref?: string;
}) {
  return (
    <div className="max-w-[720px] mx-auto py-16 px-4">
      <div className="rounded-[12px] border border-ink-200 bg-ink-0 p-10 text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-forest-light mb-5">
          <Construction className="h-5 w-5 text-forest" strokeWidth={1.7} />
        </div>
        <h1 className="font-[var(--font-heading)] text-[24px] leading-[32px] font-semibold text-ink-900 mb-2">
          {title}
        </h1>
        <p className="font-[var(--font-sans)] text-[14px] leading-[22px] text-ink-600 max-w-[520px] mx-auto">
          {subtitle}
        </p>
        <div className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-forest-dark">
          Shipping in {plannedIn}
        </div>
        {relatedHref && relatedLabel && (
          <div className="mt-6 pt-6 border-t border-ink-100">
            <p className="text-[12px] text-ink-500 mb-2">In the meantime</p>
            <Link
              href={relatedHref}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest hover:underline"
            >
              {relatedLabel} →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
