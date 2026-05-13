"use client"

import { use, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button, ButtonBare } from "@/components/ui/button"
import { LabelTiny } from "@/components/gurukul/LabelTiny"
import { GoldRule } from "@/components/gurukul/GoldRule"
import { cn } from "@/lib/utils"
import {
  useAllGoals,
  useDeleteGoalV2,
  useGoal,
  useGoalHistory,
  useGoalLogs,
  useSubGoals,
  useUpdateGoalV2,
} from "@/hooks/useGoals"
import { useCategories } from "@/hooks/useCategories"
import { TaskMatrix } from "@/components/tasks/TaskMatrix"
import { MilestonesPanel } from "@/components/goals/MilestonesPanel"
import { queryKeys } from "@/lib/query-keys"
import {
  GOAL_SHAPES,
  GOAL_SHAPE_LABEL,
  type GoalShape,
  type GoalStatus,
  type GoalWithProgress,
} from "@/types"
import {
  allowedSubShapesFor,
  formatHumanDate,
  formatRelativeFromToday,
  lifecyclePhaseOf,
  QuestActivationConflictError,
  suggestedEndDate,
  todayYmd,
  type LifecyclePhase,
} from "@/lib/goals/lifecycle"
import { GoalFormModal } from "../page"

type Params = { id: string }

function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function GoalDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = use(params)
  const router = useRouter()
  const qc = useQueryClient()

  const { goal, loading } = useGoal(id)
  const { subGoals } = useSubGoals(id)
  const { logs } = useGoalLogs(id)
  const { entries: history } = useGoalHistory(id)
  const { categories } = useCategories()
  const update = useUpdateGoalV2()
  const remove = useDeleteGoalV2()

  const [editOpen, setEditOpen] = useState(false)
  const [addSubOpen, setAddSubOpen] = useState(false)
  const [statusModalOpen, setStatusModalOpen] = useState<GoalStatus | null>(
    null,
  )
  const [statusReason, setStatusReason] = useState("")
  const [logsOpen, setLogsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  // When set, we're showing the activation-cap conflict modal. `pendingStatus`
  // is what the user originally tried to apply (typically "active"); after
  // they pick a quest to pause, we'll retry that transition.
  const [activationConflict, setActivationConflict] = useState<{
    pendingStatus: GoalStatus
    pendingReason: string | null
    activeIds: string[]
  } | null>(null)
  // Sub-tabs:
  //   • Quests: Milestones (default) — the journey + tasks-inside-milestones
  //   • Disciplines: Tasks (default) — flat Eisenhower matrix
  //   • Either: Sub-goals (only if any exist — legacy transition surface)
  const [tab, setTab] = useState<"tasks" | "milestones" | "subgoals">(
    "tasks", // overridden below after goal loads
  )

  const categoryTitle = useMemo(() => {
    const catId = goal?.categoryId
    if (!catId) return null
    return categories.find((c) => c.id === catId)?.title ?? null
  }, [goal, categories])

  // Quests default to the Milestones tab; disciplines default to Tasks.
  // Only set on initial load — don't snap back if the user navigates away
  // intentionally.
  const isQuest = goal?.goalType === "quest"
  useEffect(() => {
    if (!goal) return
    setTab(isQuest ? "milestones" : "tasks")
    // intentionally only react to goal id / type
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.id, isQuest])

  // Today log toggle for daily goals.
  async function quickLogToggle(g: GoalWithProgress) {
    const today = formatYmd(new Date())
    if (g.shape === "daily") {
      const url = `/api/goals/${g.id}/log${
        g.progress.todayDone ? `?date=${today}` : ""
      }`
      const method = g.progress.todayDone ? "DELETE" : "POST"
      await fetch(url, {
        method,
        headers: method === "POST" ? { "Content-Type": "application/json" } : {},
        body: method === "POST" ? JSON.stringify({ value: 1 }) : undefined,
      })
    } else {
      // For weekly/monthly/by_date — just +1 to today.
      await fetch(`/api/goals/${g.id}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: 1 }),
      })
    }
    qc.invalidateQueries({ queryKey: queryKeys.goal(g.id) })
    qc.invalidateQueries({ queryKey: queryKeys.goal(id) })
    qc.invalidateQueries({ queryKey: queryKeys.subGoals(id) })
    qc.invalidateQueries({ queryKey: [...queryKeys.goal(g.id), "logs"] })
    qc.invalidateQueries({ queryKey: queryKeys.todayGoals() })
  }

  async function changeStatus(next: GoalStatus, reason: string | null) {
    try {
      await update.mutateAsync({
        goalId: id,
        patch: { status: next, reason: reason?.trim() || null },
        parentId: goal?.parentId ?? null,
      })
      setStatusModalOpen(null)
      setStatusReason("")
    } catch (err) {
      if (err instanceof QuestActivationConflictError) {
        // The user tried to activate a quest while at their cap. Surface
        // the "pause one to activate" modal; the retry happens after the
        // user picks a quest to pause (see the modal's onPause handler).
        setActivationConflict({
          pendingStatus: next,
          pendingReason: reason?.trim() || null,
          activeIds: err.currentActiveQuestIds,
        })
        return
      }
      throw err
    }
  }

  async function handleArchiveConfirmed() {
    await remove.mutateAsync(id)
    setArchiveOpen(false)
    router.push("/goals")
  }

  if (loading) {
    return (
      <p className="font-lyric-italic text-earth-mid py-6 text-center">
        Loading…
      </p>
    )
  }
  if (!goal) {
    return (
      <div className="space-y-4 py-6 text-center">
        <p className="font-lyric-italic text-earth-mid">Goal not found.</p>
        <Link
          href="/goals"
          className="font-pressure-caps text-[10px] text-earth-mid hover:text-earth-deep"
        >
          ← back to goals
        </Link>
      </div>
    )
  }

  const phase = lifecyclePhaseOf(goal)

  return (
    <div className="space-y-6 py-2 pb-28">
      {/* ── Back link ───────────────────────────────────────────── */}
      <Link
        href="/goals"
        className="block font-pressure-caps text-[10px] text-earth-mid hover:text-earth-deep"
      >
        ← all goals
      </Link>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="space-y-2">
        <div className="flex items-start gap-3">
          <h1
            className={cn(
              "font-lyric text-2xl text-ink flex-1",
              goal.status !== "active" && "text-earth-mid line-through",
            )}
          >
            {goal.title}
          </h1>
          <ButtonBare
            type="button"
            onClick={() => setEditOpen(true)}
            className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-earth-deep px-3 py-1.5 shrink-0"
          >
            Edit
          </ButtonBare>
        </div>
        {goal.description && (
          <p className="font-lyric-italic text-[13px] text-earth-deep">
            {goal.description}
          </p>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          <LifecycleBadge phase={phase} />
          <Badge tone={isQuest ? "saffron" : "earth"}>
            {isQuest ? "Quest" : "Discipline"}
          </Badge>
          <Badge tone="earth">{GOAL_SHAPE_LABEL[goal.shape]}</Badge>
          {categoryTitle && <Badge tone="sage">{categoryTitle}</Badge>}
          {goal.endDate && (
            <Badge tone="muted">ends {goal.endDate}</Badge>
          )}
        </div>

        {/* Lifecycle hint — readable line spelling out start/end. */}
        <p className="font-lyric-italic text-[11px] text-earth-mid">
          {phase === "scheduled"
            ? `Starts ${formatRelativeFromToday(goal.startDate)} · ${formatHumanDate(goal.startDate)}`
            : phase === "overdue"
              ? `Window ended ${goal.endDate ? formatRelativeFromToday(goal.endDate) : ""}`
              : phase === "due_soon" && goal.endDate
                ? `Ends ${formatRelativeFromToday(goal.endDate)} · ${formatHumanDate(goal.endDate)}`
                : `Started ${formatHumanDate(goal.startDate)}${goal.endDate ? ` · ends ${formatHumanDate(goal.endDate)}` : ""}`}
        </p>

        {/* Inline meta toggles — expand logs / history right here. */}
        {(logs.length > 0 || history.length > 0) && (
          <div className="flex items-center gap-3 flex-wrap pt-1">
            {logs.length > 0 && (
              <ButtonBare
                type="button"
                onClick={() => setLogsOpen((o) => !o)}
                className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-earth-deep transition-colors"
                aria-expanded={logsOpen}
              >
                {logsOpen ? "Hide logs" : `View logs (${logs.length})`}
              </ButtonBare>
            )}
            {history.length > 0 && (
              <ButtonBare
                type="button"
                onClick={() => setHistoryOpen((o) => !o)}
                className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-earth-deep transition-colors"
                aria-expanded={historyOpen}
              >
                {historyOpen ? "Hide history" : `View history (${history.length})`}
              </ButtonBare>
            )}
          </div>
        )}

        {logsOpen && logs.length > 0 && (
          <ul className="space-y-1.5 mt-1">
            {logs.slice(0, 30).map((l) => (
              <li
                key={l.id}
                className="rounded border border-gold/20 bg-ivory-deep px-3 py-2"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-pressure-caps text-[10px] text-earth-mid tracking-wider">
                    {l.date}
                  </span>
                  <span className="font-lyric text-[13px] text-ink">
                    +{l.value}
                  </span>
                </div>
                {l.note && (
                  <p className="font-lyric-italic text-[12px] text-earth-deep mt-1">
                    {l.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {historyOpen && history.length > 0 && (
          <ul className="space-y-1.5 mt-1">
            {history.map((h) => (
              <li
                key={h.id}
                className="rounded border border-gold/20 bg-ivory-deep px-3 py-2"
              >
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-pressure-caps text-[10px] text-saffron tracking-wider">
                    {h.changeType}
                  </span>
                  <span className="font-pressure-caps text-[9px] text-earth-mid">
                    {new Date(h.createdAt).toLocaleString()}
                  </span>
                </div>
                {(h.fromValue || h.toValue) && (
                  <p className="font-sans text-[12px] text-earth-deep mt-0.5">
                    {h.fromValue ? `${h.fromValue} → ` : ""}
                    {h.toValue ?? "—"}
                  </p>
                )}
                {h.reason && (
                  <p className="font-lyric-italic text-[12px] text-earth-deep mt-1">
                    {h.reason}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </header>

      <GoldRule width="section" />

      {/* ── Status actions (lifecycle controls) ─────────────────── */}
      <section className="flex flex-wrap gap-1.5">
        {goal.status === "active" || goal.status === "scheduled" ? (
          <>
            <ButtonBare
              type="button"
              onClick={() => setStatusModalOpen("paused")}
              className="rounded-full border border-gold/40 px-2.5 py-1 text-[10px] font-pressure-caps tracking-wider text-earth-deep hover:bg-ivory-deep"
            >
              Pause
            </ButtonBare>
            <ButtonBare
              type="button"
              onClick={() => void changeStatus("completed", null)}
              className="rounded-full border border-sage/50 px-2.5 py-1 text-[10px] font-pressure-caps tracking-wider text-sage hover:bg-ivory-deep"
            >
              Complete
            </ButtonBare>
            <ButtonBare
              type="button"
              onClick={() => setArchiveOpen(true)}
              className="rounded-full border border-saffron/40 px-2.5 py-1 text-[10px] font-pressure-caps tracking-wider text-saffron hover:bg-ivory-deep ml-auto"
            >
              Archive
            </ButtonBare>
          </>
        ) : goal.status === "paused" ? (
          <ButtonBare
            type="button"
            onClick={() => void changeStatus("active", null)}
            className="rounded-full border border-saffron/40 px-2.5 py-1 text-[10px] font-pressure-caps tracking-wider text-saffron hover:bg-ivory-deep"
          >
            Resume
          </ButtonBare>
        ) : null}
      </section>

      {/* ── Tabs ───────────────────────────────────────────────────
          Top-level goals only — sub-goals have no tabs. Tab set varies by
          goal type: quests get Milestones + Tasks (flat tasks across all
          milestones); disciplines get just Tasks. Sub-goals stays as a
          transitional surface ONLY if existing sub-goal data is present. */}
      {!goal.parentId ? (
        <div
          className="inline-flex w-full rounded-full border border-gold/40 bg-ivory p-0.5"
          role="tablist"
          aria-label="Goal sections"
        >
          {(isQuest
            ? (["milestones", "tasks"] as const)
            : (["tasks"] as const)
          ).map((t) => {
            const active = tab === t
            const label =
              t === "milestones"
                ? "Milestones"
                : "Tasks"
            return (
              <ButtonBare
                key={t}
                type="button"
                onClick={() => setTab(t)}
                role="tab"
                aria-selected={active}
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5 text-[10px] font-pressure-caps tracking-wider transition-colors",
                  active
                    ? "bg-ink text-ivory"
                    : "text-earth-deep hover:bg-ivory-deep",
                )}
              >
                {label}
              </ButtonBare>
            )
          })}
          {subGoals.length > 0 && (
            <ButtonBare
              key="subgoals"
              type="button"
              onClick={() => setTab("subgoals")}
              role="tab"
              aria-selected={tab === "subgoals"}
              className={cn(
                "flex-1 rounded-full px-3 py-1.5 text-[10px] font-pressure-caps tracking-wider transition-colors",
                tab === "subgoals"
                  ? "bg-ink text-ivory"
                  : "text-earth-deep hover:bg-ivory-deep",
              )}
            >
              Sub-goals · {subGoals.length}
            </ButtonBare>
          )}
        </div>
      ) : null}

      {/* ── Tab body ─────────────────────────────────────────────── */}
      {!goal.parentId && tab === "subgoals" ? (
        <section className="space-y-3">
          <div className="flex items-center justify-end">
            <ButtonBare
              type="button"
              onClick={() => setAddSubOpen(true)}
              className="text-[10px] font-pressure-caps tracking-wider text-saffron hover:underline"
            >
              + Add sub-goal
            </ButtonBare>
          </div>

          {subGoals.length === 0 ? (
            <p className="font-lyric-italic text-[12px] text-earth-mid py-6 text-center">
              No sub-goals yet. Break this goal into smaller pieces.
            </p>
          ) : (
            <ul className="rounded-md border border-gold/30 bg-ivory-deep divide-y divide-gold/20 overflow-hidden">
              {subGoals.map((s) => (
                <li
                  key={s.id}
                  className="hover:bg-ivory transition-colors"
                >
                  <Link
                    href={`/goals/${s.id}`}
                    className="block px-3 py-2.5 space-y-1"
                  >
                    <p
                      className={cn(
                        "font-lyric text-[14px]",
                        s.status === "active"
                          ? "text-ink"
                          : "text-earth-mid line-through",
                      )}
                    >
                      {s.title}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge tone="earth">{GOAL_SHAPE_LABEL[s.shape]}</Badge>
                      {s.status !== "active" && (
                        <Badge tone="muted">{s.status}</Badge>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : !goal.parentId && tab === "milestones" && isQuest ? (
        <MilestonesPanel goalId={goal.id} />
      ) : (
        // Default: Tasks. For disciplines this is the only view; for quests
        // it's the flat list across all milestones.
        <TaskMatrix goalId={goal.id} />
      )}

      {/* ── Sticky daily quick-log bar ──────────────────────────────
          Only meaningful for active or scheduled goals. Sits above the
          global BottomNav (~64px) and respects iOS safe area. */}
      {(goal.status === "active" || goal.status === "scheduled") && (
        <div
          className="fixed left-0 right-0 z-40 border-t border-gold/30 bg-ivory/95 backdrop-blur supports-backdrop-filter:bg-ivory/80"
          style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto max-w-lg px-3 py-2">
            <QuickLogStrip
              goal={goal}
              onLog={() => void quickLogToggle(goal)}
              disabled={phase === "scheduled"}
              disabledReason={
                phase === "scheduled"
                  ? `Starts ${formatRelativeFromToday(goal.startDate)}`
                  : undefined
              }
            />
          </div>
        </div>
      )}

      {/* ── Add sub-task modal ─────────────────────────────────── */}
      {addSubOpen && (
        <GoalFormModal
          mode="add"
          parentId={goal.id}
          parentHorizon={goal.horizon}
          parentShape={goal.shape}
          parentStartDate={goal.startDate}
          parentEndDate={goal.endDate}
          defaultCategoryId={goal.categoryId}
          onClose={() => setAddSubOpen(false)}
        />
      )}

      {/* ── Edit goal modal ────────────────────────────────────── */}
      {editOpen && (
        <EditGoalModal
          goal={goal}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* ── Activation-cap conflict modal ──
          Shown when the user tries to activate a quest while already at
          their max-active-quests cap. Lists the current active quests and
          lets them pause one — after which we retry the original action. */}
      {activationConflict && (
        <ActivationConflictModal
          conflict={activationConflict}
          onClose={() => setActivationConflict(null)}
          onPauseAndRetry={async (idToPause) => {
            // Pause the chosen quest first, then retry the pending status
            // change. We don't surface the inner conflict (there shouldn't
            // be one after pausing) — if it happens, the user sees the
            // modal again.
            await update.mutateAsync({
              goalId: idToPause,
              patch: { status: "paused" },
            })
            const pending = activationConflict
            setActivationConflict(null)
            if (pending) {
              await update.mutateAsync({
                goalId: id,
                patch: {
                  status: pending.pendingStatus,
                  reason: pending.pendingReason,
                },
                parentId: goal?.parentId ?? null,
              })
              setStatusModalOpen(null)
              setStatusReason("")
            }
          }}
        />
      )}

      {/* ── Archive confirm modal (replaces native confirm()) ───── */}
      {archiveOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-100 flex items-end sm:items-center justify-center sm:px-4 bg-ink/55 backdrop-blur-sm animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-label="Archive goal"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-saffron/40 bg-ivory-deep p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 fade-in duration-200"
            >
              <div className="space-y-1">
                <h3 className="font-pressure-caps text-[11px] tracking-[2px] text-saffron">
                  Archive this goal?
                </h3>
                <p className="font-lyric-italic text-[12px] text-earth-deep">
                  &ldquo;{goal.title}&rdquo; will be hidden from active lists. Its
                  history, logs, and sub-goals are preserved.
                </p>
                <p className="font-lyric-italic text-[11px] text-earth-mid pt-1">
                  You can restore it later by switching the Status filter on
                  the Goals page to <span className="font-pressure-caps tracking-wider">All</span>.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <ButtonBare
                  type="button"
                  onClick={() => setArchiveOpen(false)}
                  disabled={remove.isPending}
                  className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-earth-deep px-3 py-1.5"
                >
                  Cancel
                </ButtonBare>
                <ButtonBare
                  type="button"
                  onClick={() => void handleArchiveConfirmed()}
                  disabled={remove.isPending}
                  className="text-[10px] font-pressure-caps tracking-wider bg-saffron text-ivory rounded-md px-3 py-1.5 disabled:opacity-50"
                >
                  {remove.isPending ? "Archiving…" : "Archive"}
                </ButtonBare>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* ── Status-change reason modal ─────────────────────────── */}
      {statusModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-100 flex items-end sm:items-center justify-center sm:px-4 bg-ink/55 backdrop-blur-sm animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-label="Status change reason"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-gold/40 bg-ivory-deep p-5 space-y-4 shadow-2xl"
            >
              <div className="space-y-1">
                <h3 className="font-pressure-caps text-[11px] tracking-[2px] text-earth-deep">
                  {statusModalOpen === "paused"
                    ? "Why pausing?"
                    : "Reason (optional)"}
                </h3>
                <p className="font-lyric-italic text-[11px] text-earth-mid">
                  Saved with the lifecycle entry.
                </p>
              </div>

              <textarea
                autoFocus
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value.slice(0, 240))}
                rows={3}
                placeholder="Travelling for two weeks, etc."
                className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[13px] font-lyric-italic outline-none focus:border-ink/40 resize-none"
              />

              <div className="flex justify-end gap-2 pt-1">
                <ButtonBare
                  type="button"
                  onClick={() => setStatusModalOpen(null)}
                  className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-earth-deep px-3 py-1.5"
                >
                  Cancel
                </ButtonBare>
                <ButtonBare
                  type="button"
                  onClick={() => void changeStatus(statusModalOpen, statusReason)}
                  disabled={update.isPending}
                  className="text-[10px] font-pressure-caps tracking-wider bg-ink text-ivory rounded-md px-3 py-1.5 disabled:opacity-50"
                >
                  {update.isPending ? "Saving…" : "Save"}
                </ButtonBare>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

// ─── Quick-log strip (today) ──────────────────────────────────────────────

function QuickLogStrip({
  goal,
  onLog,
  disabled = false,
  disabledReason,
}: {
  goal: GoalWithProgress
  onLog: () => void
  disabled?: boolean
  disabledReason?: string
}) {
  if (disabled) {
    return (
      <Button disabled className="w-full" variant="outline">
        {disabledReason ?? "Not yet active"}
      </Button>
    )
  }
  if (goal.shape === "daily") {
    const done = goal.progress.todayDone
    return (
      <Button onClick={onLog} className="w-full" variant={done ? "outline" : "default"}>
        {done
          ? `Today's done · ${goal.progress.streak ?? 0}d streak`
          : "Mark today done"}
      </Button>
    )
  }
  if (goal.shape === "weekly" || goal.shape === "monthly") {
    const t = goal.progress.weekTotal ?? 0
    const target = goal.weeklyTarget ?? 1
    return (
      <Button onClick={onLog} className="w-full">
        + Log one ({t}/{target} this {goal.shape === "weekly" ? "week" : "month"})
      </Button>
    )
  }
  // by_date
  const t = goal.progress.totalSoFar ?? 0
  const target = goal.totalTarget ?? 0
  return (
    <Button onClick={onLog} className="w-full">
      + Log one ({t}/{target})
    </Button>
  )
}

// ─── Lifecycle badge ──────────────────────────────────────────────────────

const LIFECYCLE_TONE: Record<LifecyclePhase, { cls: string; label: string }> = {
  in_flight:  { cls: "border-sage/50 text-sage",       label: "In flight" },
  scheduled:  { cls: "border-gold/50 text-earth-deep", label: "Scheduled" },
  due_soon:   { cls: "border-saffron/60 text-saffron", label: "Due soon" },
  overdue:    { cls: "border-saffron text-saffron bg-saffron/10", label: "Overdue" },
  paused:     { cls: "border-earth-mid/40 text-earth-mid", label: "Paused" },
  completed:  { cls: "border-sage/40 text-sage",       label: "Completed" },
  abandoned:  { cls: "border-earth-mid/30 text-earth-mid/70", label: "Archived" },
}

function LifecycleBadge({ phase }: { phase: LifecyclePhase }) {
  const t = LIFECYCLE_TONE[phase]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-pressure-caps tracking-wider text-[9px]",
        t.cls,
      )}
    >
      {t.label}
    </span>
  )
}

// ─── Edit goal modal ──────────────────────────────────────────────────────

function EditGoalModal({
  goal,
  onClose,
}: {
  goal: GoalWithProgress
  onClose: () => void
}) {
  const update = useUpdateGoalV2()
  const { categories } = useCategories()
  // Parent's lifecycle window (sub-goals only) — fetched lazily so we can
  // clamp the end date and constrain the cadence picker the same way the
  // create modal does.
  const { goal: parentGoal } = useGoal(goal.parentId ?? "")

  const today = todayYmd()
  const isSubGoal = !!goal.parentId
  const parentShape = parentGoal?.shape
  const parentEndDate = parentGoal?.endDate ?? null
  const parentStartDate = parentGoal?.startDate

  const allowedShapes = isSubGoal && parentShape
    ? allowedSubShapesFor(parentShape)
    : GOAL_SHAPES

  const [title, setTitle] = useState(goal.title)
  const [description, setDescription] = useState(goal.description ?? "")
  const [shape, setShape] = useState<GoalShape>(goal.shape)
  const [weeklyTarget, setWeeklyTarget] = useState(goal.weeklyTarget ?? 3)
  const [totalTarget, setTotalTarget] = useState(goal.totalTarget ?? 10)
  const [startDate, setStartDate] = useState(goal.startDate ?? today)
  const [endDate, setEndDate] = useState(goal.endDate ?? "")
  const [categoryId, setCategoryId] = useState<string | null>(goal.categoryId)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const derivedEndDate = endDate || (
    shape === "by_date" ? null : suggestedEndDate(shape, startDate)
  )

  async function commit() {
    const t = title.trim()
    if (!t) return
    setError(null)
    if (endDate && endDate < startDate) {
      setError("End date can't be before start date.")
      return
    }
    if (isSubGoal && parentEndDate && endDate && endDate > parentEndDate) {
      setError(`Sub-goal must end by ${formatHumanDate(parentEndDate)} (parent's end).`)
      return
    }
    if (isSubGoal && parentStartDate && startDate < parentStartDate) {
      setError(`Sub-goal can't start before ${formatHumanDate(parentStartDate)} (parent's start).`)
      return
    }
    try {
      await update.mutateAsync({
        goalId: goal.id,
        patch: {
          title: t,
          description: description.trim() || null,
          shape,
          weeklyTarget:
            shape === "weekly" || shape === "monthly" ? weeklyTarget : null,
          totalTarget: shape === "by_date" ? totalTarget : null,
          // endDate now applies to all cadences. Empty string → null
          // (open-ended) for recurring; required at submit-time for by_date.
          endDate: endDate || null,
          startDate,
          // Sub-goals inherit category — don't update it from this form.
          ...(isSubGoal ? {} : { categoryId }),
        },
        parentId: goal.parentId,
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
      aria-label="Edit goal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-gold/40 bg-ivory-deep p-5 space-y-4 shadow-2xl max-h-[88vh] overflow-y-auto"
      >
        <h3 className="font-pressure-caps text-[11px] tracking-[2px] text-earth-deep">
          Edit goal
        </h3>

        <div className="space-y-1.5">
          <label className="label-tiny block">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[13px] font-sans outline-none focus:border-ink/40"
          />
        </div>

        <div className="space-y-1.5">
          <label className="label-tiny block">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 240))}
            rows={2}
            className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[13px] font-sans outline-none focus:border-ink/40 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="label-tiny block">Cadence</label>
          <div className="flex gap-1.5 flex-wrap">
            {GOAL_SHAPES.map((s) => {
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
                    shape === s
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

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="label-tiny block">Start date</label>
            <input
              type="date"
              value={startDate}
              min={isSubGoal ? parentStartDate : undefined}
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
              max={isSubGoal && parentEndDate ? parentEndDate : undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[13px] font-sans outline-none focus:border-ink/40"
            />
          </div>
        </div>

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

        {!isSubGoal && (
          <div className="space-y-1.5">
            <label className="label-tiny block">Goal Category</label>
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
            className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-earth-deep px-3 py-1.5"
          >
            Cancel
          </ButtonBare>
          <ButtonBare
            type="button"
            onClick={() => void commit()}
            disabled={update.isPending || !title.trim()}
            className="text-[10px] font-pressure-caps tracking-wider bg-ink text-ivory rounded-md px-3 py-1.5 disabled:opacity-50"
          >
            {update.isPending ? "Saving…" : "Save"}
          </ButtonBare>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── Activation conflict modal ────────────────────────────────────────────

function ActivationConflictModal({
  conflict,
  onClose,
  onPauseAndRetry,
}: {
  conflict: {
    pendingStatus: GoalStatus
    pendingReason: string | null
    activeIds: string[]
  }
  onClose: () => void
  onPauseAndRetry: (idToPause: string) => Promise<void>
}) {
  // Pull the currently-active quests so we can show titles, not just IDs.
  // We fetch by status=active and then filter to the conflict's ID list —
  // this is slightly wasteful but reuses the existing query cache.
  const { goals: activeGoals } = useAllGoals({ status: "active" })
  const candidates = useMemo(
    () =>
      activeGoals.filter(
        (g) => g.goalType === "quest" && conflict.activeIds.includes(g.id),
      ),
    [activeGoals, conflict.activeIds],
  )

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const [pausingId, setPausingId] = useState<string | null>(null)

  if (typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-end sm:items-center justify-center sm:px-4 bg-ink/55 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Pick a quest to pause"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-saffron/40 bg-ivory-deep p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 fade-in duration-200 max-h-[88vh] overflow-y-auto"
      >
        <div className="space-y-1">
          <h3 className="font-pressure-caps text-[11px] tracking-[2px] text-saffron">
            Already running another quest
          </h3>
          <p className="font-lyric-italic text-[12px] text-earth-deep">
            One quest at a time keeps the focus single-pointed. To activate
            this one, pick a current quest to pause — its progress is
            preserved.
          </p>
          <p className="font-lyric-italic text-[11px] text-earth-mid pt-1">
            Want more quests running at once? Change the limit in{" "}
            <Link
              href="/settings/profile"
              className="font-pressure-caps tracking-wider text-saffron hover:underline"
            >
              Settings → Practice
            </Link>
            .
          </p>
        </div>

        {candidates.length === 0 ? (
          <p className="font-lyric-italic text-[12px] text-earth-mid text-center py-4">
            Loading active quests…
          </p>
        ) : (
          <ul className="space-y-1.5">
            {candidates.map((c) => (
              <li key={c.id}>
                <ButtonBare
                  type="button"
                  onClick={async () => {
                    setPausingId(c.id)
                    try {
                      await onPauseAndRetry(c.id)
                    } finally {
                      setPausingId(null)
                    }
                  }}
                  disabled={pausingId !== null}
                  className={cn(
                    "w-full rounded-md border border-gold/40 bg-ivory hover:bg-ivory-deep px-3 py-2.5 text-left transition-colors flex items-center justify-between gap-3",
                    pausingId === c.id && "opacity-60",
                  )}
                >
                  <span className="font-lyric text-[14px] text-ink min-w-0 truncate">
                    {c.title}
                  </span>
                  <span className="font-pressure-caps text-[9px] text-saffron tracking-wider shrink-0">
                    {pausingId === c.id ? "Pausing…" : "Pause → activate this"}
                  </span>
                </ButtonBare>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end pt-1">
          <ButtonBare
            type="button"
            onClick={onClose}
            disabled={pausingId !== null}
            className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-earth-deep px-3 py-1.5"
          >
            Cancel
          </ButtonBare>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── Badge (shared) ───────────────────────────────────────────────────────

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
