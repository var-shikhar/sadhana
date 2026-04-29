import { cn } from "@/lib/utils";

interface GoldRuleProps {
  width?: "full" | "section" | "inset";
  className?: string;
}

const WIDTHS: Record<NonNullable<GoldRuleProps["width"]>, string> = {
  full: "w-full",
  section: "w-[70%] mx-auto",
  inset: "w-1/2 mx-auto",
};

export function GoldRule({ width = "full", className }: GoldRuleProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "h-px bg-gradient-to-r from-transparent via-gold to-transparent",
        WIDTHS[width],
        className
      )}
    />
  );
}
