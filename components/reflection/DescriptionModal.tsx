"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { cn } from "@/lib/utils";
import type { ChipCategory } from "@/types";

interface SelectedChip {
  name: string;
  category: ChipCategory;
}

interface DescriptionModalProps {
  open: boolean;
  /** Every chip the user picked across all three buckets, in their natural order. */
  selected: SelectedChip[];
  /** Existing descriptions (chip name → text). */
  initial: Record<string, string>;
  /** Called when user finalises — descriptions can be empty (= skip). */
  onConfirm: (descriptions: Record<string, string>) => void | Promise<void>;
  onClose: () => void;
}

const CATEGORY_DOT: Record<ChipCategory, string> = {
  good: "bg-sage",
  neutral: "bg-earth-mid",
  bad: "bg-saffron",
};

const CATEGORY_PLACEHOLDER: Record<ChipCategory, string> = {
  good: "what made this good?",
  neutral: "what was the texture?",
  bad: "what really happened?",
};

export function DescriptionModal({
  open,
  selected,
  initial,
  onConfirm,
  onClose,
}: DescriptionModalProps) {
  const [descriptions, setDescriptions] = useState<Record<string, string>>(initial);
  const [activeChip, setActiveChip] = useState<string | null>(
    selected[0]?.name ?? null
  );
  const [submitting, setSubmitting] = useState(false);

  // Sync if the initial set changes (e.g. user reopens modal after editing).
  useEffect(() => {
    setDescriptions(initial);
    setActiveChip(selected[0]?.name ?? null);
  }, [open, initial, selected]);

  // ESC to close.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const active = selected.find((c) => c.name === activeChip) ?? selected[0];
  const filledCount = Object.values(descriptions).filter(
    (v) => v.trim().length > 0
  ).length;

  async function handleConfirm() {
    setSubmitting(true);
    const trimmed: Record<string, string> = {};
    for (const [k, v] of Object.entries(descriptions)) {
      const t = v.trim();
      if (t) trimmed[k] = t;
    }
    try {
      await onConfirm(trimmed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="desc-modal-title"
    >
      {/* Parchment-darkened backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-indigo-deep/60 backdrop-blur-[2px] animate-in fade-in duration-200"
      />

      {/* Scroll-shaped sheet */}
      <div
        className={cn(
          "relative w-full max-w-lg max-h-[88vh] flex flex-col",
          "bg-linear-to-b from-ivory to-parchment",
          "border-y md:border md:rounded-md border-gold/50",
          "shadow-[0_-12px_40px_rgba(26,18,53,0.35)] md:shadow-[0_12px_60px_rgba(26,18,53,0.45)]",
          "animate-in slide-in-from-bottom-4 duration-300"
        )}
      >
        {/* Top hairline */}
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />

        <header className="px-5 pt-5 pb-3 text-center">
          <LabelTiny>Vyakhya · the gloss</LabelTiny>
          <h2
            id="desc-modal-title"
            className="font-lyric text-xl text-ink mt-1"
          >
            Write a few words for any of these.
          </h2>
          <p className="font-lyric-italic text-[12px] text-earth-mid mt-0.5">
            Optional. Skip any you don&apos;t want to elaborate.
          </p>
        </header>

        {selected.length === 0 ? (
          <div className="px-5 pb-5 text-center">
            <p className="font-lyric-italic text-sm text-earth-mid">
              Nothing selected — go back and tap a few chips first.
            </p>
            <Button onClick={onClose} className="mt-4">
              Back
            </Button>
          </div>
        ) : (
          <>
            {/* Chip rail (selectable) */}
            <div className="px-5 pt-1 pb-2 border-b border-gold/30">
              <div className="flex flex-wrap gap-1.5">
                {selected.map((chip) => {
                  const has = (descriptions[chip.name] ?? "").trim().length > 0;
                  const isActive = chip.name === active?.name;
                  return (
                    <button
                      type="button"
                      key={chip.name}
                      onClick={() => setActiveChip(chip.name)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-sans flex items-center gap-1.5 transition-all",
                        "border",
                        isActive
                          ? "bg-ink text-ivory border-ink shadow-[0_2px_6px_rgba(26,18,8,0.25)]"
                          : "bg-ivory text-earth-deep border-gold/40 hover:bg-ivory-deep"
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", CATEGORY_DOT[chip.category])} />
                      {chip.name}
                      {has && (
                        <span className={cn("text-[8px]", isActive ? "text-ivory/70" : "text-earth-mid")}>
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active chip — description editor */}
            {active && (
              <div className="px-5 py-4 flex-1 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn("h-2 w-2 rounded-full", CATEGORY_DOT[active.category])} />
                  <span className="font-lyric text-base text-ink">{active.name}</span>
                </div>
                <Textarea
                  value={descriptions[active.name] ?? ""}
                  onChange={(e) =>
                    setDescriptions((prev) => ({
                      ...prev,
                      [active.name]: e.target.value.slice(0, 600),
                    }))
                  }
                  placeholder={CATEGORY_PLACEHOLDER[active.category]}
                  rows={5}
                  className="bg-ivory border-gold/40 font-lyric-italic text-[14px]"
                />
                <p className="text-right text-[10px] text-earth-mid mt-1">
                  {(descriptions[active.name] ?? "").length}/600
                </p>
              </div>
            )}

            {/* Footer */}
            <footer className="px-5 py-3 border-t border-gold/30 bg-ivory/60 flex items-center justify-between gap-3">
              <p className="text-[11px] text-earth-mid font-lyric-italic">
                {filledCount > 0
                  ? `${filledCount} of ${selected.length} described`
                  : "all blank — that's okay"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirm}
                  disabled={submitting}
                >
                  {submitting ? "Sealing…" : filledCount > 0 ? "Seal & save" : "Save without notes"}
                </Button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
