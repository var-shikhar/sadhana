"use client";

import { cn } from "@/lib/utils";

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
}

/** Parse "BG_2.47" or "BG 2.47" into {book: "BG", ref: "2.47"} */
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
}: CitationChipProps) {
  const { book, ref } = parseExternalId(externalId);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "inline-flex items-baseline gap-1 rounded-full border bg-saffron/10 border-saffron/40 transition-all align-baseline",
        "hover:bg-saffron/20 hover:border-saffron hover:shadow-sm",
        inline ? "px-2 py-0 text-[10px]" : "px-2.5 py-0.5 text-xs",
        className
      )}
      title={`Open ${externalId}`}
    >
      <span className="font-pressure-caps text-saffron tracking-[2px]">
        {book}
      </span>
      <span className="font-lyric text-ink">{ref}</span>
    </button>
  );
}
