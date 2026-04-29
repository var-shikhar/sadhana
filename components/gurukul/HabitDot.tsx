import { cn } from "@/lib/utils";

interface HabitDotProps {
  state: "complete" | "pending" | "skipped";
  size?: number;
  className?: string;
  delayMs?: number;
}

export function HabitDot({ state, size = 14, className, delayMs = 0 }: HabitDotProps) {
  if (state === "pending") {
    return (
      <span
        aria-hidden="true"
        className={cn("inline-block rounded-full border border-saffron", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  if (state === "skipped") {
    return (
      <span
        aria-hidden="true"
        className={cn("inline-block rounded-full border border-earth-mid opacity-40", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block rounded-full", className)}
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle, #c46a1f, transparent 75%)",
        animation: "var(--animate-bloom)",
        animationDelay: `${delayMs}ms`,
      }}
    />
  );
}
