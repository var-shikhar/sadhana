"use client";

import { cn } from "@/lib/utils";
import { ButtonBare } from "@/components/ui/button";

const BOOK_SHORT_LABEL: Record<string, string> = {
  BG: "Bhagavad Gita",
  YS: "Yoga Sutras",
  KU: "Katha Upanishad",
  IsaUp: "Isha Upanishad",
  KenaUp: "Kena Upanishad",
  MundakaUp: "Mundaka Upanishad",
  MandukyaUp: "Mandukya Upanishad",
};

interface CitationChipProps {
  externalId: string;
  onOpen?: () => void;
  className?: string;
  /** When true, render slightly smaller for inline use */
  inline?: boolean;
  /** Color theme — light (cream pages) or dark (Counsel surface) */
  variant?: "light" | "dark";
}

export function parseExternalId(externalId: string): {
  book: string;
  ref: string;
  bookLabel: string;
} {
  const cleaned = externalId.replace("_", " ");
  const [book, ...rest] = cleaned.split(" ");
  const ref = rest.join(" ");
  return {
    book,
    ref,
    bookLabel: BOOK_SHORT_LABEL[book] ?? book,
  };
}

export function CitationChip({
  externalId,
  onOpen,
  className,
  inline = false,
  variant = "light",
}: CitationChipProps) {
  const { book, ref } = parseExternalId(externalId);

  const colors =
    variant === "dark"
      ? "bg-saffron/15 border-saffron/40 hover:bg-saffron/25 hover:border-saffron"
      : "bg-saffron/10 border-saffron/40 hover:bg-saffron/20 hover:border-saffron hover:shadow-sm";

  const refColor = variant === "dark" ? "text-parchment" : "text-ink";

  return (
    <ButtonBare
      type="button"
      onClick={onOpen}
      className={cn(
        "inline-flex items-baseline gap-1 rounded-full border transition-all align-baseline",
        inline ? "px-2 py-0 text-[10px]" : "px-2.5 py-0.5 text-xs",
        colors,
        className
      )}
      title={`Open ${externalId}`}
    >
      <span className="font-pressure-caps text-saffron tracking-[2px]">
        {book}
      </span>
      <span className={cn("font-lyric", refColor)}>{ref}</span>
    </ButtonBare>
  );
}
