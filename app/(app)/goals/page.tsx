"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { Plus, SlidersHorizontal, X } from "lucide-react"
import { ButtonBare } from "@/components/ui/button"
import { LabelTiny } from "@/components/gurukul/LabelTiny"
import { GoldRule } from "@/components/gurukul/GoldRule"
import { Loader } from "@/components/gurukul/Loader"
import { cn } from "@/lib/utils"
import {
  useAllGoals,
  useCreateGoalV2,
  useSubGoals,
} from "@/hooks/useGoals"
import { useCategories } from "@/hooks/useCategories"
import {
  GOAL_SHAPES,
  GOAL_SHAPE_LABEL,
  GOAL_STATUS_LABEL,
  GOAL_TYPE_DESCRIPTION,
  GOAL_TYPE_LABEL,
  SHAPES_FOR_GOAL_TYPE,
  type GoalHorizon,
  type GoalShape,
  type GoalStatus,
  type GoalType,
  type GoalWithProgress,
} from "@/types"
import {
  allowedSubShapesFor,
  formatHumanDate,
  formatRelativeFromToday,
  suggestedEndDate,
  todayYmd,
} from "@/lib/goals/lifecycle"
import { useUIStore } from "@/lib/stores/ui"

type CadenceFilter = "all" | GoalShape
type StatusFilter = "all" | GoalStatus
type CategoryFilter = "all" | "none" | string
type TypeFilter = "all" | GoalType

/** Hard cap on simultaneously-active goals at the UI add-step. Aligns with
 *  the agenda's "Focus, not capacity" tenet — once the user is running this
 *  many goals, the add affordance disappears until one is paused/completed.
 *  Distinct from `maxActiveQuests` (which is a per-user setting that gates
 *  only quest activation server-side); this is a UI guardrail that applies
 *  to every goal type. */
const MAX_ACTIVE_GOALS = 2

export default function GoalsPage() {
  const [cadenceFilter, setCadenceFilter] = useState<CadenceFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active")
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  // Sub-task visibility persists across sessions via the UI store (localStorage).
  // Eventually this will live in the user's Practice settings; for now it's a
  // per-device preference.
  const showSubGoals = useUIStore((s) => s.goalsShowSubGoals)
  const setShowSubGoals = useUIStore((s) => s.setGoalsShowSubGoals)

  const { goals: allGoals, loading } = useAllGoals({
    shape: cadenceFilter === "all" ? undefined : cadenceFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    category: categoryFilter,
  })
  // Independent count of active goals — used to gate the "+ Add a goal"
  // button. Driven off its own filter set so the cap doesn't drift when the
  // user is browsing paused / completed views.
  const { goals: activeGoalsForCount } = useAllGoals({ status: "active" })
  const activeGoalCount = activeGoalsForCount.length
  const canAddGoal = activeGoalCount < MAX_ACTIVE_GOALS
  const { categories } = useCategories()

  // Type filter applied client-side. The server filter set doesn't include
  // goalType yet; the data volume is small enough that filtering here is
  // fine, and it sidesteps an API change.
  const goals = useMemo(
    () =>
      typeFilter === "all"
        ? allGoals
        : allGoals.filter((g) => g.goalType === typeFilter),
    [allGoals, typeFilter],
  )

  const [addOpen, setAddOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Chips for the in-page strip + the "Filters (n)" badge count. Status
  // defaults to "active" (not "all"), so we only treat it as narrowed when
  // the user picks something else.
  const activeChips: Array<{ key: string; label: string; clear: () => void }> = []
  if (typeFilter !== "all") {
    activeChips.push({
      key: "type",
      label: typeFilter === "quest" ? "Quests" : "Disciplines",
      clear: () => setTypeFilter("all"),
    })
  }
  if (cadenceFilter !== "all") {
    activeChips.push({
      key: "cadence",
      label: GOAL_SHAPE_LABEL[cadenceFilter],
      clear: () => setCadenceFilter("all"),
    })
  }
  if (statusFilter !== "active") {
    activeChips.push({
      key: "status",
      label: statusFilter === "all" ? "Any status" : GOAL_STATUS_LABEL[statusFilter],
      clear: () => setStatusFilter("active"),
    })
  }
  if (categoryFilter !== "all") {
    const label =
      categoryFilter === "none"
        ? "Uncategorized"
        : categories.find((c) => c.id === categoryFilter)?.title ?? "Category"
    activeChips.push({
      key: "category",
      label,
      clear: () => setCategoryFilter("all"),
    })
  }

  return (
    <div className="space-y-5 py-2">
      <header className="text-center space-y-1.5 relative">
        <LabelTiny>Sankalpa · the things you set</LabelTiny>
        <h1 className="font-lyric text-3xl text-ink">Your goals.</h1>
      </header>

      <GoldRule width="section" />

      {/* Compact action bar. Was: full-width Add button + 4 filter pill
          rows below it. Now: small "Filters (n)" pill on the left, small
          saffron "+ Add" pill on the right. Filters open in a bottom-sheet
          so the list — the page's actual subject — is the first thing
          visible. */}
      <div className="flex items-center gap-2">
        <ButtonBare
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-ivory px-3 py-1.5 font-pressure-caps text-[10px] tracking-wider text-earth-deep hover:bg-ivory-deep transition-colors"
          aria-label="Filter goals"
        >
          <SlidersHorizontal className="h-3 w-3" />
          Filters
          {activeChips.length > 0 && (
            <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[9px] text-ivory tabular-nums">
              {activeChips.length}
            </span>
          )}
        </ButtonBare>

        <div className="flex-1" />

        {/* Add affordance hides once the user has reached MAX_ACTIVE_GOALS.
            Forces a pause / complete before another can be added — agenda
            tenet 3.1 ("Focus, not capacity"). */}
        {canAddGoal && (
          <ButtonBare
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1 rounded-full bg-saffron px-3.5 py-1.5 font-pressure-caps text-[10px] tracking-wider text-ivory hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3 w-3" strokeWidth={2.5} />
            Add a goal
          </ButtonBare>
        )}
      </div>

      {/* When the cap is reached, replace the add affordance with a quiet
          hint so the absence is explained rather than mysterious. */}
      {!canAddGoal && (
        <p className="font-lyric-italic text-[11px] text-earth-mid text-center -mt-2">
          You&apos;re running {activeGoalCount} active goals. Pause or
          complete one before taking on another.
        </p>
      )}

      {/* Active-filter chips — appear only when something's narrowed,
          so the default view stays clean. Tapping × clears that one. */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.clear}
              className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-ivory-deep px-2 py-0.5 font-pressure-caps text-[9px] tracking-wider text-earth-deep hover:bg-ivory transition-colors"
              aria-label={`Clear filter: ${c.label}`}
            >
              {c.label}
              <X className="h-2.5 w-2.5" />
            </button>
          ))}
          {activeChips.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setTypeFilter("all")
                setCadenceFilter("all")
                setStatusFilter("active")
                setCategoryFilter("all")
              }}
              className="font-pressure-caps text-[9px] tracking-wider text-earth-mid hover:text-earth-deep transition-colors px-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* ── List ────────────────────────────────────────────────────── */}
      <div className="pt-1">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader size="md" caption="gathering goals…" />
          </div>
        ) : goals.length === 0 ? (
          <div className="rounded-md border border-gold/30 bg-ivory-deep p-6 text-center">
            <p className="font-lyric-italic text-sm text-earth-mid">
              No goals here. Adjust filters, or add a new goal.
            </p>
          </div>
        ) : (
          <ul className="rounded-md border border-gold/30 bg-ivory-deep divide-y divide-gold/20 overflow-hidden">
            {goals.map((g) => (
              <GoalRow
                key={g.id}
                goal={g}
                categoryTitle={
                  g.categoryId
                    ? categories.find((c) => c.id === g.categoryId)?.title ??
                      null
                    : null
                }
                showSubGoals={showSubGoals}
              />
            ))}
          </ul>
        )}
      </div>

      {filtersOpen && (
        <FiltersModal
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          cadenceFilter={cadenceFilter}
          setCadenceFilter={setCadenceFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          showSubGoals={showSubGoals}
          setShowSubGoals={setShowSubGoals}
          categories={categories}
          onClose={() => setFiltersOpen(false)}
        />
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

// ─── Filters bottom-sheet modal ──────────────────────────────────────────

function FiltersModal({
  typeFilter,
  setTypeFilter,
  cadenceFilter,
  setCadenceFilter,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  showSubGoals,
  setShowSubGoals,
  categories,
  onClose,
}: {
  typeFilter: TypeFilter
  setTypeFilter: (v: TypeFilter) => void
  cadenceFilter: CadenceFilter
  setCadenceFilter: (v: CadenceFilter) => void
  statusFilter: StatusFilter
  setStatusFilter: (v: StatusFilter) => void
  categoryFilter: CategoryFilter
  setCategoryFilter: (v: CategoryFilter) => void
  showSubGoals: boolean
  setShowSubGoals: (v: boolean) => void
  categories: Array<{ id: string; title: string }>
  onClose: () => void
}) {
  // Lock body scroll while open — same pattern the form modal uses.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  if (typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-end sm:items-center justify-center sm:px-4 bg-ink/55 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Filter goals"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-gold/40 bg-ivory-deep p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 fade-in duration-200 max-h-[88vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-pressure-caps text-[11px] tracking-[2px] text-earth-deep">
            Filter goals
          </h3>
          <ButtonBare
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="h-7 w-7 rounded-full border border-gold/40 text-earth-mid hover:text-earth-deep hover:bg-ivory flex items-center justify-center transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </ButtonBare>
        </div>

        <div className="space-y-3">
          <FilterPillRow
            label="Type"
            options={[
              { value: "all", label: "All" },
              { value: "quest", label: "Quests" },
              { value: "discipline", label: "Disciplines" },
            ]}
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as TypeFilter)}
          />
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
              label="Category"
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

        {/* View options — distinct from filters because they shape the
            rendering of each row, not which rows show up. Right now there's
            just the sub-task toggle; more view options can grow here. */}
        <div className="border-t border-gold/20 pt-3 space-y-2">
          <p className="font-pressure-caps text-[9px] tracking-wider text-earth-mid">
            View
          </p>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="font-lyric text-[13px] text-earth-deep">
              Show sub-tasks
              <span className="block font-lyric-italic text-[11px] text-earth-mid">
                Reveal the tasks living inside each goal.
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={showSubGoals}
              onClick={() => setShowSubGoals(!showSubGoals)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                showSubGoals ? "bg-saffron" : "bg-earth-mid/30",
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-ivory shadow transition-transform",
                  showSubGoals ? "translate-x-4" : "translate-x-0.5",
                )}
              />
            </button>
          </label>
        </div>

        <div className="flex justify-between pt-1">
          <ButtonBare
            type="button"
            onClick={() => {
              setTypeFilter("all")
              setCadenceFilter("all")
              setStatusFilter("active")
              setCategoryFilter("all")
            }}
            className="font-pressure-caps text-[10px] tracking-wider text-earth-mid hover:text-earth-deep px-2 py-1"
          >
            Reset
          </ButtonBare>
          <ButtonBare
            type="button"
            onClick={onClose}
            className="font-pressure-caps text-[10px] tracking-wider bg-ink text-ivory rounded-md px-4 py-1.5"
          >
            Done
          </ButtonBare>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── Goal row ─────────────────────────────────────────────────────────────

function GoalRow({
  goal,
  categoryTitle,
  showSubGoals,
}: {
  goal: GoalWithProgress
  categoryTitle: string | null
  showSubGoals: boolean
}) {
  return (
    <li>
      {/* Hover lives on the Link, not the <li>. Otherwise the parent
          highlights whenever the user is hovering over a sub-task in the
          inlined block below — which makes the sub-task's own hover state
          invisible because the bg already matches. */}
      <Link
        href={`/goals/${goal.id}`}
        className="block px-3 py-3 hover:bg-ivory transition-colors"
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
            <Badge tone={goal.goalType === "quest" ? "saffron" : "earth"}>
              {goal.goalType === "quest" ? "Quest" : "Discipline"}
            </Badge>
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
      {showSubGoals && <SubGoalsInline parentId={goal.id} />}
    </li>
  )
}

/** Indented inline list of sub-tasks under a parent goal. Only fetches when
 *  actually rendered — the parent gates this behind a toggle. Hides itself
 *  entirely when the parent has no sub-goals so empty parents don't get a
 *  decorative gap. */
function SubGoalsInline({ parentId }: { parentId: string }) {
  const { subGoals, loading } = useSubGoals(parentId)
  if (loading) return null
  if (subGoals.length === 0) return null
  return (
    <ul className="ml-3 mb-2 border-l border-gold/30 pl-3 space-y-0.5">
      {subGoals.map((sg) => (
        <li key={sg.id}>
          {/* Sub-row hover needs a tint distinct from BOTH the container
              (the parent <ul> is bg-ivory-deep) AND the parent row's
              hover state (bg-ivory). A soft saffron wash + matching left
              border picks up the warm thread already used elsewhere in
              the app and reads clearly against the deep-ivory surround. */}
          <Link
            href={`/goals/${sg.id}`}
            className="group/sub flex items-center gap-2 py-1.5 px-2 rounded-sm border-l-2 border-transparent hover:bg-saffron/10 hover:border-saffron transition-colors"
          >
            <span
              className={cn(
                "font-lyric text-[13px] flex-1 truncate transition-colors",
                sg.status === "active"
                  ? "text-earth-deep group-hover/sub:text-ink"
                  : "text-earth-mid line-through",
              )}
            >
              ↳ {sg.title}
            </span>
            <span className="font-pressure-caps text-[9px] tracking-wider text-earth-mid shrink-0">
              {GOAL_SHAPE_LABEL[sg.shape]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
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
  /** Pre-select a goal type. Used by callers (e.g. Plan tab "+ Add discipline"). */
  defaultGoalType?: GoalType
  defaultCategoryId?: string | null
  onClose: () => void
}

export function GoalFormModal({
  parentId,
  parentHorizon,
  parentShape,
  parentStartDate,
  parentEndDate,
  defaultGoalType,
  defaultCategoryId,
  onClose,
}: GoalFormModalProps) {
  const create = useCreateGoalV2()
  const { categories } = useCategories()

  const today = todayYmd()
  const isSubGoal = !!parentId

  // Goal type drives every other field. Default to 'discipline' (the
  // recurring practice mode) unless the caller pre-selects something or
  // we're inside a sub-goal flow (sub-goals are tasks-of-quests now, so
  // their type matches the parent — we read it from parentShape).
  const [goalType, setGoalType] = useState<GoalType>(
    defaultGoalType ??
      (isSubGoal && parentShape === "by_date" ? "quest" : "discipline"),
  )

  // Cadences allowed for this type. For sub-goals, additionally clamp by
  // the parent's shape (parent must outlast child).
  const allowedShapes = (() => {
    const byType = SHAPES_FOR_GOAL_TYPE[goalType]
    if (!isSubGoal || !parentShape) return byType
    const byParent = allowedSubShapesFor(parentShape)
    return byType.filter((s) => byParent.includes(s))
  })()

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

  // Switching goal type can leave `shape` outside the new allowed set
  // (quest only allows by_date; discipline excludes by_date). Snap it
  // back to a valid value when the type flips.
  useEffect(() => {
    if (!allowedShapes.includes(shape)) {
      setShape(allowedShapes[0] ?? "daily")
    }
  }, [goalType, shape, allowedShapes])

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
        goalType,
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

        {/* Goal type — the first decision. Drives cadence options and
            milestone vs no-milestone layout. Hidden inside sub-goal flow
            (sub-goals inherit type implicitly from the parent context). */}
        {!isSubGoal && (
          <div className="space-y-1.5">
            <label className="label-tiny block">Goal type</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["discipline", "quest"] as const).map((t) => {
                const active = goalType === t
                return (
                  <ButtonBare
                    key={t}
                    type="button"
                    onClick={() => setGoalType(t)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-left transition-colors",
                      active
                        ? "bg-ink text-ivory border-ink"
                        : "bg-ivory text-earth-deep border-gold/40 hover:bg-ivory-deep",
                    )}
                  >
                    <p className="font-pressure-caps text-[10px] tracking-wider">
                      {GOAL_TYPE_LABEL[t]}
                    </p>
                    <p
                      className={cn(
                        "font-lyric-italic text-[10px] mt-0.5 leading-snug",
                        active ? "text-ivory/80" : "text-earth-mid",
                      )}
                    >
                      {GOAL_TYPE_DESCRIPTION[t]}
                    </p>
                  </ButtonBare>
                )
              })}
            </div>
          </div>
        )}

        {/* Title */}
        <div className="space-y-1.5">
          <label className="label-tiny block">Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            placeholder={
              goalType === "quest"
                ? "e.g. Reach $10k in savings"
                : "e.g. Read 30 minutes"
            }
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

        {/* Cadence — gated by goal type (and by parent's shape for sub-goals).
            Quests always end up on by_date; disciplines pick a recurrence. */}
        <div className="space-y-1.5">
          <label className="label-tiny block">Cadence</label>
          <div className="flex gap-1.5 flex-wrap">
            {GOAL_SHAPES.map((s) => {
              const isActive = shape === s
              const isAllowed = allowedShapes.includes(s)
              if (!isAllowed && goalType === "quest" && s !== "by_date") {
                // Hide non-applicable shapes for quests rather than greying
                // them out — there's no useful "you can't pick weekly for
                // a quest" affordance.
                return null
              }
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
