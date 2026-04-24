"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, Home } from "lucide-react";

// Route-segment error boundary. Next.js App Router requires this to
// render WITHOUT html/body tags — the root layout's html/body wraps
// this content automatically. Catastrophic errors (before the root
// layout mounts) are handled by app/global-error.tsx instead.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[route error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-[520px] w-full rounded-[12px] border border-ink-200 bg-ink-0 p-10 text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[rgba(178,94,9,0.1)] mb-5">
          <AlertTriangle className="h-5 w-5 text-warn" strokeWidth={1.7} />
        </div>
        <h1 className="font-[var(--font-heading)] text-[22px] leading-[28px] font-semibold text-ink-900 mb-2">
          Something went wrong
        </h1>
        <p className="font-[var(--font-sans)] text-[14px] leading-[22px] text-ink-600 max-w-[420px] mx-auto">
          The page hit an unexpected error. Try once more — if it
          persists, drop us a note at support@fintrest.ai.
        </p>
        {error.digest && (
          <p className="mt-3 text-[11px] font-[var(--font-mono)] text-ink-400">
            Error ref: {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 bg-forest text-ink-0 px-4 py-2 rounded-md text-[13px] font-semibold hover:bg-forest-dark transition-colors"
          >
            <RotateCw className="h-4 w-4" strokeWidth={2} />
            Try again
          </button>
          <Link
            href="/markets"
            className="inline-flex items-center gap-1.5 border border-ink-200 px-4 py-2 rounded-md text-[13px] font-semibold text-ink-700 hover:bg-ink-100 transition-colors"
          >
            <Home className="h-4 w-4" strokeWidth={1.7} />
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
