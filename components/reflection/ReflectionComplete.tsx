"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Reflection, ChipCategory } from "@/types";
import { CHIP_CATEGORY_META, CHIP_CATEGORY_ORDER } from "@/types";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { DaySummary } from "./DaySummary";

interface ReflectionCompleteProps {
  reflection: Reflection;
  /** Open the description modal again so the user can revise descriptions. */
  onEditDescriptions?: () => void;
}

const DEVANAGARI_NUMERALS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

function devanagariCount(n: number): string {
  return String(n)
    .split("")
    .map((d) => DEVANAGARI_NUMERALS[Number(d)] ?? d)
    .join("");
}

const TONE_TEXT: Record<ChipCategory, string> = {
  good: "text-sage",
  neutral: "text-earth-deep",
  bad: "text-saffron",
};

const TONE_DOT: Record<ChipCategory, string> = {
  good: "bg-sage",
  neutral: "bg-earth-mid",
  bad: "bg-saffron",
};

const TONE_BORDER: Record<ChipCategory, string> = {
  good: "border-sage/40",
  neutral: "border-earth-mid/40",
  bad: "border-saffron/40",
};

function chipsFor(reflection: Reflection, cat: ChipCategory): string[] {
  switch (cat) {
    case "good":
      return reflection.goodChips ?? [];
    case "bad":
      return reflection.badChips ?? [];
    case "neutral":
      return reflection.neutralChips ?? [];
  }
}

export function ReflectionComplete({
  reflection,
  onEditDescriptions,
}: ReflectionCompleteProps) {
  const descriptions = reflection.chipDescriptions ?? {};
  const summary = reflection.daySummary ?? "";

  // Detect the legacy CBT path so we render gracefully (archive may surface
  // older entries through this same lock-screen).
  const isLegacy =
    !reflection.goodChips && !reflection.badChips && !reflection.neutralChips;

  if (isLegacy) {
    return (
      <div className="space-y-4 text-center">
        <p className="font-lyric text-xl text-ink">Today&apos;s reflection is complete.</p>
        <p className="font-lyric-italic text-sm text-earth-mid">
          {reflection.mode === "deep"
            ? "Deep reflection — 25 pts"
            : "Quick reflection — 15 pts"}
        </p>
      </div>
    );
  }

  const totalChips =
    (reflection.goodChips?.length ?? 0) +
    (reflection.neutralChips?.length ?? 0) +
    (reflection.badChips?.length ?? 0);

  return (
    <div className="space-y-6">
      {/* Tally header */}
      <div className="text-center space-y-1">
        <LabelTiny>The day, tallied</LabelTiny>
        <div className="flex items-baseline justify-center gap-5 pt-1">
          {CHIP_CATEGORY_ORDER.map((cat) => {
            const meta = CHIP_CATEGORY_META[cat];
            const count = chipsFor(reflection, cat).length;
            return (
              <div key={cat} className="flex flex-col items-center gap-0.5">
                <span className={cn("font-lyric text-3xl tabular-nums leading-none", TONE_TEXT[cat])}>
                  {devanagariCount(count)}
                </span>
                <span className="font-pressure-caps text-[9px] text-earth-mid">
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chip ledger — three columns of selected chips, each with descriptions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CHIP_CATEGORY_ORDER.map((cat) => {
          const chips = chipsFor(reflection, cat);
          const meta = CHIP_CATEGORY_META[cat];
          if (chips.length === 0) {
            return (
              <div
                key={cat}
                className={cn(
                  "rounded-md border bg-ivory/50 p-3 min-h-[80px] flex flex-col",
                  TONE_BORDER[cat]
                )}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[cat])} />
                  <span className="font-pressure-caps text-[9px] text-earth-mid">
                    {meta.label}
                  </span>
                </div>
                <p className="font-lyric-italic text-[11px] text-earth-mid/70 italic mt-auto">
                  none today
                </p>
              </div>
            );
          }

          return (
            <div
              key={cat}
              className={cn(
                "rounded-md border bg-ivory/70 p-3 space-y-2",
                TONE_BORDER[cat]
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[cat])} />
                <span className="font-pressure-caps text-[9px] text-earth-mid">
                  {meta.label}
                </span>
              </div>
              <ul className="space-y-2">
                {chips.map((name) => {
                  const desc = descriptions[name];
                  return (
                    <li key={name} className="space-y-0.5">
                      <p className="font-lyric text-[13px] text-ink leading-tight">
                        {name}
                      </p>
                      {desc && (
                        <p className="font-lyric-italic text-[11px] text-earth-deep leading-snug pl-2 border-l border-gold/30">
                          {desc}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Day summary */}
      <DaySummary value={summary} onChange={() => {}} readOnly />

      {/* Footer actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <p className="font-lyric-italic text-[12px] text-earth-mid">
          {totalChips} {totalChips === 1 ? "thing" : "things"} marked.
        </p>
        <div className="flex items-center gap-3">
          {onEditDescriptions && (
            <button
              type="button"
              onClick={onEditDescriptions}
              className="font-pressure-caps text-[10px] text-earth-deep underline-offset-4 hover:underline"
            >
              Revise descriptions
            </button>
          )}
          <Link
            href="/counsel"
            className="font-pressure-caps text-[10px] text-saffron underline-offset-4 hover:underline"
          >
            Speak with the Acharya →
          </Link>
        </div>
      </div>
    </div>
  );
}
