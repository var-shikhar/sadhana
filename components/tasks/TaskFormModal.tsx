"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { ButtonBare } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Task } from "@/types"

interface BaseProps {
  onClose: () => void
  onSubmit: (input: {
    title: string
    description: string | null
    important: boolean
    urgent: boolean
  }) => Promise<void>
  /** When provided in edit mode, allows removing the task. */
  onDelete?: () => Promise<void>
  submitting?: boolean
}

interface AddProps extends BaseProps {
  mode: "add"
  initial?: undefined
}

interface EditProps extends BaseProps {
  mode: "edit"
  initial: Task
}

type Props = AddProps | EditProps

/**
 * Add or edit a task. Two toggles for the Eisenhower flags, with friendly
 * captions so the user doesn't need to memorize the matrix.
 */
export function TaskFormModal({
  mode,
  initial,
  onClose,
  onSubmit,
  onDelete,
  submitting,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [important, setImportant] = useState(initial?.important ?? false)
  const [urgent, setUrgent] = useState(initial?.urgent ?? false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  async function commit() {
    const t = title.trim()
    if (!t) return
    setError(null)
    try {
      await onSubmit({
        title: t,
        description: description.trim() || null,
        important,
        urgent,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save")
    }
  }

  if (typeof document === "undefined") return null

  return createPortal(
    <div
      onClick={() => {
        if (!submitting) onClose()
      }}
      className="fixed inset-0 z-100 flex items-end sm:items-center justify-center sm:px-4 bg-ink/55 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "add" ? "Add a task" : "Edit task"}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-gold/40 bg-ivory-deep p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 fade-in duration-200 max-h-[88vh] overflow-y-auto"
      >
        <div className="space-y-1">
          <h3 className="font-pressure-caps text-[11px] tracking-[2px] text-earth-deep">
            {mode === "add" ? "Add a task" : "Edit task"}
          </h3>
          <p className="font-lyric-italic text-[11px] text-earth-mid">
            One concrete thing to do. Mark it Important if it really matters,
            Urgent if it&apos;s time-sensitive.
          </p>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label htmlFor="task-title" className="label-tiny block">
            Title
          </label>
          <input
            id="task-title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 120))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                void commit()
              }
              if (e.key === "Escape") onClose()
            }}
            placeholder="e.g. Email the editor"
            className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[13px] font-sans outline-none focus:border-ink/40"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label htmlFor="task-desc" className="label-tiny block">
            Description (optional)
          </label>
          <textarea
            id="task-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 600))}
            rows={2}
            placeholder="Any context that helps you act on it later."
            className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[13px] font-sans outline-none focus:border-ink/40 resize-none"
          />
        </div>

        {/* Important toggle */}
        <FlagToggle
          label="Important"
          caption="matters to this goal"
          value={important}
          onChange={setImportant}
        />

        {/* Urgent toggle */}
        <FlagToggle
          label="Urgent"
          caption="time-sensitive"
          value={urgent}
          onChange={setUrgent}
        />

        {error && (
          <p className="text-[11px] text-saffron font-lyric-italic">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          {mode === "edit" && onDelete ? (
            <ButtonBare
              type="button"
              onClick={async () => {
                if (!confirm(`Remove "${initial.title}"?`)) return
                try {
                  await onDelete()
                  onClose()
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not remove")
                }
              }}
              disabled={submitting}
              className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-saffron transition-colors"
            >
              Remove
            </ButtonBare>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <ButtonBare
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-earth-deep px-3 py-1.5"
            >
              Cancel
            </ButtonBare>
            <ButtonBare
              type="button"
              onClick={() => void commit()}
              disabled={submitting || !title.trim()}
              className="text-[10px] font-pressure-caps tracking-wider bg-saffron text-ivory rounded-md px-3 py-1.5 disabled:opacity-50"
            >
              {submitting ? "Saving…" : mode === "add" ? "Add" : "Save"}
            </ButtonBare>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function FlagToggle({
  label,
  caption,
  value,
  onChange,
}: {
  label: string
  caption: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <ButtonBare
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="w-full flex items-center gap-3 rounded-md border border-gold/40 bg-ivory px-3 py-2 hover:bg-ivory-deep transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <p className="font-lyric text-[14px] text-ink">{label}</p>
        <p className="font-lyric-italic text-[11px] text-earth-mid">
          {caption}
        </p>
      </div>
      <span
        aria-hidden
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors shrink-0",
          value ? "bg-saffron" : "bg-earth-mid/30",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-ivory shadow transition-all",
            value ? "left-4.5" : "left-0.5",
          )}
        />
      </span>
    </ButtonBare>
  )
}
