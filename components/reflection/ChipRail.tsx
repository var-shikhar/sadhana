"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import {
  CHIP_CATEGORY_META,
  CHIP_CATEGORY_ORDER,
  type ChipCategory,
} from "@/types"
import { ButtonBare } from "@/components/ui/button"

interface ChipRailProps {
  /** Every chip name in the library, regardless of category. */
  libraryChipNames: string[]
  /** Names of chips selected today (across all categories). */
  selected: string[]
  /** Names of chips that exist in the library but are paused. Selected
   *  chips that match this set get a subtle "paused" badge so the user knows
   *  the underlying act has been disabled since they picked it. */
  pausedNames?: Set<string>
  onToggle: (name: string) => void
  /** Inline add: user types a name AND picks a category before commit. */
  onCreate: (name: string, category: ChipCategory) => void | Promise<void>
  className?: string
}

const CATEGORY_DOT: Record<ChipCategory, string> = {
  good: "bg-sage",
  neutral: "bg-earth-mid",
  bad: "bg-saffron",
}

const CATEGORY_BORDER: Record<ChipCategory, string> = {
  good: "border-sage",
  neutral: "border-earth-mid",
  bad: "border-saffron",
}

export function ChipRail({
  libraryChipNames,
  selected,
  pausedNames,
  onToggle,
  onCreate,
  className,
}: ChipRailProps) {
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState("")
  const [draftCategory, setDraftCategory] = useState<ChipCategory>("good")
  const [submitting, setSubmitting] = useState(false)

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (!composing) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [composing])

  // Show every library chip, plus any selected names that aren't in the
  // library (defensive — shouldn't happen, but renders gracefully).
  const allChips = Array.from(new Set([...libraryChipNames, ...selected]))

  function closeModal() {
    setComposing(false)
    setDraft("")
    setDraftCategory("good")
  }

  async function commit() {
    const name = draft.trim()
    if (!name) {
      closeModal()
      return
    }
    setSubmitting(true)
    try {
      await onCreate(name, draftCategory)
      closeModal()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-1.5">
        {allChips.length === 0 && !composing && (
          <p className="font-lyric-italic text-[12px] text-earth-mid italic py-2">
            no acts yet — tap + to add your first
          </p>
        )}

        {allChips.map((name) => {
          const isSelected = selected.includes(name)
          const isPaused = pausedNames?.has(name) ?? false
          return (
            <ButtonBare
              key={name}
              type="button"
              onClick={() => onToggle(name)}
              title={
                isPaused
                  ? "This act has been paused in your library — still part of today's reflection."
                  : undefined
              }
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12px] font-sans transition-all inline-flex items-center gap-1.5",
                isSelected
                  ? "bg-ink text-ivory border-ink shadow-[0_2px_6px_rgba(26,18,8,0.25)]"
                  : "bg-ivory text-earth-deep border-gold/40 hover:bg-ivory-deep hover:border-gold",
                isPaused && "italic opacity-75",
              )}
            >
              <span>{name}</span>
              {isPaused && (
                <span
                  className={cn(
                    "text-[8px] font-pressure-caps tracking-wider rounded-full border px-1.5 py-px",
                    isSelected
                      ? "border-ivory/40 text-ivory/70"
                      : "border-earth-mid/40 text-earth-mid",
                  )}
                >
                  paused
                </span>
              )}
            </ButtonBare>
          )
        })}

        {!composing && (
          <ButtonBare
            type="button"
            onClick={() => setComposing(true)}
            className="rounded-full border border-dashed border-earth-mid/50 px-3 py-1.5 text-[12px] font-sans text-earth-mid hover:border-earth-deep hover:text-earth-deep transition-all"
          >
            + add
          </ButtonBare>
        )}
      </div>

      {composing &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-100 flex items-center justify-center px-4 bg-ink/55 backdrop-blur-sm animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-label="Add a new act"
          >
            <div className="w-full max-w-sm rounded-2xl border border-gold/40 bg-ivory-deep p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="space-y-1">
                <h3 className="font-pressure-caps text-[11px] tracking-[2px] text-earth-deep">
                  Add an act
                </h3>
                <p className="font-lyric-italic text-[11px] text-earth-mid">
                  A small named thing you do — or don&apos;t do — on a day.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="label-tiny block">Name the act</label>
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, 60))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      void commit()
                    }
                  }}
                  disabled={submitting}
                  placeholder="e.g. deep work, scrolled, walked outside"
                  className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[13px] font-sans outline-none focus:border-ink/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="label-tiny block">
                  Where does it belong?
                </label>
                <div className="flex gap-1.5">
                  {CHIP_CATEGORY_ORDER.map((cat) => {
                    const meta = CHIP_CATEGORY_META[cat]
                    const isActive = draftCategory === cat
                    return (
                      <ButtonBare
                        key={cat}
                        type="button"
                        onClick={() => setDraftCategory(cat)}
                        className={cn(
                          "flex-1 rounded-full px-3 py-1.5 text-[10px] font-pressure-caps tracking-wider transition-all flex items-center justify-center gap-1.5 border",
                          isActive
                            ? cn(
                                "bg-ink text-ivory shadow-sm",
                                CATEGORY_BORDER[cat],
                              )
                            : "bg-ivory text-earth-deep border-gold/30 hover:bg-ivory-deep",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            CATEGORY_DOT[cat],
                          )}
                        />
                        {meta.label}
                      </ButtonBare>
                    )
                  })}
                </div>
                <p className="font-lyric-italic text-[10px] text-earth-mid">
                  Used internally for your daily tally — you won&apos;t see it
                  again while you reflect.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <ButtonBare
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="text-[11px] font-pressure-caps text-earth-mid hover:text-earth-deep px-3 py-1.5"
                >
                  Cancel
                </ButtonBare>
                <ButtonBare
                  type="button"
                  onClick={() => void commit()}
                  disabled={submitting || !draft.trim()}
                  className="text-[11px] font-pressure-caps bg-saffron text-ivory rounded-md px-3 py-1.5 disabled:opacity-50"
                >
                  {submitting ? "Adding…" : "Add act"}
                </ButtonBare>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
