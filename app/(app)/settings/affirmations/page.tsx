"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button, ButtonBare } from "@/components/ui/button"
import { LabelTiny } from "@/components/gurukul/LabelTiny"
import { GoldRule } from "@/components/gurukul/GoldRule"
import { Loader } from "@/components/gurukul/Loader"
import { cn } from "@/lib/utils"
import {
  useAffirmations,
  useCreateAffirmation,
  useUpdateAffirmation,
  useDeleteAffirmation,
} from "@/hooks/useAffirmations"
import { normalizeAffirmation } from "@/lib/affirmations/normalize"
import {
  AFFIRMATION_LANGUAGES,
  type Affirmation,
  type AffirmationLanguage,
} from "@/types"

export default function AffirmationsSettingsPage() {
  const { affirmations, loading } = useAffirmations()
  const create = useCreateAffirmation()
  const update = useUpdateAffirmation()
  const remove = useDeleteAffirmation()

  // ── Add modal state ──
  const [addOpen, setAddOpen] = useState(false)
  const [draftText, setDraftText] = useState("")
  const [draftLanguage, setDraftLanguage] =
    useState<AffirmationLanguage>("en-US")
  const [createError, setCreateError] = useState<string | null>(null)

  // ── Edit modal state ──
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")
  const [editingLanguage, setEditingLanguage] =
    useState<AffirmationLanguage>("en-US")
  const [editError, setEditError] = useState<string | null>(null)

  const editingAffirmation = useMemo(
    () =>
      editingId
        ? (affirmations.find((a) => a.id === editingId) ?? null)
        : null,
    [affirmations, editingId],
  )

  const anyModalOpen = addOpen || editingId !== null

  useEffect(() => {
    if (!anyModalOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [anyModalOpen])

  // ── Visible — active first, then paused; alphabetical inside each band. ──
  const visible = useMemo(() => {
    return affirmations
      .slice()
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
        return a.text.localeCompare(b.text, undefined, { sensitivity: "base" })
      })
  }, [affirmations])

  function openAdd() {
    setDraftText("")
    setDraftLanguage("en-US")
    setCreateError(null)
    setAddOpen(true)
  }

  function closeAdd() {
    setAddOpen(false)
    setDraftText("")
    setDraftLanguage("en-US")
    setCreateError(null)
  }

  async function handleCreate() {
    const text = draftText.trim()
    if (!text) return
    setCreateError(null)

    try {
      await create.mutateAsync({ text, language: draftLanguage })
      closeAdd()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not save")
    }
  }

  function startEdit(a: Affirmation) {
    setEditingId(a.id)
    setEditingText(a.text)
    setEditingLanguage(a.language ?? "en-US")
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  async function commitEdit(a: Affirmation) {
    const text = editingText.trim()
    if (!text) {
      cancelEdit()
      return
    }
    const textChanged = text !== a.text
    const languageChanged = editingLanguage !== (a.language ?? "en-US")
    if (!textChanged && !languageChanged) {
      cancelEdit()
      return
    }
    try {
      await update.mutateAsync({
        id: a.id,
        ...(textChanged ? { text } : {}),
        ...(languageChanged ? { language: editingLanguage } : {}),
      })
      cancelEdit()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Could not save")
    }
  }

  function toggleActive(a: Affirmation) {
    update.mutate({ id: a.id, isActive: !a.isActive })
  }

  if (loading) {
    return <Loader fullScreen caption="gathering your mantras…" />
  }

  return (
    <div className="space-y-6 py-2">
      <header className="text-center space-y-2 relative">
        <LabelTiny>Mantra · the words you return to</LabelTiny>
        <h1 className="font-lyric text-3xl text-ink">Your affirmations.</h1>
        <p className="font-lyric-italic text-sm text-earth-deep max-w-md mx-auto">
          Short statements you choose to revisit. Add, edit, or pause any of
          them.
        </p>
      </header>

      <GoldRule width="section" />

      {/* The recital trigger now lives on the Plan tab — this page is
          purely the library. We keep a quiet pointer so users coming here
          looking to practice know where it moved. */}
      {affirmations.some((a) => a.isActive) && (
        <p className="font-lyric-italic text-[11px] text-earth-mid text-center">
          Recite from the{" "}
          <Link href="/plan" className="text-saffron hover:underline">
            Plan tab
          </Link>{" "}
          — that&apos;s the morning trigger.
        </p>
      )}

      <Button type="button" onClick={openAdd} className="w-full">
        + Add an affirmation
      </Button>

      <GoldRule width="section" />

      <section className="space-y-3">
        <LabelTiny className="block">Your affirmations</LabelTiny>
        <p className="font-lyric-italic text-[11px] text-earth-mid">
          Tap to edit. The toggle on the right pauses an affirmation without
          removing it.
        </p>

        {affirmations.length === 0 ? (
          <Card className="bg-ivory-deep border-gold/40">
            <CardContent className="pt-6 pb-6 text-center">
              <p className="font-lyric-italic text-sm text-earth-mid">
                No affirmations yet — tap the button above to add one.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="rounded-md border border-gold/30 bg-ivory-deep divide-y divide-gold/20 overflow-x-hidden overflow-y-auto h-[55vh]">
            {visible.map((a) => {
              const isEditing = editingId === a.id
              return (
                <li
                  key={a.id}
                  className={cn(
                    "group relative transition-colors hover:bg-ivory",
                    !a.isActive && "opacity-60",
                    isEditing && "bg-ivory",
                  )}
                >
                  <div className="flex items-stretch">
                    <ButtonBare
                      type="button"
                      onClick={() => startEdit(a)}
                      className="flex-1 text-left px-3 py-2.5 min-w-0"
                      aria-label={`Edit affirmation`}
                    >
                      <p
                        className={cn(
                          "font-lyric text-[14px] leading-snug",
                          a.isActive
                            ? "text-ink"
                            : "text-earth-mid line-through",
                        )}
                      >
                        {a.text}
                      </p>
                    </ButtonBare>

                    <ButtonBare
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleActive(a)
                      }}
                      title={
                        a.isActive
                          ? "Pause this affirmation"
                          : "Activate this affirmation"
                      }
                      aria-pressed={a.isActive}
                      className={cn(
                        "relative h-4 w-7 rounded-full transition-colors shrink-0 self-center mr-3",
                        a.isActive ? "bg-saffron" : "bg-earth-mid/30",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-3 w-3 rounded-full bg-ivory shadow transition-all",
                          a.isActive ? "left-3.5" : "left-0.5",
                        )}
                      />
                    </ButtonBare>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <GoldRule width="section" />

      <Link
        href="/settings"
        className="block text-center font-pressure-caps text-[10px] text-earth-mid hover:text-earth-deep"
      >
        ← back to settings
      </Link>

      {addOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onClick={() => {
              if (!create.isPending) closeAdd()
            }}
            className="fixed inset-0 z-100 flex items-end sm:items-center justify-center sm:px-4 bg-ink/55 backdrop-blur-sm animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-label="Add an affirmation"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-gold/40 bg-ivory-deep p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 fade-in duration-200"
            >
              <div className="space-y-1">
                <h3 className="font-pressure-caps text-[11px] tracking-[2px] text-earth-deep">
                  Add an affirmation
                </h3>
                <p className="font-lyric-italic text-[11px] text-earth-mid">
                  A short statement you want to return to.
                </p>
              </div>

              <LanguagePicker
                value={draftLanguage}
                onChange={setDraftLanguage}
              />

              <div className="space-y-1.5">
                <label className="label-tiny block">Text</label>
                <textarea
                  autoFocus
                  value={draftText}
                  onChange={(e) => {
                    setDraftText(e.target.value.slice(0, 280))
                    setCreateError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      void handleCreate()
                    }
                    if (e.key === "Escape") closeAdd()
                  }}
                  rows={3}
                  placeholder={
                    AFFIRMATION_LANGUAGES.find(
                      (l) => l.code === draftLanguage,
                    )?.hint ?? "e.g. I do hard things gently."
                  }
                  dir={draftLanguage === "hi-IN" ? "auto" : undefined}
                  className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[14px] font-lyric-italic outline-none focus:border-ink/40 resize-none"
                />
                <div className="flex items-baseline justify-between gap-2">
                  <SpeechMatchPreview
                    text={draftText}
                    language={draftLanguage}
                  />
                  <p className="text-[10px] text-earth-mid shrink-0">
                    {draftText.length}/280
                  </p>
                </div>
              </div>

              {createError && (
                <p className="text-[11px] text-saffron font-lyric-italic">
                  {createError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <ButtonBare
                  type="button"
                  onClick={closeAdd}
                  disabled={create.isPending}
                  className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-earth-deep px-3 py-1.5"
                >
                  Cancel
                </ButtonBare>
                <ButtonBare
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={!draftText.trim() || create.isPending}
                  className="text-[10px] font-pressure-caps tracking-wider bg-saffron text-ivory rounded-md px-3 py-1.5 disabled:opacity-50"
                >
                  {create.isPending ? "Adding…" : "Add"}
                </ButtonBare>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {editingAffirmation &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onClick={cancelEdit}
            className="fixed inset-0 z-100 flex items-end sm:items-center justify-center sm:px-4 bg-ink/55 backdrop-blur-sm animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-label="Edit affirmation"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-gold/40 bg-ivory-deep p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 fade-in duration-200"
            >
              <div className="space-y-1">
                <h3 className="font-pressure-caps text-[11px] tracking-[2px] text-earth-deep">
                  Edit affirmation
                </h3>
                <p className="font-lyric-italic text-[11px] text-earth-mid">
                  Refine the words. Pause it from the row toggle.
                </p>
              </div>

              <LanguagePicker
                value={editingLanguage}
                onChange={setEditingLanguage}
              />

              <div className="space-y-1.5">
                <label className="label-tiny block">Text</label>
                <textarea
                  autoFocus
                  value={editingText}
                  onChange={(e) => {
                    setEditingText(e.target.value.slice(0, 280))
                    setEditError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      void commitEdit(editingAffirmation)
                    }
                    if (e.key === "Escape") cancelEdit()
                  }}
                  rows={3}
                  dir={editingLanguage === "hi-IN" ? "auto" : undefined}
                  className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[14px] font-lyric-italic outline-none focus:border-ink/40 resize-none"
                />
                <div className="flex items-baseline justify-between gap-2">
                  <SpeechMatchPreview
                    text={editingText}
                    language={editingLanguage}
                  />
                  <p className="text-[10px] text-earth-mid shrink-0">
                    {editingText.length}/280
                  </p>
                </div>
              </div>

              {editError && (
                <p className="text-[11px] text-saffron font-lyric-italic">
                  {editError}
                </p>
              )}

              <div className="flex items-center justify-between pt-1">
                <ButtonBare
                  type="button"
                  onClick={() => {
                    if (
                      confirm(`Remove this affirmation?\n\n"${editingAffirmation.text}"`)
                    ) {
                      void remove.mutateAsync(editingAffirmation.id)
                      cancelEdit()
                    }
                  }}
                  className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-saffron transition-colors"
                >
                  Remove
                </ButtonBare>
                <div className="flex items-center gap-2">
                  <ButtonBare
                    type="button"
                    onClick={cancelEdit}
                    className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-earth-deep px-3 py-1.5"
                  >
                    Cancel
                  </ButtonBare>
                  <ButtonBare
                    type="button"
                    onClick={() => void commitEdit(editingAffirmation)}
                    disabled={!editingText.trim()}
                    className="text-[10px] font-pressure-caps tracking-wider bg-ink text-ivory rounded-md px-3 py-1.5 disabled:opacity-50"
                  >
                    Save
                  </ButtonBare>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

/**
 * Live preview of how an affirmation will be matched during practice. We
 * run the same `normalizeAffirmation()` that the practice page applies to
 * the spoken transcript, so the user can see the canonical form before
 * saving and adjust typos / unusual punctuation that won't match speech.
 */
function SpeechMatchPreview({
  text,
  language,
}: {
  text: string
  language: AffirmationLanguage
}) {
  const normalized = normalizeAffirmation(text, language)
  if (!text.trim()) {
    return (
      <p className="text-[10px] text-earth-mid italic font-lyric-italic min-w-0 truncate">
        speech match preview will appear here
      </p>
    )
  }
  // Heuristic only meaningful for Latin-script affirmations: a stray
  // single-letter token (e.g. "I m calm" → "i m calm") is almost always a
  // typo. Devanagari has its own quirks; skip the heuristic there.
  const hasStrayLetter =
    language !== "hi-IN" && /(^|\s)[a-z](\s|$)/.test(normalized)
  return (
    <div className="min-w-0 flex-1">
      <p
        className={cn(
          "text-[10px] font-pressure-caps tracking-wider truncate",
          hasStrayLetter ? "text-saffron" : "text-earth-mid",
        )}
        title={normalized}
      >
        <span className="text-earth-mid/70">speech match: </span>
        <span className="font-sans tracking-normal normal-case">
          {normalized || "—"}
        </span>
      </p>
      {hasStrayLetter && (
        <p className="text-[10px] text-saffron font-lyric-italic mt-0.5">
          stray letter detected — STT can&apos;t produce that. Did you mean a
          contraction or full word?
        </p>
      )}
    </div>
  )
}

/**
 * Language picker for an affirmation. Drives both STT recognition (the
 * BCP-47 tag goes straight to the speech engine) and the normalization
 * branch used to compare what was spoken against what was written.
 */
function LanguagePicker({
  value,
  onChange,
}: {
  value: AffirmationLanguage
  onChange: (next: AffirmationLanguage) => void
}) {
  return (
    <div className="space-y-1.5">
      <label className="label-tiny block">Language</label>
      <div className="flex flex-wrap gap-1.5">
        {AFFIRMATION_LANGUAGES.map((l) => {
          const isActive = value === l.code
          return (
            <ButtonBare
              key={l.code}
              type="button"
              onClick={() => onChange(l.code)}
              className={cn(
                "rounded-full px-3 py-1 text-[10px] font-pressure-caps tracking-wider transition-all border",
                isActive
                  ? "bg-ink text-ivory border-ink shadow-sm"
                  : "bg-ivory text-earth-deep border-gold/40 hover:bg-ivory-deep",
              )}
            >
              {l.label}
            </ButtonBare>
          )
        })}
      </div>
    </div>
  )
}
