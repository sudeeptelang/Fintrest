import { cn } from "@/lib/utils";

type Variant = "buy" | "watch" | "avoid";

const styles: Record<Variant, string> = {
  buy: "bg-forest-light text-forest-dark border-[rgba(15,79,58,0.3)]",
  watch: "bg-ink-100 text-ink-700 border-ink-300",
  avoid: "bg-ink-50 text-ink-500 border-ink-200 italic",
};

const labels: Record<Variant, string> = {
  buy: "Buy today",
  watch: "Watch",
  avoid: "Avoid",
};

export function SignalBadge({
  variant,
  size = "md",
  className,
  children,
}: {
  variant: Variant;
  size?: "sm" | "md";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold tracking-[0.12em] uppercase rounded-[3px] border",
        size === "sm" ? "px-1.5 py-[2px] text-[9px]" : "px-2 py-[3px] text-[10px]",
        styles[variant],
        className,
      )}
    >
      {children ?? labels[variant]}
    </span>
  );
}

export function signalTypeToVariant(signalType: string): Variant {
  const t = signalType.toUpperCase();
  if (t === "BUY_TODAY" || t === "BUY") return "buy";
  if (t === "AVOID" || t === "HIGH_RISK") return "avoid";
  return "watch";
}
