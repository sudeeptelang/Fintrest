import { LayoutGrid } from "lucide-react";

// Placeholder — full Boards hub spec lives in docs/DESIGN_LANGUAGE_V2.md §12.
// Build order: after the app shell + atoms library land.
export default function BoardsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-[11px] font-semibold text-forest tracking-[0.14em] uppercase mb-3">
        Boards
      </div>
      <h1 className="font-[var(--font-heading)] text-3xl font-semibold text-ink-950 tracking-[-0.02em] mb-3">
        Your boards
      </h1>
      <p className="font-[var(--font-mono)] text-[13px] text-ink-500 mb-12">
        Pin the research that passed the test · Private curation only
      </p>

      <div className="rounded-xl border border-dashed border-ink-300 bg-ink-0 p-12 text-center">
        <div className="mx-auto h-12 w-12 inline-flex items-center justify-center rounded-lg bg-forest-light text-forest mb-4">
          <LayoutGrid className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <h2 className="font-[var(--font-heading)] text-lg font-semibold text-ink-950 mb-2">
          Boards is coming soon
        </h2>
        <p className="text-sm text-ink-600 leading-relaxed max-w-md mx-auto">
          Pin signals into collections, track how each pick performs since you
          pinned it, and subscribe to Lens-curated editorial boards that
          refresh every morning.
        </p>
      </div>
    </div>
  );
}
