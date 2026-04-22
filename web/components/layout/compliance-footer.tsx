import Link from "next/link";

/**
 * Standard compliance footer. Rendered globally in the authenticated app
 * shell (app/(app)/layout.tsx) so every route shows it — this is rule #6 in
 * CLAUDE.md: compliance footer on every signal page, non-negotiable.
 *
 * Some pages also render an inline disclaimer within their content; that's
 * fine. The global footer is the belt; inline is the suspenders.
 *
 * Sources:
 *   - "Educational content only — not financial advice"
 *   - "Past signal performance does not guarantee future results"
 * These two lines are the minimum SEC/FTC-safe framing for an educational
 * publisher. Do not reword without legal review.
 */
export function ComplianceFooter() {
  return (
    <footer className="border-t border-ink-200 bg-ink-50 px-4 sm:px-6 lg:px-10 py-6 mt-auto">
      <div className="max-w-[1120px] mx-auto text-[11px] leading-[16px] text-ink-500">
        <p>
          Educational content only — not financial advice. Past signal performance does not
          guarantee future results. Fintrest publishes research; your decision is your own.
        </p>
        <p className="mt-1.5">
          <Link href="/disclaimer" className="text-forest hover:underline">
            Full disclaimer
          </Link>
          <span className="mx-1.5 text-ink-400">·</span>
          <Link href="/risk-disclosure" className="text-forest hover:underline">
            Risk disclosure
          </Link>
          <span className="mx-1.5 text-ink-400">·</span>
          <Link href="/terms" className="text-forest hover:underline">
            Terms
          </Link>
          <span className="mx-1.5 text-ink-400">·</span>
          <Link href="/privacy" className="text-forest hover:underline">
            Privacy
          </Link>
        </p>
      </div>
    </footer>
  );
}
