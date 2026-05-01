"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useReflection, useSubmitReflection } from "@/hooks/useReflection";
import {
  useReflectionChips,
  useCreateReflectionChip,
} from "@/hooks/useReflectionChips";
import {
  CHIP_CATEGORY_META,
  CHIP_CATEGORY_ORDER,
  type ChipCategory,
} from "@/types";
import { ChipBucket } from "@/components/reflection/ChipBucket";
import { DescriptionModal } from "@/components/reflection/DescriptionModal";
import { DaySummary } from "@/components/reflection/DaySummary";
import { ReflectionComplete } from "@/components/reflection/ReflectionComplete";
import { OmGlyph } from "@/components/gurukul/OmGlyph";
import { SanskritTerm } from "@/components/gurukul/SanskritTerm";
import { GoldRule } from "@/components/gurukul/GoldRule";
import { LotusMandala } from "@/components/ornament/LotusMandala";
import { LabelTiny } from "@/components/gurukul/LabelTiny";

type SelectionMap = Record<ChipCategory, string[]>;

const EMPTY_SELECTION: SelectionMap = { good: [], neutral: [], bad: [] };

export default function ReflectPage() {
  const { reflection, loading } = useReflection();
  const submit = useSubmitReflection();
  const { chips: libraryChips } = useReflectionChips();
  const createChip = useCreateReflectionChip();

  const [selection, setSelection] = useState<SelectionMap>(EMPTY_SELECTION);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [daySummary, setDaySummary] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Library chips grouped by category — passed into each bucket so it knows
  // what to render in its rail.
  const libraryByCategory = useMemo(() => {
    const map: Record<ChipCategory, string[]> = { good: [], neutral: [], bad: [] };
    for (const c of libraryChips) {
      if (!map[c.category]) continue;
      map[c.category].push(c.name);
    }
    return map;
  }, [libraryChips]);

  function toggleChip(cat: ChipCategory, name: string) {
    setSelection((prev) => {
      const existing = prev[cat];
      const isSelected = existing.includes(name);
      return {
        ...prev,
        [cat]: isSelected
          ? existing.filter((n) => n !== name)
          : [...existing, name],
      };
    });
  }

  async function handleCreateChip(cat: ChipCategory, name: string) {
    const chip = await createChip.mutateAsync({ name, category: cat });
    setSelection((prev) => ({
      ...prev,
      [cat]: prev[cat].includes(chip.name) ? prev[cat] : [...prev[cat], chip.name],
    }));
  }

  // Flat list of every chip the user has picked, in display order, with category.
  const flatSelected = useMemo(
    () =>
      CHIP_CATEGORY_ORDER.flatMap((cat) =>
        selection[cat].map((name) => ({ name, category: cat }))
      ),
    [selection]
  );

  const totalSelected =
    selection.good.length + selection.neutral.length + selection.bad.length;

  function handleSubmitClick() {
    if (totalSelected === 0) return;
    setModalOpen(true);
  }

  async function handleConfirm(finalDescriptions: Record<string, string>) {
    setDescriptions(finalDescriptions);
    await submit.mutateAsync({
      mode: "quick",
      goodChips: selection.good,
      badChips: selection.bad,
      neutralChips: selection.neutral,
      chipDescriptions: finalDescriptions,
      daySummary: daySummary.trim() || null,
    });
    setModalOpen(false);
  }

  if (loading) {
    return <p className="font-lyric-italic text-earth-mid py-6">Loading...</p>;
  }

  // ── Already submitted today: show the sealed ledger. ──
  if (reflection) {
    return (
      <div className="space-y-6 py-6 px-2 relative min-h-[60vh] bg-linear-to-b from-ivory-deep to-parchment rounded-lg">
        <LotusMandala
          className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          tone="earth"
          opacity={0.10}
        />
        <header className="text-center space-y-2 relative">
          <OmGlyph size={32} tone="saffron" />
          <div className="text-ink-soft">
            <SanskritTerm term="Svadhyaya" gloss="self-study" />
          </div>
        </header>
        <GoldRule width="section" />
        <ReflectionComplete reflection={reflection} />
      </div>
    );
  }

  // ── Composing today's reflection. ──
  return (
    <div className="space-y-6 py-6 px-2 relative bg-linear-to-b from-ivory-deep to-parchment min-h-[60vh] rounded-lg">
      <LotusMandala
        className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        tone="earth"
        opacity={0.10}
      />

      <header className="text-center space-y-2 relative">
        <OmGlyph size={32} tone="saffron" />
        <div className="text-ink-soft">
          <SanskritTerm term="Svadhyaya" gloss="self-study" />
        </div>
        <p className="font-lyric-italic text-base text-earth-deep">
          What did the day reveal?
        </p>
      </header>

      <GoldRule width="section" />

      <div className="space-y-1 text-center relative">
        <LabelTiny>The ledger</LabelTiny>
        <p className="font-lyric-italic text-[12px] text-earth-mid">
          Tap what you lived today. Add your own with <span className="font-sans">+</span>.
        </p>
      </div>

      {/* Three-bucket grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
        {CHIP_CATEGORY_ORDER.map((cat) => {
          const meta = CHIP_CATEGORY_META[cat];
          return (
            <ChipBucket
              key={cat}
              category={cat}
              label={meta.label}
              sanskrit={meta.sanskrit}
              gloss={meta.gloss}
              libraryChipNames={libraryByCategory[cat]}
              selected={selection[cat]}
              onToggle={(name) => toggleChip(cat, name)}
              onCreate={(name) => handleCreateChip(cat, name)}
            />
          );
        })}
      </div>

      {/* Day summary — sealing the day */}
      <div className="relative pt-1">
        <DaySummary value={daySummary} onChange={setDaySummary} />
      </div>

      {/* Library hint */}
      <p className="text-center text-[10px] text-earth-mid font-sans relative">
        <Link
          href="/settings/reflection-chips"
          className="underline underline-offset-2 hover:text-earth-deep"
        >
          Manage your chip library →
        </Link>
      </p>

      <GoldRule width="section" />

      {/* Submit */}
      <div className="relative">
        <Button
          className="w-full"
          disabled={totalSelected === 0 || submit.isPending}
          onClick={handleSubmitClick}
        >
          {submit.isPending
            ? "Sealing…"
            : totalSelected === 0
            ? "Tap a chip to begin"
            : `Reflect on ${totalSelected} ${totalSelected === 1 ? "thing" : "things"}`}
        </Button>
      </div>

      <DescriptionModal
        open={modalOpen}
        selected={flatSelected}
        initial={descriptions}
        onConfirm={handleConfirm}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
