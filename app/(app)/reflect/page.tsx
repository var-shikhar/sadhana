"use client"

import { useMemo, useState } from "react"
import { Button, ButtonBare } from "@/components/ui/button"
import { useReflection, useSubmitReflection } from "@/hooks/useReflection"
import {
  useReflectionChips,
  useCreateReflectionChip,
} from "@/hooks/useReflectionChips"
import { type ChipCategory, type Reflection } from "@/types"
import { ChipRail } from "@/components/reflection/ChipRail"
import { DescriptionModal } from "@/components/reflection/DescriptionModal"
import { DaySummary } from "@/components/reflection/DaySummary"
import { ReflectionComplete } from "@/components/reflection/ReflectionComplete"
import { OmGlyph } from "@/components/gurukul/OmGlyph"
import { SanskritTerm } from "@/components/gurukul/SanskritTerm"
import { GoldRule } from "@/components/gurukul/GoldRule"
import { LotusMandala } from "@/components/ornament/LotusMandala"
import { LabelTiny } from "@/components/gurukul/LabelTiny"

const DEVANAGARI_NUMERALS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"]

function devanagariCount(n: number): string {
  return String(n)
    .split("")
    .map((d) => DEVANAGARI_NUMERALS[Number(d)] ?? d)
    .join("")
}

function flattenReflectionChips(reflection: Reflection): string[] {
  return [
    ...(reflection.goodChips ?? []),
    ...(reflection.neutralChips ?? []),
    ...(reflection.badChips ?? []),
  ]
}

export default function ReflectPage() {
  const { reflection, loading } = useReflection()
  const submit = useSubmitReflection()
  const { chips: libraryChips } = useReflectionChips()
  const createChip = useCreateReflectionChip()

  const [selectedNames, setSelectedNames] = useState<string[]>([])
  const [descriptions, setDescriptions] = useState<Record<string, string>>({})
  const [daySummary, setDaySummary] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  /** Chip names rendered on the reflect rail. The GET endpoint returns
   *  every chip (so settings can show paused ones), so we filter to active
   *  chips here. Group-toggle cascades to chips' isActive, so this single
   *  flag is the truth source. */
  const libraryChipNames = useMemo(
    () => libraryChips.filter((c) => c.isActive).map((c) => c.name),
    [libraryChips],
  )

  /** Names of chips that are paused in the library. Used to badge any
   *  selected-but-paused chips during edit-mode (e.g. user re-edits today's
   *  reflection after pausing one of its acts in settings). */
  const pausedChipNames = useMemo(
    () => new Set(libraryChips.filter((c) => !c.isActive).map((c) => c.name)),
    [libraryChips],
  )

  /** Map of name → category, derived from the FULL library (including paused
   *  groups) so that already-selected acts can still be bucketed correctly. */
  const chipCategoryByName = useMemo(() => {
    const map: Record<string, ChipCategory> = {}
    for (const c of libraryChips) map[c.name] = c.category
    return map
  }, [libraryChips])

  function toggleChip(name: string) {
    setSelectedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    )
  }

  async function handleCreateChip(name: string, category: ChipCategory) {
    const chip = await createChip.mutateAsync({ name, category })
    setSelectedNames((prev) =>
      prev.includes(chip.name) ? prev : [...prev, chip.name],
    )
  }

  // Bucket the selected names by their library category so we can store
  // them correctly on submit and show the daily tally.
  const selectionByCategory = useMemo(() => {
    const buckets: Record<ChipCategory, string[]> = {
      good: [],
      neutral: [],
      bad: [],
    }
    for (const name of selectedNames) {
      const cat = chipCategoryByName[name] ?? "neutral"
      buckets[cat].push(name)
    }
    return buckets
  }, [selectedNames, chipCategoryByName])

  // Flat list for the description modal — keeps user's selection order.
  const flatSelected = useMemo(
    () =>
      selectedNames.map((name) => ({
        name,
        category: chipCategoryByName[name] ?? ("neutral" as ChipCategory),
      })),
    [selectedNames, chipCategoryByName],
  )

  function handleSubmitClick() {
    if (selectedNames.length === 0) return
    setModalOpen(true)
  }

  function handleStartEdit() {
    if (!reflection) return
    setSelectedNames(flattenReflectionChips(reflection))
    setDescriptions(reflection.chipDescriptions ?? {})
    setDaySummary(reflection.daySummary ?? "")
    setIsEditing(true)
  }

  function handleCancelEdit() {
    setSelectedNames([])
    setDescriptions({})
    setDaySummary("")
    setIsEditing(false)
    setModalOpen(false)
  }

  async function handleConfirm(finalDescriptions: Record<string, string>) {
    setDescriptions(finalDescriptions)
    await submit.mutateAsync({
      mode: "quick",
      goodChips: selectionByCategory.good,
      badChips: selectionByCategory.bad,
      neutralChips: selectionByCategory.neutral,
      chipDescriptions: finalDescriptions,
      daySummary: daySummary.trim() || null,
    })
    setModalOpen(false)
    if (isEditing) {
      // Returned to the sealed view; clear local state so a fresh entry
      // tomorrow doesn't carry today's stuff over.
      setSelectedNames([])
      setDescriptions({})
      setDaySummary("")
      setIsEditing(false)
    }
  }

  if (loading) {
    return <p className="font-lyric-italic text-earth-mid py-6">Loading...</p>
  }

  // ── Already submitted today AND not editing: show the sealed ledger. ──
  if (reflection && !isEditing) {
    return (
      <div className="space-y-6 py-6 px-2 relative min-h-[60vh] bg-linear-to-b from-ivory-deep to-parchment rounded-lg">
        <LotusMandala
          className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          tone="earth"
          opacity={0.1}
        />
        <header className="text-center space-y-2 relative">
          <OmGlyph size={32} tone="saffron" />
          <div className="text-ink-soft">
            <SanskritTerm term="Svadhyaya" gloss="self-study" />
          </div>
        </header>
        <GoldRule width="section" />
        <ReflectionComplete reflection={reflection} onEdit={handleStartEdit} />
      </div>
    )
  }

  // ── Composing today's reflection (fresh entry OR re-edit). ──
  return (
    <div className="space-y-6 py-6 px-2 relative bg-linear-to-b from-ivory-deep to-parchment min-h-[60vh] rounded-lg">
      <LotusMandala
        className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        tone="earth"
        opacity={0.1}
      />

      <header className="text-center space-y-2 relative">
        <OmGlyph size={32} tone="saffron" />
        <div className="text-ink-soft">
          <SanskritTerm term="Svadhyaya" gloss="self-study" />
        </div>
        <p className="font-lyric-italic text-base text-earth-deep">
          {isEditing ? "Revise the day." : "What did the day reveal?"}
        </p>
      </header>

      <GoldRule width="section" />

      {/* Chip rail header — single number, no category breakdown */}
      <div className="relative flex items-baseline justify-between">
        <div className="space-y-0.5">
          <LabelTiny>{isEditing ? "Editing today" : "The ledger"}</LabelTiny>
          <p className="font-lyric-italic text-[12px] text-earth-mid">
            {isEditing
              ? "Add, remove, or change anything you noted."
              : "Tap what you lived today."}
          </p>
        </div>
        <div
          className={`flex ${selectedNames.length > 0 ? "items-baseline" : "items-center"} gap-1.5`}
        >
          <span className="font-lyric text-2xl text-saffron tabular-nums leading-none">
            {devanagariCount(selectedNames.length)}
          </span>
          <span className="font-pressure-caps text-[9px] text-earth-mid">
            selected
          </span>
        </div>
      </div>

      {/* Single chip rail — categories live in the library, not here */}
      <div className="relative">
        <ChipRail
          libraryChipNames={libraryChipNames}
          selected={selectedNames}
          pausedNames={pausedChipNames}
          onToggle={toggleChip}
          onCreate={handleCreateChip}
        />
      </div>

      {/* Day summary — sealing the day */}
      <div className="relative pt-1">
        <DaySummary value={daySummary} onChange={setDaySummary} />
      </div>

      <GoldRule width="section" />

      {/* Actions */}
      <div className="relative space-y-2">
        <Button
          className="w-full"
          disabled={selectedNames.length === 0 || submit.isPending}
          onClick={handleSubmitClick}
        >
          {submit.isPending
            ? isEditing
              ? "Updating…"
              : "Sealing…"
            : selectedNames.length === 0
              ? "Tap an act to begin"
              : isEditing
                ? `Update reflection (${selectedNames.length})`
                : `Reflect on ${selectedNames.length} ${
                    selectedNames.length === 1 ? "thing" : "things"
                  }`}
        </Button>
        {isEditing && (
          <ButtonBare
            type="button"
            onClick={handleCancelEdit}
            disabled={submit.isPending}
            className="w-full text-center font-pressure-caps text-[10px] text-earth-mid hover:text-earth-deep py-1"
          >
            Cancel · keep what was sealed
          </ButtonBare>
        )}
      </div>

      {modalOpen && (
        <DescriptionModal
          selected={flatSelected}
          initial={descriptions}
          onConfirm={handleConfirm}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
