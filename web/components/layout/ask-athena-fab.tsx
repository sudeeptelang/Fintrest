"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

/**
 * Floating "Ask Athena" button — persistent across every app page.
 * Replaces the sidebar entry: Athena is a tool, not a feed, so it gets a FAB
 * rather than a nav slot. Hidden on the Athena page itself to avoid covering chat input.
 */
export function AskAthenaFab() {
  const pathname = usePathname();
  if (pathname?.startsWith("/athena")) return null;

  return (
    <Link
      href="/athena"
      aria-label="Ask Athena"
      className="fixed bottom-5 right-5 z-40 group flex items-center gap-2 h-12 px-4 rounded-full bg-[#0d1a2e] text-white shadow-[0_10px_30px_rgba(16,12,8,0.25)] hover:shadow-[0_12px_36px_rgba(0,184,124,0.35)] hover:scale-105 transition-all duration-200"
    >
      <span className="relative flex items-center justify-center h-7 w-7 rounded-full bg-[#00b87c]/15 border border-[#00b87c]/40">
        <Sparkles className="h-4 w-4 text-[#00b87c]" />
        <span className="absolute inset-0 rounded-full bg-[#00b87c]/30 animate-ping [animation-duration:3s]" />
      </span>
      <span className="text-sm font-semibold pr-1">Ask Athena</span>
    </Link>
  );
}
