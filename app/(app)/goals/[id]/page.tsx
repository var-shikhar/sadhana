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
  useDeleteGoalV2,
  useGoal,
  useGoalHistory,
  useGoalLogs,
  useSubGoals,
  useUpdateGoalV2,
} from "@/hooks/useGoals"
import { useCategories } from "@/hooks/useCategories"
import { TaskMatrix } from "@/components/tasks/TaskMatrix"
import { queryKeys } from "@/lib/query-keys"
import {
  GOAL_SHAPES,
  GOAL_SHAPE_LABEL,
  type GoalShape,
  type GoalStatus,
  type GoalWithProgress,
} from "@/types"
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

  const categoryTitle = useMemo(() => {
    const catId = goal?.categoryId
    if (!catId) return null
    return categories.find((c) => c.id === catId)?.title ?? null
  }, [goal, categories])

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
    await update.mutateAsync({
      goalId: id,
      patch: { status: next, reason: reason?.trim() || null },
      parentId: goal?.parentId ?? null,
    })
    setStatusModalOpen(null)
    setStatusReason("")
  }

  async function handleDelete() {
    if (!confirm("Archive this goal? You can restore it later via filters.")) return
    await remove.mutateAsync(id)
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

  return (
    <div className="space-y-6 py-2">
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
          <Badge tone="earth">{GOAL_SHAPE_LABEL[goal.shape]}</Badge>
          {categoryTitle && <Badge tone="sage">{categoryTitle}</Badge>}
          <Badge tone="muted">{goal.status}</Badge>
          {goal.deadlineDate && (
            <Badge tone="muted">by {goal.deadlineDate}</Badge>
          )}
        </div>

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

      {/* ── Quick-log + status actions ──────────────────────────── */}
      <section className="space-y-3">
        <LabelTiny className="block">Today</LabelTiny>
        <QuickLogStrip goal={goal} onLog={() => void quickLogToggle(goal)} />

        <div className="flex flex-wrap gap-1.5 pt-1">
          {goal.status === "active" ? (
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
                onClick={handleDelete}
                className="rounded-full border border-saffron/40 px-2.5 py-1 text-[10px] font-pressure-caps tracking-wider text-saffron hover:bg-ivory-deep"
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
        </div>
      </section>

      <GoldRule width="section" />

      {/* ── Sub-goals ──────────────────────────────────────────── */}
      {!goal.parentId && (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <LabelTiny>Sub-tasks</LabelTiny>
              <ButtonBare
                type="button"
                onClick={() => setAddSubOpen(true)}
                className="text-[10px] font-pressure-caps tracking-wider text-saffron hover:underline"
              >
                + Add sub-task
              </ButtonBare>
            </div>

            {subGoals.length === 0 ? (
              <p className="font-lyric-italic text-[12px] text-earth-mid">
                No sub-tasks yet. Break this goal into smaller pieces.
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

          <GoldRule width="section" />
        </>
      )}

      {/* ── Tasks (Eisenhower) ────────────────────────────────── */}
      <TaskMatrix goalId={goal.id} />

      {/* ── Add sub-task modal ─────────────────────────────────── */}
      {addSubOpen && (
        <GoalFormModal
          mode="add"
          parentId={goal.id}
          parentHorizon={goal.horizon}
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
}: {
  goal: GoalWithProgress
  onLog: () => void
}) {
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

  const [title, setTitle] = useState(goal.title)
  const [description, setDescription] = useState(goal.description ?? "")
  const [shape, setShape] = useState<GoalShape>(goal.shape)
  const [weeklyTarget, setWeeklyTarget] = useState(goal.weeklyTarget ?? 3)
  const [totalTarget, setTotalTarget] = useState(goal.totalTarget ?? 10)
  const [deadlineDate, setDeadlineDate] = useState(goal.deadlineDate ?? "")
  const [categoryId, setCategoryId] = useState<string | null>(goal.categoryId)
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
      await update.mutateAsync({
        goalId: goal.id,
        patch: {
          title: t,
          description: description.trim() || null,
          shape,
          weeklyTarget:
            shape === "weekly" || shape === "monthly" ? weeklyTarget : null,
          totalTarget: shape === "by_date" ? totalTarget : null,
          deadlineDate: shape === "by_date" ? deadlineDate || null : null,
          categoryId,
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
            {GOAL_SHAPES.map((s) => (
              <ButtonBare
                key={s}
                type="button"
                onClick={() => setShape(s)}
                className={cn(
                  "flex-1 min-w-[70px] rounded-full px-3 py-1.5 text-[10px] font-pressure-caps tracking-wider transition-all border",
                  shape === s
                    ? "bg-ink text-ivory border-ink"
                    : "bg-ivory text-earth-deep border-gold/30 hover:bg-ivory-deep",
                )}
              >
                {GOAL_SHAPE_LABEL[s]}
              </ButtonBare>
            ))}
          </div>
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
          <>
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
            <div className="space-y-1.5">
              <label className="label-tiny block">Deadline</label>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[13px] font-sans outline-none focus:border-ink/40"
              />
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <label className="label-tiny block">Category</label>
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
