"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button, ButtonBare } from "@/components/ui/button"
import { LabelTiny } from "@/components/gurukul/LabelTiny"
import { GoldRule } from "@/components/gurukul/GoldRule"
import { cn } from "@/lib/utils"
import {
  useAffirmations,
  useCreateAffirmation,
  useUpdateAffirmation,
  useDeleteAffirmation,
} from "@/hooks/useAffirmations"
import type { Affirmation } from "@/types"

export default function AffirmationsSettingsPage() {
  const { affirmations, loading } = useAffirmations()
  const create = useCreateAffirmation()
  const update = useUpdateAffirmation()
  const remove = useDeleteAffirmation()

  // ── Add modal state ──
  const [addOpen, setAddOpen] = useState(false)
  const [draftText, setDraftText] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)

  // ── Edit modal state ──
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")
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
    setCreateError(null)
    setAddOpen(true)
  }

  function closeAdd() {
    setAddOpen(false)
    setDraftText("")
    setCreateError(null)
  }

  async function handleCreate() {
    const text = draftText.trim()
    if (!text) return
    setCreateError(null)

    try {
      await create.mutateAsync({ text })
      closeAdd()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not save")
    }
  }

  function startEdit(a: Affirmation) {
    setEditingId(a.id)
    setEditingText(a.text)
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
    if (text === a.text) {
      cancelEdit()
      return
    }
    try {
      await update.mutateAsync({ id: a.id, text })
      cancelEdit()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Could not save")
    }
  }

  function toggleActive(a: Affirmation) {
    update.mutate({ id: a.id, isActive: !a.isActive })
  }

  if (loading) {
    return (
      <p className="font-lyric-italic text-earth-mid py-6 text-center">
        Loading…
      </p>
    )
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
            className="fixed inset-0 z-100 flex items-end sm:items-center justify-center sm:px-4 bg-ink/55 backdrop-blur-sm animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-label="Add an affirmation"
            onClick={closeAdd}
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
                  placeholder="e.g. I do hard things gently."
                  className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[14px] font-lyric-italic outline-none focus:border-ink/40 resize-none"
                />
                <p className="text-right text-[10px] text-earth-mid">
                  {draftText.length}/280
                </p>
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
            className="fixed inset-0 z-100 flex items-end sm:items-center justify-center sm:px-4 bg-ink/55 backdrop-blur-sm animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-label="Edit affirmation"
            onClick={cancelEdit}
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
                  className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[14px] font-lyric-italic outline-none focus:border-ink/40 resize-none"
                />
                <p className="text-right text-[10px] text-earth-mid">
                  {editingText.length}/280
                </p>
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
