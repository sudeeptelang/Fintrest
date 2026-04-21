import { cn } from "@/lib/utils";

/**
 * Single row in the 7-factor breakdown table.
 * Layout: name | score number | bar | plain-English summary | chevron
 */
export function FactorRow({
  name,
  score,
  summary,
  onClick,
  className,
}: {
  name: string;
  score: number;
  summary: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, score));
  const fill = pct >= 40 ? "bg-up" : "bg-ink-400";

  return (
    <div
      onClick={onClick}
      className={cn(
        "grid items-center gap-5 px-6 py-4 border-b border-ink-100 last:border-b-0 transition-colors",
        onClick && "cursor-pointer hover:bg-ink-50",
        "grid-cols-[150px_60px_160px_1fr_20px]",
        className,
      )}
    >
      <div className="font-[var(--font-sans)] text-[13px] font-semibold text-ink-900">
        {name}
      </div>
      <div className="font-[var(--font-mono)] text-[15px] font-medium text-ink-900">
        {Math.round(score)}
      </div>
      <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
        <div className={cn("h-full rounded-full", fill)} style={{ width: `${pct}%` }} />
      </div>
      <div className="font-[var(--font-sans)] text-[12px] leading-[18px] text-ink-600">
        {summary}
      </div>
      <div className="text-ink-400 text-[12px]">›</div>
    </div>
  );
}

export function FactorBreakdown({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[10px] border border-ink-200 bg-ink-0 overflow-hidden", className)}>
      {children}
    </div>
  );
}
