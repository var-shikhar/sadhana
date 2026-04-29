import { cn } from "@/lib/utils";

interface PressureLabelProps {
  children: React.ReactNode;
  className?: string;
  caps?: boolean;
  tone?: "ink" | "saffron" | "earth";
}

const TONES = {
  ink: "text-ink",
  saffron: "text-saffron",
  earth: "text-earth-deep",
} as const;

export function PressureLabel({ children, className, caps = false, tone = "ink" }: PressureLabelProps) {
  return (
    <span
      className={cn(
        caps ? "font-pressure-caps" : "font-pressure",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
