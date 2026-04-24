import Link from "next/link";
import { Compass } from "lucide-react";

// Root 404 — catches any /path that doesn't match a route.
// Authenticated users get pointed to /markets, everyone else to /.

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center p-6">
      <div className="max-w-[520px] w-full rounded-[12px] border border-ink-200 bg-ink-0 p-10 text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-forest-light mb-5">
          <Compass className="h-5 w-5 text-forest" strokeWidth={1.7} />
        </div>
        <h1 className="font-[var(--font-heading)] text-[22px] leading-[28px] font-semibold text-ink-900 mb-2">
          Page not found
        </h1>
        <p className="font-[var(--font-sans)] text-[14px] leading-[22px] text-ink-600 max-w-[420px] mx-auto">
          We couldn&apos;t find what you were looking for. Want to check
          today&apos;s research or the audit log instead?
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/markets"
            className="inline-flex items-center gap-1.5 bg-forest text-ink-0 px-4 py-2 rounded-md text-[13px] font-semibold hover:bg-forest-dark transition-colors"
          >
            Markets overview
          </Link>
          <Link
            href="/audit"
            className="inline-flex items-center gap-1.5 border border-ink-200 px-4 py-2 rounded-md text-[13px] font-semibold text-ink-700 hover:bg-ink-100 transition-colors"
          >
            Audit log
          </Link>
        </div>
      </div>
    </div>
  );
}
