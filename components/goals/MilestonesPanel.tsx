"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Button, ButtonBare } from "@/components/ui/button"
import { LabelTiny } from "@/components/gurukul/LabelTiny"
import { cn } from "@/lib/utils"
import {
  useCreateMilestone,
  useDeleteMilestone,
  useMilestones,
  useUpdateMilestone,
} from "@/hooks/useMilestones"
import { TaskMatrix } from "@/components/tasks/TaskMatrix"
import type { MilestoneWithTaskCount } from "@/types"

interface MilestonesPanelProps {
  goalId: string
}

/**
 * Quest-specific surface. Shows ordered milestones with task tallies; tap
 * one to expand its TaskMatrix inline. The first incomplete milestone is
 * highlighted as the "current" one. Mark complete on the row toggles
 * `completedAt`; the next milestone naturally becomes current on the
 * next render.
 */
export function MilestonesPanel({ goalId }: MilestonesPanelProps) {
  const { milestones, loading } = useMilestones(goalId)
  const create = useCreateMilestone()
  const update = useUpdateMilestone()
  const remove = useDeleteMilestone()

  const [addOpen, setAddOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // The current milestone — first one that isn't completed. Used to draw
  // attention to the next checkpoint, not to disable interaction with
  // others (users may want to work ahead).
  const currentId =
    milestones.find((m) => !m.completedAt)?.id ?? null

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <LabelTiny>Milestones</LabelTiny>
          <p className="font-lyric-italic text-[11px] text-earth-mid mt-0.5">
            Ordered checkpoints on the journey. Tap one to focus.
          </p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          + Add
        </Button>
      </div>

      {loading ? (
        <p className="font-lyric-italic text-earth-mid py-4 text-center text-sm">
          Loading…
        </p>
      ) : milestones.length === 0 ? (
        <div className="rounded-md border border-gold/30 bg-ivory-deep p-6 text-center space-y-2">
          <p className="font-lyric text-base text-ink">
            No milestones yet.
          </p>
          <p className="font-lyric-italic text-[12px] text-earth-mid">
            Break the quest into stages — first one, then the next, then
            the next.
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {milestones.map((m, i) => (
            <MilestoneRow
              key={m.id}
              milestone={m}
              ordinal={i + 1}
              isCurrent={m.id === currentId}
              isExpanded={expandedId === m.id}
              onToggleExpanded={() =>
                setExpandedId((cur) => (cur === m.id ? null : m.id))
              }
              onToggleComplete={() =>
                update.mutate({
                  id: m.id,
                  goalId,
                  patch: { completed: !m.completedAt },
                })
              }
              onDelete={() => remove.mutate({ id: m.id, goalId })}
              goalId={goalId}
            />
          ))}
        </ol>
      )}

      {addOpen && (
        <AddMilestoneModal
          onClose={() => setAddOpen(false)}
          onSubmit={async (input) => {
            await create.mutateAsync({ goalId, ...input })
          }}
          submitting={create.isPending}
        />
      )}
    </section>
  )
}

// ─── Milestone row ────────────────────────────────────────────────────────

function MilestoneRow({
  milestone,
  ordinal,
  isCurrent,
  isExpanded,
  onToggleExpanded,
  onToggleComplete,
  onDelete,
  goalId,
}: {
  milestone: MilestoneWithTaskCount
  ordinal: number
  isCurrent: boolean
  isExpanded: boolean
  onToggleExpanded: () => void
  onToggleComplete: () => void
  onDelete: () => void
  goalId: string
}) {
  const completed = !!milestone.completedAt

  return (
    <li
      className={cn(
        "rounded-md border bg-ivory-deep overflow-hidden transition-colors",
        completed
          ? "border-sage/40"
          : isCurrent
            ? "border-saffron/60 ring-1 ring-saffron/30"
            : "border-gold/30",
      )}
    >
      <div className="flex items-start gap-3 px-3 py-2.5">
        <ButtonBare
          type="button"
          onClick={onToggleComplete}
          aria-label={
            completed ? "Mark milestone incomplete" : "Mark milestone complete"
          }
          className={cn(
            "shrink-0 h-5 w-5 rounded-full border flex items-center justify-center mt-0.5 transition-colors",
            completed
              ? "bg-sage border-sage text-ivory"
              : "border-earth-mid/40 hover:border-saffron",
          )}
        >
          {completed ? (
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <span className="font-pressure-caps text-[9px] text-earth-mid">
              {ordinal}
            </span>
          )}
        </ButtonBare>

        <ButtonBare
          type="button"
          onClick={onToggleExpanded}
          className="flex-1 min-w-0 text-left space-y-0.5"
        >
          <p
            className={cn(
              "font-lyric text-[14px] leading-snug",
              completed ? "text-earth-mid line-through" : "text-ink",
            )}
          >
            {milestone.title}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {milestone.targetValue != null && (
              <span className="font-pressure-caps text-[9px] text-earth-mid tracking-wider">
                target {milestone.targetValue}
              </span>
            )}
            <span className="font-pressure-caps text-[9px] text-earth-mid tracking-wider">
              {milestone.taskCompletedCount}/{milestone.taskCount} tasks
            </span>
            {isCurrent && !completed && (
              <span className="font-pressure-caps text-[9px] text-saffron tracking-wider">
                · current
              </span>
            )}
          </div>
          {milestone.description && (
            <p className="font-lyric-italic text-[11px] text-earth-deep leading-snug mt-1">
              {milestone.description}
            </p>
          )}
        </ButtonBare>

        <ButtonBare
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (
              confirm(
                `Remove milestone "${milestone.title}"? Its tasks fall back to the goal level.`,
              )
            ) {
              onDelete()
            }
          }}
          className="shrink-0 font-pressure-caps text-[9px] text-earth-mid hover:text-saffron"
          aria-label="Delete milestone"
        >
          ×
        </ButtonBare>
      </div>

      {/* Inline expansion — TaskMatrix scoped to this milestone. */}
      {isExpanded && (
        <div className="border-t border-gold/20 bg-ivory/40 px-3 py-3">
          <TaskMatrix goalId={goalId} milestoneId={milestone.id} />
        </div>
      )}
    </li>
  )
}

// ─── Add milestone modal ──────────────────────────────────────────────────

function AddMilestoneModal({
  onClose,
  onSubmit,
  submitting,
}: {
  onClose: () => void
  onSubmit: (input: {
    title: string
    description: string | null
    targetValue: number | null
  }) => Promise<void>
  submitting: boolean
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [targetValue, setTargetValue] = useState<string>("")
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
      const parsed = targetValue.trim() ? Number(targetValue) : NaN
      await onSubmit({
        title: t,
        description: description.trim() || null,
        targetValue: Number.isFinite(parsed) ? parsed : null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save")
    }
  }

  if (typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-end sm:items-center justify-center sm:px-4 bg-ink/55 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Add milestone"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-gold/40 bg-ivory-deep p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 fade-in duration-200"
      >
        <div className="space-y-1">
          <h3 className="font-pressure-caps text-[11px] tracking-[2px] text-earth-deep">
            Add a milestone
          </h3>
          <p className="font-lyric-italic text-[11px] text-earth-mid">
            A checkpoint along the way. Binary ("draft complete") or
            quantitative ("$10k saved").
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="label-tiny block">Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 120))}
            placeholder="e.g. First $1,000 saved"
            className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[13px] font-sans outline-none focus:border-ink/40"
          />
        </div>

        <div className="space-y-1.5">
          <label className="label-tiny block">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 400))}
            rows={2}
            placeholder="A line of context for future you."
            className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[13px] font-sans outline-none focus:border-ink/40 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="label-tiny block">
            Target value (optional)
          </label>
          <input
            type="number"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder="e.g. 1000"
            className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[13px] font-sans outline-none focus:border-ink/40"
          />
        </div>

        {error && (
          <p className="text-[11px] text-saffron font-lyric-italic">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
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
            disabled={!title.trim() || submitting}
            className="text-[10px] font-pressure-caps tracking-wider bg-saffron text-ivory rounded-md px-3 py-1.5 disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add"}
          </ButtonBare>
        </div>
      </div>
    </div>,
    document.body,
  )
}
