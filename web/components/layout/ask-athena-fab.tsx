"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Ask Lens FAB — fixed bottom-right across every app page.
 *
 * v2 spec: ink-950 pill, 12px 18px padding, 100px radius, shadow-e2, with a
 * forest-square "L" mark on the left. Hidden on the Ask Lens page itself so it
 * doesn't cover the input. File is still named ask-athena-fab for import
 * compatibility; rename is part of Phase 7 cleanup.
 */
export function AskAthenaFab() {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/athena") || pathname.startsWith("/ask")) return null;

  return (
    <Link
      href="/athena"
      aria-label="Ask Lens"
      className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 bg-ink-950 text-ink-0 px-[18px] py-3 rounded-full shadow-e2 hover:-translate-y-px transition-transform"
    >
      <span className="inline-flex items-center justify-center h-[18px] w-[18px] rounded-[4px] bg-forest text-ink-0 font-[var(--font-heading)] text-[10px] font-bold leading-none">
        L
      </span>
      <span className="text-[13px] font-semibold">Ask Lens</span>
    </Link>
  );
}

export { AskAthenaFab as AskLensFab };
