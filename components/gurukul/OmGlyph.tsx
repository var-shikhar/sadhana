import { cn } from "@/lib/utils";

interface OmGlyphProps {
  size?: number;
  className?: string;
  tone?: "saffron" | "ink" | "gold";
}

const TONES = {
  saffron: "text-saffron",
  ink: "text-ink",
  gold: "text-gold",
} as const;

export function OmGlyph({ size = 36, className, tone = "saffron" }: OmGlyphProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("font-lyric inline-block leading-none", TONES[tone], className)}
      style={{ fontSize: `${size}px`, animation: "var(--animate-breath-fade)" }}
    >
      ॐ
    </span>
  );
}
