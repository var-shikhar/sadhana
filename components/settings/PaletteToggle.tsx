"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { Loader } from "@/components/gurukul/Loader";
import { PALETTES, type Palette } from "@/lib/palette";
import { clearPaletteCookie, setPaletteCookie } from "@/lib/palette-actions";

const META: Record<Palette, { label: string; gloss: string }> = {
  gurukul: { label: "Gurukul", gloss: "The canonical warmth." },
  restraint: { label: "Restraint", gloss: "Same daylight, less chrome." },
  focus: { label: "Focus", gloss: "Pure monochrome dark." },
};

/**
 * Dev-only Settings affordance for switching the visual palette at runtime.
 * Writes a `sadhana_palette` cookie via a server action, then refreshes the
 * router so the root layout re-resolves the palette from the new cookie.
 */
export function PaletteToggle({ active }: { active: Palette }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function announce(message: string) {
    setNote(message);
    window.setTimeout(() => setNote(null), 2500);
  }

  function handleSelect(p: Palette) {
    if (p === active || isPending) return;
    startTransition(async () => {
      await setPaletteCookie(p);
      router.refresh();
      announce(`Aspect set to ${META[p].label.toLowerCase()}.`);
    });
  }

  function handleReset() {
    if (isPending) return;
    startTransition(async () => {
      await clearPaletteCookie();
      router.refresh();
      announce("Aspect reset to default.");
    });
  }

  return (
    <section className="space-y-3">
      {isPending && (
        <div
          aria-live="polite"
          aria-busy="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ivory/90 backdrop-blur-sm"
        >
          <Loader size="md" caption="changing aspect…" />
        </div>
      )}

      <div>
        <LabelTiny>Aspect · visual mode (dev only)</LabelTiny>
        <p className="font-lyric-italic text-[11px] text-earth-mid mt-0.5">
          Switch the palette without a dev-server restart. Persists across reloads.
        </p>
      </div>

      <ul className="rounded-md border border-gold/30 bg-ivory-deep divide-y divide-gold/20 overflow-hidden">
        {PALETTES.map((p) => {
          const selected = p === active;
          return (
            <li key={p}>
              <button
                type="button"
                onClick={() => handleSelect(p)}
                disabled={isPending}
                aria-pressed={selected}
                className={cn(
                  "w-full text-left flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ivory disabled:opacity-50",
                  selected && "bg-ivory",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-block w-3 h-3 rounded-full border shrink-0",
                    selected
                      ? "bg-saffron border-saffron"
                      : "border-earth-mid/50 bg-transparent",
                  )}
                />
                <span className="flex-1 min-w-0">
                  <span className="block font-lyric text-[14px] text-ink">
                    {META[p].label}
                  </span>
                  <span className="block font-lyric-italic text-[11px] text-earth-mid">
                    {META[p].gloss}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 min-h-[18px]">
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          className="font-pressure-caps text-[10px] tracking-wider text-earth-mid hover:text-saffron disabled:opacity-50 transition-colors"
        >
          Reset to default
        </button>
        {note && (
          <span className="font-lyric-italic text-[11px] text-sage" aria-live="polite">
            {note}
          </span>
        )}
      </div>
    </section>
  );
}
