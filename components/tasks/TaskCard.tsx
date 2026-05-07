"use client"

import { useEffect, useRef, useState } from "react"
import { ButtonBare } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Task } from "@/types"

interface TaskCardProps {
  task: Task
  /** Tap on the card body (not the checkbox) — opens the edit modal. */
  onEdit: () => void
  /** Toggle the task's done status. The card handles inline note capture
   *  itself; the parent only sees the final state via onMarkDone / onUndone. */
  onMarkDone: (note: string | null) => void
  onUndone: () => void
}

/**
 * One task row. On checkbox-tap, immediately marks done (parent applies
 * optimistic state). An inline input slides in below the title for an
 * optional completion note. Blur saves; Escape dismisses.
 */
export function TaskCard({ task, onEdit, onMarkDone, onUndone }: TaskCardProps) {
  const isDone = task.status === "done"
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (noteOpen) inputRef.current?.focus()
  }, [noteOpen])

  function handleCheckboxClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (isDone) {
      // Un-check back to open. Preserves the existing note server-side.
      onUndone()
      setNoteOpen(false)
      setNoteDraft("")
      return
    }
    // Mark done immediately, then open the inline note input.
    onMarkDone(null)
    setNoteDraft("")
    setNoteOpen(true)
  }

  function commitNote() {
    const trimmed = noteDraft.trim()
    if (trimmed) onMarkDone(trimmed)
    setNoteOpen(false)
    setNoteDraft("")
  }

  function cancelNote() {
    setNoteOpen(false)
    setNoteDraft("")
  }

  return (
    <div
      className={cn(
        "rounded-md border bg-ivory px-2.5 py-2 transition-colors",
        isDone
          ? "border-gold/20 opacity-60"
          : "border-gold/40 hover:border-saffron/60",
      )}
    >
      <div className="flex items-start gap-2">
        {/* Checkbox — 24px hit area */}
        <ButtonBare
          type="button"
          onClick={handleCheckboxClick}
          aria-pressed={isDone}
          aria-label={isDone ? "Mark as not done" : "Mark as done"}
          className="shrink-0 h-6 w-6 flex items-center justify-center"
        >
          <span
            className={cn(
              "h-4 w-4 rounded-sm border-1.5 flex items-center justify-center transition-colors",
              isDone
                ? "bg-saffron border-saffron text-ivory"
                : "border-earth-mid/60 hover:border-saffron",
            )}
          >
            {isDone && (
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                aria-hidden
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="1.5,5 4,7.5 8.5,2.5" />
              </svg>
            )}
          </span>
        </ButtonBare>

        {/* Title (tap area for edit) */}
        <ButtonBare
          type="button"
          onClick={onEdit}
          className="flex-1 min-w-0 text-left"
          aria-label={`Edit ${task.title}`}
        >
          <p
            className={cn(
              "font-lyric text-[13px] leading-snug",
              isDone ? "line-through text-earth-mid" : "text-ink",
            )}
          >
            {task.title}
          </p>
          {task.completionNote && isDone && !noteOpen && (
            <p className="font-lyric-italic text-[11px] text-earth-mid mt-0.5 truncate">
              {task.completionNote}
            </p>
          )}
        </ButtonBare>
      </div>

      {/* Inline completion-note input — appears for ~one moment after the
          user marks the task done. Blur saves; Escape dismisses. */}
      {noteOpen && (
        <div className="mt-2 ml-8">
          <input
            ref={inputRef}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value.slice(0, 600))}
            onBlur={commitNote}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                commitNote()
              }
              if (e.key === "Escape") {
                e.preventDefault()
                cancelNote()
              }
            }}
            placeholder="what did you do? (optional)"
            className="w-full bg-ivory-deep border border-gold/40 rounded-md px-2.5 py-1.5 text-[12px] font-lyric-italic outline-none focus:border-ink/40"
          />
          <p className="font-pressure-caps text-[8px] text-earth-mid/70 mt-1 tracking-wider">
            Enter to save · Esc to skip
          </p>
        </div>
      )}
    </div>
  )
}
