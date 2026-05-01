"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ChipCategory } from "@/types";

interface ChipBucketProps {
  category: ChipCategory;
  label: string;
  sanskrit: string;
  gloss: string;
  /** Names of chips that the user has already coined (the library). */
  libraryChipNames: string[];
  /** Currently-selected chips for this bucket today. */
  selected: string[];
  /** Adds an existing chip-name to the selection (toggles off if already in). */
  onToggle: (name: string) => void;
  /** User typed a brand-new chip name into this bucket — create + select it. */
  onCreate: (name: string) => void | Promise<void>;
  className?: string;
}

const TONE_STYLES: Record<
  ChipCategory,
  {
    cardBg: string;
    cardBorder: string;
    headerNumeral: string;
    headerLabel: string;
    chipBase: string;
    chipSelected: string;
    chipUnselected: string;
    addBtn: string;
    accentDot: string;
  }
> = {
  good: {
    cardBg: "bg-[radial-gradient(ellipse_at_top,rgba(122,139,92,0.10),transparent_70%)]",
    cardBorder: "border-sage/35",
    headerNumeral: "text-sage",
    headerLabel: "text-sage",
    chipBase: "border-sage/50",
    chipSelected: "bg-sage/20 text-ink shadow-[0_2px_6px_rgba(122,139,92,0.18)]",
    chipUnselected: "bg-ivory text-earth-deep hover:bg-sage/10",
    addBtn:
      "border-dashed border-sage/40 text-sage/80 hover:border-sage hover:text-sage",
    accentDot: "bg-sage",
  },
  neutral: {
    cardBg: "bg-[radial-gradient(ellipse_at_top,rgba(139,111,71,0.10),transparent_70%)]",
    cardBorder: "border-earth-mid/35",
    headerNumeral: "text-earth-deep",
    headerLabel: "text-earth-deep",
    chipBase: "border-earth-mid/40",
    chipSelected: "bg-earth-mid/15 text-ink shadow-[0_2px_6px_rgba(139,111,71,0.15)]",
    chipUnselected: "bg-ivory text-earth-deep hover:bg-earth-mid/10",
    addBtn:
      "border-dashed border-earth-mid/40 text-earth-mid hover:border-earth-deep hover:text-earth-deep",
    accentDot: "bg-earth-mid",
  },
  bad: {
    cardBg: "bg-[radial-gradient(ellipse_at_top,rgba(196,106,31,0.10),transparent_70%)]",
    cardBorder: "border-saffron/40",
    headerNumeral: "text-saffron",
    headerLabel: "text-saffron",
    chipBase: "border-saffron/45",
    chipSelected: "bg-saffron/15 text-ink shadow-[0_2px_6px_rgba(196,106,31,0.18)]",
    chipUnselected: "bg-ivory text-earth-deep hover:bg-saffron/10",
    addBtn:
      "border-dashed border-saffron/40 text-saffron/80 hover:border-saffron hover:text-saffron",
    accentDot: "bg-saffron",
  },
};

const DEVANAGARI_NUMERALS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

function devanagariCount(n: number): string {
  return String(n)
    .split("")
    .map((d) => DEVANAGARI_NUMERALS[Number(d)] ?? d)
    .join("");
}

export function ChipBucket({
  category,
  label,
  sanskrit,
  gloss,
  libraryChipNames,
  selected,
  onToggle,
  onCreate,
  className,
}: ChipBucketProps) {
  const tone = TONE_STYLES[category];
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Show every library chip in this bucket's category PLUS any chips
  // currently selected (in case a chip was reclassified for today only).
  const displayChips = Array.from(new Set([...libraryChipNames, ...selected]));

  async function commitNew() {
    const name = draft.trim();
    if (!name) {
      setComposing(false);
      setDraft("");
      return;
    }
    setSubmitting(true);
    try {
      await onCreate(name);
      setDraft("");
      setComposing(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className={cn(
        "relative rounded-md border px-3 pt-3 pb-3 flex flex-col min-h-[180px]",
        tone.cardBg,
        tone.cardBorder,
        className
      )}
    >
      {/* Bucket header — devanagari count + label */}
      <header className="flex items-baseline justify-between gap-2 mb-2">
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "font-lyric text-2xl leading-none tabular-nums",
              tone.headerNumeral
            )}
            aria-label={`${selected.length} ${label}`}
          >
            {devanagariCount(selected.length)}
          </span>
          <span className="text-[9px] tracking-[2px] uppercase text-earth-mid">
            {String(selected.length).padStart(2, "0")}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", tone.accentDot)} />
          <span
            className={cn(
              "font-pressure-caps text-[9px]",
              tone.headerLabel
            )}
          >
            {label}
          </span>
        </div>
      </header>

      <div className="space-y-0.5 mb-3">
        <p className="font-lyric-italic text-[11px] text-ink-soft leading-tight">
          {sanskrit}
        </p>
        <p className="text-[10px] text-earth-mid leading-tight">{gloss}</p>
      </div>

      {/* Chip rail */}
      <div className="flex flex-wrap gap-1.5 flex-1 content-start">
        {displayChips.length === 0 && !composing && (
          <p className="font-lyric-italic text-[11px] text-earth-mid/80 italic py-1">
            none yet — add your first
          </p>
        )}

        {displayChips.map((name) => {
          const isSelected = selected.includes(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => onToggle(name)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-sans transition-all",
                tone.chipBase,
                isSelected ? tone.chipSelected : tone.chipUnselected
              )}
            >
              {name}
            </button>
          );
        })}

        {composing ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 60))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void commitNew();
                } else if (e.key === "Escape") {
                  setComposing(false);
                  setDraft("");
                }
              }}
              onBlur={() => void commitNew()}
              disabled={submitting}
              placeholder="name it…"
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-sans bg-ivory outline-none",
                tone.chipBase,
                "focus:border-ink/40"
              )}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-sans transition-all",
              tone.addBtn
            )}
          >
            + add
          </button>
        )}
      </div>
    </section>
  );
}
