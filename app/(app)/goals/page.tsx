"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { Button, ButtonBare } from "@/components/ui/button"
import { LabelTiny } from "@/components/gurukul/LabelTiny"
import { GoldRule } from "@/components/gurukul/GoldRule"
import { cn } from "@/lib/utils"
import {
  useAllGoals,
  useCreateGoalV2,
} from "@/hooks/useGoals"
import { useCategories } from "@/hooks/useCategories"
import {
  GOAL_SHAPES,
  GOAL_SHAPE_LABEL,
  GOAL_STATUS_LABEL,
  type GoalHorizon,
  type GoalShape,
  type GoalStatus,
  type GoalWithProgress,
} from "@/types"
import {
  allowedSubShapesFor,
  formatHumanDate,
  formatRelativeFromToday,
  suggestedEndDate,
  todayYmd,
} from "@/lib/goals/lifecycle"

type CadenceFilter = "all" | GoalShape
type StatusFilter = "all" | GoalStatus
type CategoryFilter = "all" | "none" | string

export default function GoalsPage() {
  const [cadenceFilter, setCadenceFilter] = useState<CadenceFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active")
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")

  const { goals, loading } = useAllGoals({
    shape: cadenceFilter === "all" ? undefined : cadenceFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    category: categoryFilter,
  })
  const { categories } = useCategories()

  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="space-y-6 py-2">
      <header className="text-center space-y-2 relative">
        <LabelTiny>Sankalpa · the things you set</LabelTiny>
        <h1 className="font-lyric text-3xl text-ink">Your goals.</h1>
        <p className="font-lyric-italic text-sm text-earth-deep max-w-md mx-auto">
          Each one carries a cadence. Sub-tasks live inside.
        </p>
      </header>

      <GoldRule width="section" />

      <Button
        type="button"
        onClick={() => setAddOpen(true)}
        className="w-full"
      >
        + Add a goal
      </Button>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <FilterPillRow
          label="Cadence"
          options={[
            { value: "all", label: "All" },
            ...GOAL_SHAPES.map((s) => ({
              value: s,
              label: GOAL_SHAPE_LABEL[s],
            })),
          ]}
          value={cadenceFilter}
          onChange={(v) => setCadenceFilter(v as CadenceFilter)}
        />
        <FilterPillRow
          label="Status"
          options={[
            { value: "active", label: "Active" },
            { value: "scheduled", label: "Scheduled" },
            { value: "paused", label: "Paused" },
            { value: "completed", label: "Completed" },
            { value: "all", label: "All" },
          ]}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
        />
        {categories.length > 0 && (
          <FilterPillRow
            label="Goal Category"
            options={[
              { value: "all", label: "All" },
              { value: "none", label: "Uncategorized" },
              ...categories.map((c) => ({ value: c.id, label: c.title })),
            ]}
            value={categoryFilter}
            onChange={(v) => setCategoryFilter(v)}
          />
        )}
      </div>

      <GoldRule width="section" />

      {/* ── List ────────────────────────────────────────────────────── */}
      {loading ? (
        <p className="font-lyric-italic text-earth-mid py-6 text-center">
          Loading…
        </p>
      ) : goals.length === 0 ? (
        <div className="rounded-md border border-gold/30 bg-ivory-deep p-6 text-center">
          <p className="font-lyric-italic text-sm text-earth-mid">
            No goals here. Adjust filters, or add a new goal.
          </p>
        </div>
      ) : (
        <ul className="rounded-md border border-gold/30 bg-ivory-deep divide-y divide-gold/20 overflow-hidden">
          {goals.map((g) => (
            <GoalRow key={g.id} goal={g} categoryTitle={
              g.categoryId
                ? categories.find((c) => c.id === g.categoryId)?.title ?? null
                : null
            } />
          ))}
        </ul>
      )}

      {addOpen && (
        <GoalFormModal
          mode="add"
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  )
}

// ─── Goal row ─────────────────────────────────────────────────────────────

function GoalRow({
  goal,
  categoryTitle,
}: {
  goal: GoalWithProgress
  categoryTitle: string | null
}) {
  return (
    <li className="hover:bg-ivory transition-colors">
      <Link
        href={`/goals/${goal.id}`}
        className="block px-3 py-3"
        aria-label={`Open ${goal.title}`}
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "font-lyric text-[15px] flex-1 truncate",
                goal.status === "active"
                  ? "text-ink"
                  : "text-earth-mid line-through",
              )}
            >
              {goal.title}
            </p>
            <ProgressDot goal={goal} />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
            <Badge tone="earth">{GOAL_SHAPE_LABEL[goal.shape]}</Badge>
            {categoryTitle && <Badge tone="sage">{categoryTitle}</Badge>}
            {goal.status !== "active" && (
              <Badge tone={goal.status === "scheduled" ? "saffron" : "muted"}>
                {GOAL_STATUS_LABEL[goal.status]}
              </Badge>
            )}
          </div>
        </div>
      </Link>
    </li>
  )
}

function ProgressDot({ goal }: { goal: GoalWithProgress }) {
  // Compact progress hint for daily/weekly/monthly/by_date
  if (goal.shape === "daily") {
    const dotCls = goal.progress.todayDone
      ? "bg-saffron"
      : "bg-earth-mid/30"
    return (
      <span className="flex items-center gap-1 text-[10px] text-earth-mid font-pressure-caps tracking-wider shrink-0">
        <span className={cn("h-2 w-2 rounded-full", dotCls)} />
        {goal.progress.streak ? `${goal.progress.streak}d` : ""}
      </span>
    )
  }
  if (goal.shape === "weekly" || goal.shape === "monthly") {
    const total = goal.progress.weekTotal ?? 0
    const target = goal.weeklyTarget ?? 1
    return (
      <span className="text-[10px] text-earth-mid font-pressure-caps tracking-wider shrink-0 tabular-nums">
        {total}/{target}
      </span>
    )
  }
  // by_date
  const total = goal.progress.totalSoFar ?? 0
  const target = goal.totalTarget ?? 0
  return (
    <span className="text-[10px] text-earth-mid font-pressure-caps tracking-wider shrink-0 tabular-nums">
      {total}/{target}
    </span>
  )
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: "saffron" | "earth" | "sage" | "muted"
}) {
  const cls =
    tone === "saffron"
      ? "border-saffron/50 text-saffron"
      : tone === "earth"
        ? "border-earth-mid/50 text-earth-deep"
        : tone === "sage"
          ? "border-sage/50 text-sage"
          : "border-earth-mid/30 text-earth-mid"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-pressure-caps tracking-wider text-[9px]",
        cls,
      )}
    >
      {children}
    </span>
  )
}

// ─── Filter pill row ──────────────────────────────────────────────────────

function FilterPillRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-pressure-caps text-[9px] text-earth-mid w-24 shrink-0 tracking-wider">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
        {options.map((opt) => {
          const isActive = value === opt.value
          return (
            <ButtonBare
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[10px] font-pressure-caps tracking-wider transition-all",
                isActive
                  ? "bg-ink text-ivory border-ink"
                  : "bg-ivory text-earth-deep border-gold/40 hover:bg-ivory-deep",
              )}
            >
              {opt.label}
            </ButtonBare>
          )
        })}
      </div>
    </div>
  )
}

// ─── Add/Edit goal modal ──────────────────────────────────────────────────

interface GoalFormModalProps {
  mode: "add"
  /** When set, modal pre-fills as a sub-goal of this parent. */
  parentId?: string | null
  /** Parent's horizon — kept for server-side validation only. */
  parentHorizon?: GoalHorizon
  /** Parent's cadence — limits the sub-goal's allowed cadences. */
  parentShape?: GoalShape
  /** Parent's start date — sub-goal can't start earlier. */
  parentStartDate?: string
  /** Parent's end date — sub-goal can't end later. null = unbounded parent. */
  parentEndDate?: string | null
  defaultCategoryId?: string | null
  onClose: () => void
}

export function GoalFormModal({
  parentId,
  parentHorizon,
  parentShape,
  parentStartDate,
  parentEndDate,
  defaultCategoryId,
  onClose,
}: GoalFormModalProps) {
  const create = useCreateGoalV2()
  const { categories } = useCategories()

  const today = todayYmd()
  const isSubGoal = !!parentId

  // Cadences a sub-goal may take, given the parent's cadence. Top-level
  // goals can be any cadence. Default the form's shape to the first
  // allowed value so we never start in an invalid state.
  const allowedShapes = isSubGoal && parentShape
    ? allowedSubShapesFor(parentShape)
    : GOAL_SHAPES

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [shape, setShape] = useState<GoalShape>(allowedShapes[0] ?? "daily")
  const [weeklyTarget, setWeeklyTarget] = useState(3)
  const [totalTarget, setTotalTarget] = useState(10)
  // Lifecycle window. startDate defaults to today; endDate is optional for
  // recurring cadences and required for by_date.
  const [startDate, setStartDate] = useState(parentStartDate ?? today)
  const [endDate, setEndDate] = useState("")
  const [categoryId, setCategoryId] = useState<string | null>(
    defaultCategoryId ?? null,
  )
  const [error, setError] = useState<string | null>(null)

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Live preview of the resulting end date — even when the user hasn't
  // typed one explicitly. For by_date the user must pick endDate themself;
  // for recurring cadences we suggest a sensible default window.
  const derivedEndDate = endDate || (
    shape === "by_date" ? null : suggestedEndDate(shape, startDate)
  )

  // Effective max end clamp from parent. Sub-goal can't outlast its parent.
  const maxEndDate = isSubGoal ? parentEndDate ?? null : null
  // Effective min start clamp from parent.
  const minStartDate = isSubGoal && parentStartDate ? parentStartDate : undefined

  async function commit() {
    const t = title.trim()
    if (!t) return
    setError(null)

    // Client-side guards. The server re-checks; this is for fast feedback.
    if (endDate && endDate < startDate) {
      setError("End date can't be before start date.")
      return
    }
    if (maxEndDate && endDate && endDate > maxEndDate) {
      setError(`Sub-goal must end by ${formatHumanDate(maxEndDate)} (parent's end).`)
      return
    }
    if (minStartDate && startDate < minStartDate) {
      setError(`Sub-goal can't start before ${formatHumanDate(minStartDate)} (parent's start).`)
      return
    }

    try {
      await create.mutateAsync({
        title: t,
        description: description.trim() || null,
        // Horizon hidden from UI — inherit parent's for sub-goals,
        // default medium_term otherwise.
        horizon: parentHorizon ?? "medium_term",
        shape,
        weeklyTarget:
          shape === "weekly" || shape === "monthly" ? weeklyTarget : null,
        totalTarget: shape === "by_date" ? totalTarget : null,
        // endDate now applies to ALL cadences, not just by_date. For by_date
        // it's required by the form's submit guard; for recurring it's
        // optional — null means open-ended.
        endDate: endDate || null,
        startDate,
        // Sub-goals inherit category from parent — the field isn't shown.
        categoryId: isSubGoal ? defaultCategoryId ?? null : categoryId,
        parentId: parentId ?? null,
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
      aria-label={parentId ? "Add a sub-task" : "Add a goal"}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-gold/40 bg-ivory-deep p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 fade-in duration-200 max-h-[88vh] overflow-y-auto"
      >
        <div className="space-y-1">
          <h3 className="font-pressure-caps text-[11px] tracking-[2px] text-earth-deep">
            {parentId ? "Add a sub-task" : "Add a goal"}
          </h3>
          <p className="font-lyric-italic text-[11px] text-earth-mid">
            {parentId
              ? "Lives under the parent. Pick a cadence and target."
              : "Pick a cadence and (optionally) tag it with a category."}
          </p>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="label-tiny block">Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            placeholder="e.g. Read 30 minutes"
            className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[13px] font-sans outline-none focus:border-ink/40"
          />
        </div>

        {/* Description (optional) */}
        <div className="space-y-1.5">
          <label className="label-tiny block">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 240))}
            rows={2}
            placeholder="A line or two of context for future you."
            className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[13px] font-sans outline-none focus:border-ink/40 resize-none"
          />
        </div>

        {/* Cadence — sub-goals are constrained to the parent's window. */}
        <div className="space-y-1.5">
          <label className="label-tiny block">Cadence</label>
          <div className="flex gap-1.5 flex-wrap">
            {GOAL_SHAPES.map((s) => {
              const isActive = shape === s
              const isAllowed = allowedShapes.includes(s)
              return (
                <ButtonBare
                  key={s}
                  type="button"
                  onClick={() => isAllowed && setShape(s)}
                  disabled={!isAllowed}
                  title={
                    !isAllowed
                      ? `Parent is ${GOAL_SHAPE_LABEL[parentShape ?? "daily"]} — sub-goals can't outlast it.`
                      : undefined
                  }
                  className={cn(
                    "flex-1 min-w-[70px] rounded-full px-3 py-1.5 text-[10px] font-pressure-caps tracking-wider transition-all border",
                    isActive
                      ? "bg-ink text-ivory border-ink"
                      : "bg-ivory text-earth-deep border-gold/30 hover:bg-ivory-deep",
                    !isAllowed && "opacity-30 cursor-not-allowed hover:bg-ivory",
                  )}
                >
                  {GOAL_SHAPE_LABEL[s]}
                </ButtonBare>
              )
            })}
          </div>
          {isSubGoal && parentShape && allowedShapes.length < GOAL_SHAPES.length && (
            <p className="font-lyric-italic text-[10px] text-earth-mid">
              Sub-goal can&apos;t outlast its {GOAL_SHAPE_LABEL[parentShape].toLowerCase()} parent.
            </p>
          )}
        </div>

        {/* Cadence-specific target */}
        {(shape === "weekly" || shape === "monthly") && (
          <div className="space-y-1.5">
            <label className="label-tiny block">
              Target ({shape === "weekly" ? "per week" : "per month"})
            </label>
            <input
              type="number"
              min={1}
              value={weeklyTarget}
              onChange={(e) =>
                setWeeklyTarget(Math.max(1, Number(e.target.value) || 1))
              }
              className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[13px] font-sans outline-none focus:border-ink/40"
            />
          </div>
        )}

        {shape === "by_date" && (
          <div className="space-y-1.5">
            <label className="label-tiny block">Total target</label>
            <input
              type="number"
              min={1}
              value={totalTarget}
              onChange={(e) =>
                setTotalTarget(Math.max(1, Number(e.target.value) || 1))
              }
              className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[13px] font-sans outline-none focus:border-ink/40"
            />
          </div>
        )}

        {/* Lifecycle window — start + end. Applies to all cadences. */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="label-tiny block">Start date</label>
            <input
              type="date"
              value={startDate}
              min={minStartDate}
              onChange={(e) => setStartDate(e.target.value || today)}
              className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[13px] font-sans outline-none focus:border-ink/40"
            />
          </div>
          <div className="space-y-1.5">
            <label className="label-tiny block">
              End date {shape !== "by_date" && <span className="text-earth-mid/60">(optional)</span>}
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={maxEndDate ?? undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[13px] font-sans outline-none focus:border-ink/40"
            />
          </div>
        </div>

        {/* Live derived window — shows the date even when end is auto. */}
        {(startDate || derivedEndDate) && (
          <p className="font-lyric-italic text-[11px] text-earth-deep -mt-1">
            {startDate > today
              ? `Scheduled — starts ${formatRelativeFromToday(startDate)} (${formatHumanDate(startDate)})`
              : `Starts ${formatHumanDate(startDate)}`}
            {derivedEndDate && (
              <>
                {" · "}
                <span className={endDate ? "text-earth-deep" : "text-earth-mid"}>
                  {endDate ? "Ends" : "Suggested end:"} {formatHumanDate(derivedEndDate)}
                </span>
              </>
            )}
          </p>
        )}

        {/* Category — top-level goals only. Sub-goals inherit. */}
        {!isSubGoal && (
          <div className="space-y-1.5">
            <label className="label-tiny block">Goal Category (optional)</label>
            <select
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value || null)}
              className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[13px] font-sans outline-none focus:border-ink/40 cursor-pointer"
            >
              <option value="">— No category —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <p className="text-[11px] text-saffron font-lyric-italic">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <ButtonBare
            type="button"
            onClick={onClose}
            disabled={create.isPending}
            className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-earth-deep px-3 py-1.5"
          >
            Cancel
          </ButtonBare>
          <ButtonBare
            type="button"
            onClick={() => void commit()}
            disabled={create.isPending || !title.trim()}
            className="text-[10px] font-pressure-caps tracking-wider bg-saffron text-ivory rounded-md px-3 py-1.5 disabled:opacity-50"
          >
            {create.isPending ? "Adding…" : "Add"}
          </ButtonBare>
        </div>
      </div>
    </div>,
    document.body,
  )
}
