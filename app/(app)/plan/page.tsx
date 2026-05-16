"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button, ButtonBare } from "@/components/ui/button"
import { LabelTiny } from "@/components/gurukul/LabelTiny"
import { GoldRule } from "@/components/gurukul/GoldRule"
import { HabitDot } from "@/components/gurukul/HabitDot"
import { Loader } from "@/components/gurukul/Loader"
import { OmGlyph } from "@/components/gurukul/OmGlyph"
import { cn } from "@/lib/utils"
import { useAllGoals } from "@/hooks/useGoals"
import { useAffirmations } from "@/hooks/useAffirmations"
import { useMilestones } from "@/hooks/useMilestones"
import { queryKeys } from "@/lib/query-keys"
import {
  formatHumanDate,
  formatRelativeFromToday,
  isInFlight,
  lifecyclePhaseOf,
  todayYmd,
  type LifecyclePhase,
} from "@/lib/goals/lifecycle"
import { GOAL_SHAPE_LABEL, type GoalWithProgress } from "@/types"

/**
 * Plan — the daily commitment surface. Shows the goals that are *in flight
 * today* (active, started, not yet ended) grouped by lifecycle phase. The
 * user logs progress here; whatever they log IS what was planned for the
 * day (auto-derived, no separate "pick today's plan" step).
 *
 * Affirmation entry lives at the top — the morning trigger for the recital
 * practice.
 */
export default function PlanPage() {
  const today = todayYmd()
  const qc = useQueryClient()

  // Pull all active and scheduled goals — we need scheduled too, so the
  // user sees what's coming up next, even if they can't log it yet.
  const { goals: activeGoals, loading: activeLoading } = useAllGoals({
    status: "active",
  })
  const { goals: scheduledGoals, loading: schedLoading } = useAllGoals({
    status: "scheduled",
  })
  const { affirmations, loading: affirmationsLoading } = useAffirmations()

  const loading = activeLoading || schedLoading || affirmationsLoading

  // The active quest gets center stage (there's usually one, sometimes
  // two/three depending on maxActiveQuests). Disciplines are bucketed
  // separately so the user reads them as parallel practices, not as
  // peers of the quest.
  const {
    activeQuests,
    overdueDisciplines,
    dueSoonDisciplines,
    inFlightDisciplines,
    upcomingQuests,
    upcomingDisciplines,
  } = useMemo(() => {
    const activeQuests: GoalWithProgress[] = []
    const overdueDisciplines: GoalWithProgress[] = []
    const dueSoonDisciplines: GoalWithProgress[] = []
    const inFlightDisciplines: GoalWithProgress[] = []
    const upcomingQuests: GoalWithProgress[] = []
    const upcomingDisciplines: GoalWithProgress[] = []

    for (const g of activeGoals) {
      if (g.goalType === "quest") {
        // Only show in-flight quests in the active spotlight. An "active"
        // quest whose end has passed shows as overdue at the top of the
        // quest section rather than buried in disciplines.
        activeQuests.push(g)
        continue
      }
      // Disciplines: split by phase.
      const phase = lifecyclePhaseOf(g, today)
      if (!isInFlight(g, today) && g.endDate && g.endDate < today) {
        overdueDisciplines.push(g)
      } else if (phase === "due_soon") dueSoonDisciplines.push(g)
      else if (phase === "in_flight") inFlightDisciplines.push(g)
    }

    for (const g of scheduledGoals) {
      if (g.goalType === "quest") upcomingQuests.push(g)
      else upcomingDisciplines.push(g)
    }

    return {
      activeQuests,
      overdueDisciplines,
      dueSoonDisciplines,
      inFlightDisciplines,
      upcomingQuests,
      upcomingDisciplines,
    }
  }, [activeGoals, scheduledGoals, today])

  const totalDisciplines =
    inFlightDisciplines.length +
    dueSoonDisciplines.length +
    overdueDisciplines.length
  const totalPlannable = activeQuests.length + totalDisciplines
  const completedToday = [
    ...activeQuests,
    ...inFlightDisciplines,
    ...dueSoonDisciplines,
    ...overdueDisciplines,
  ].filter((g) => g.progress.isMet).length

  const hasActiveAffirmation = affirmations.some((a) => a.isActive)
  const activeAffirmationCount = affirmations.filter((a) => a.isActive).length

  const router = useRouter()
  const [recitalModalOpen, setRecitalModalOpen] = useState(false)

  useEffect(() => {
    if (!recitalModalOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [recitalModalOpen])

  function openRecitalModal() {
    setRecitalModalOpen(true)
  }

  function closeRecitalModal() {
    setRecitalModalOpen(false)
  }

  function beginRecital() {
    setRecitalModalOpen(false)
    router.push("/settings/affirmations/practice")
  }

  async function logProgress(goalId: string, done: boolean, value = 1) {
    const url = done
      ? `/api/goals/${goalId}/log`
      : `/api/goals/${goalId}/log?date=${today}`
    await fetch(url, {
      method: done ? "POST" : "DELETE",
      headers: done ? { "Content-Type": "application/json" } : {},
      body: done ? JSON.stringify({ value }) : undefined,
    })
    qc.invalidateQueries({ queryKey: queryKeys.goals() })
    qc.invalidateQueries({ queryKey: queryKeys.todayGoals() })
  }

  if (loading) {
    return <Loader fullScreen caption="gathering today’s plan…" />
  }

  return (
    <div className="space-y-6 py-2">
      <header className="text-center space-y-2 relative">
        <LabelTiny>Pratidina · the day&apos;s practice</LabelTiny>
        <h1 className="font-lyric text-3xl text-ink">Today&apos;s plan.</h1>
        <p className="font-lyric-italic text-sm text-earth-deep max-w-md mx-auto">
          The goals you set, surfaced for today. Log what you do — it
          becomes the record of what you planned.
        </p>
        {totalPlannable > 0 && (
          <p className="font-pressure-caps text-[10px] text-earth-mid tracking-wider pt-1">
            {completedToday} of {totalPlannable} kept
          </p>
        )}
      </header>

      <GoldRule width="section" />

      {/* ── Affirmation startup trigger ─────────────────────────── */}
      <section className="space-y-2">
        <LabelTiny>Mantra · before you begin</LabelTiny>
        {hasActiveAffirmation ? (
          <ButtonBare
            type="button"
            onClick={openRecitalModal}
            className="block w-full text-center bg-saffron text-ivory rounded-md px-4 py-2.5 text-[11px] font-pressure-caps tracking-[3px] shadow-[0_2px_8px_rgba(196,106,31,0.25)] hover:bg-saffron/90 transition-colors"
          >
            Begin recital →
          </ButtonBare>
        ) : (
          <div className="rounded border border-gold/30 bg-ivory-deep p-4 text-center">
            <p className="font-lyric-italic text-[12px] text-earth-mid mb-2">
              No affirmations yet.
            </p>
            <Link
              href="/settings/affirmations"
              className="font-pressure-caps text-[10px] tracking-wider text-saffron hover:underline"
            >
              Add one →
            </Link>
          </div>
        )}
      </section>

      <GoldRule width="section" />

      {/* ── Empty state ──────────────────────────────────────────── */}
      {totalPlannable === 0 &&
        upcomingQuests.length === 0 &&
        upcomingDisciplines.length === 0 && (
          <div className="rounded-md border border-gold/30 bg-ivory-deep p-6 text-center space-y-3">
            <p className="font-lyric text-base text-ink">
              Nothing in flight today.
            </p>
            <p className="font-lyric-italic text-[12px] text-earth-mid">
              Define a goal in the Goals tab to see it here.
            </p>
            <Link href="/goals" className="inline-block">
              <Button size="sm">Open Goals</Button>
            </Link>
          </div>
        )}

      {/* ── Active quest(s) — center stage ───────────────────────── */}
      {activeQuests.length > 0 && (
        <section className="space-y-2">
          <div>
            <LabelTiny>The quest{activeQuests.length > 1 ? "s" : ""}</LabelTiny>
            <p className="font-lyric-italic text-[11px] text-earth-mid mt-0.5">
              The journey you&apos;re on. One step at a time.
            </p>
          </div>
          <div className="space-y-3">
            {activeQuests.map((g) => (
              <ActiveQuestCard key={g.id} goal={g} />
            ))}
          </div>
        </section>
      )}

      {/* ── Disciplines: overdue / due soon / in flight ──────────── */}
      {(overdueDisciplines.length > 0 ||
        dueSoonDisciplines.length > 0 ||
        inFlightDisciplines.length > 0) && (
        <section className="space-y-3">
          <div>
            <LabelTiny>Disciplines</LabelTiny>
            <p className="font-lyric-italic text-[11px] text-earth-mid mt-0.5">
              The bedrock — practices that run alongside whatever you&apos;re
              chasing.
            </p>
          </div>
          {overdueDisciplines.length > 0 && (
            <PhaseGroup
              phase="overdue"
              title="Overdue"
              goals={overdueDisciplines}
              onLog={logProgress}
            />
          )}
          {dueSoonDisciplines.length > 0 && (
            <PhaseGroup
              phase="due_soon"
              title="Due soon"
              goals={dueSoonDisciplines}
              onLog={logProgress}
            />
          )}
          {inFlightDisciplines.length > 0 && (
            <PhaseGroup
              phase="in_flight"
              title="Today"
              goals={inFlightDisciplines}
              onLog={logProgress}
            />
          )}
        </section>
      )}

      {/* ── Upcoming (scheduled) ─────────────────────────────────── */}
      {(upcomingQuests.length > 0 || upcomingDisciplines.length > 0) && (
        <section className="space-y-2">
          <div>
            <LabelTiny>Upcoming</LabelTiny>
            <p className="font-lyric-italic text-[11px] text-earth-mid mt-0.5">
              Set up — not yet started. They&apos;ll join the Plan when their
              day arrives.
            </p>
          </div>
          <ul className="rounded-md border border-gold/30 bg-ivory-deep divide-y divide-gold/20 overflow-hidden">
            {[...upcomingQuests, ...upcomingDisciplines].map((g) => (
              <li key={g.id} className="hover:bg-ivory transition-colors">
                <Link
                  href={`/goals/${g.id}`}
                  className="block px-3 py-2.5 space-y-0.5"
                >
                  <div className="flex items-baseline gap-2">
                    <p className="font-lyric text-[14px] text-ink flex-1">
                      {g.title}
                    </p>
                    <span
                      className={cn(
                        "font-pressure-caps text-[9px] tracking-wider",
                        g.goalType === "quest"
                          ? "text-saffron"
                          : "text-earth-mid",
                      )}
                    >
                      {g.goalType === "quest" ? "Quest" : "Discipline"}
                    </span>
                  </div>
                  <p className="font-pressure-caps text-[9px] text-earth-mid tracking-wider">
                    Starts {formatRelativeFromToday(g.startDate)} ·{" "}
                    {formatHumanDate(g.startDate)} · {GOAL_SHAPE_LABEL[g.shape]}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recitalModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-100 flex items-end sm:items-center justify-center sm:px-4 bg-ink/55 backdrop-blur-sm animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-label="Begin recital"
            onClick={closeRecitalModal}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-gold/40 bg-linear-to-b from-ivory to-parchment p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 fade-in duration-200 text-center"
            >
              <div className="flex justify-center">
                <OmGlyph size={36} tone="saffron" />
              </div>

              <div className="space-y-1.5">
                <p className="font-lyric text-2xl text-ink leading-snug">
                  Speak each one.
                </p>
                <p className="font-lyric-italic text-sm text-earth-deep max-w-xs mx-auto">
                  {activeAffirmationCount} affirmation
                  {activeAffirmationCount === 1 ? "" : "s"}, shuffled. Read each
                  aloud — the page advances when you&apos;ve said it.
                </p>
              </div>

              <p className="font-lyric-italic text-[11px] text-earth-mid max-w-xs mx-auto">
                Tap the mic to start speaking, then tap again to stop. The next
                affirmation appears once you&apos;ve said the current one
                correctly. We&apos;ll ask for microphone access the first time.
              </p>

              <div className="flex items-center justify-center gap-3 pt-1">
                <ButtonBare
                  type="button"
                  onClick={closeRecitalModal}
                  className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-earth-deep px-3 py-1.5"
                >
                  Not now
                </ButtonBare>
                <ButtonBare
                  type="button"
                  onClick={beginRecital}
                  className="text-[11px] font-pressure-caps tracking-[3px] bg-saffron text-ivory rounded-md px-5 py-2 shadow-[0_2px_8px_rgba(196,106,31,0.25)]"
                >
                  Begin
                </ButtonBare>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

// ─── Active quest card ────────────────────────────────────────────────────

function ActiveQuestCard({ goal }: { goal: GoalWithProgress }) {
  const { milestones } = useMilestones(goal.id)

  const currentMilestone = milestones.find((m) => !m.completedAt) ?? null
  const completedMilestones = milestones.filter((m) => m.completedAt).length

  const phase = lifecyclePhaseOf(goal)
  const endHint =
    goal.endDate && (phase === "due_soon" || phase === "overdue")
      ? `${phase === "overdue" ? "Was due" : "Ends"} ${formatRelativeFromToday(goal.endDate)}`
      : null

  return (
    <Link
      href={`/goals/${goal.id}`}
      className="block rounded-md border border-saffron/40 bg-saffron/5 p-4 space-y-2.5 hover:bg-saffron/10 transition-colors"
      aria-label={`Open quest ${goal.title}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-lyric text-[18px] text-ink leading-tight">
          {goal.title}
        </p>
        <span className="font-pressure-caps text-[9px] text-saffron tracking-wider shrink-0">
          Quest
        </span>
      </div>

      {/* Current milestone — the one to push on today. */}
      {currentMilestone ? (
        <div className="rounded border border-saffron/30 bg-ivory/60 px-3 py-2">
          <p className="font-pressure-caps text-[9px] text-earth-mid tracking-wider">
            Current milestone
          </p>
          <p className="font-lyric text-[14px] text-ink mt-0.5">
            {currentMilestone.title}
          </p>
          {currentMilestone.targetValue != null && (
            <p className="font-pressure-caps text-[9px] text-earth-mid tracking-wider mt-0.5">
              target {currentMilestone.targetValue}
            </p>
          )}
        </div>
      ) : milestones.length === 0 ? (
        <p className="font-lyric-italic text-[11px] text-earth-mid">
          No milestones yet — open the quest to add one.
        </p>
      ) : (
        <p className="font-lyric-italic text-[11px] text-sage">
          Every milestone reached. Mark the quest complete when you&apos;re ready.
        </p>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="font-pressure-caps text-[9px] text-earth-mid tracking-wider">
          {completedMilestones}/{milestones.length} milestones
        </span>
        {endHint && (
          <span
            className={cn(
              "font-pressure-caps text-[9px] tracking-wider",
              phase === "overdue" ? "text-saffron" : "text-earth-deep",
            )}
          >
            {endHint}
          </span>
        )}
      </div>
    </Link>
  )
}

// ─── Phase group (within Disciplines) ────────────────────────────────────

const PHASE_TONE: Record<LifecyclePhase, string> = {
  overdue: "border-saffron/60",
  due_soon: "border-saffron/40",
  in_flight: "border-gold/30",
  scheduled: "border-gold/30",
  paused: "border-earth-mid/30",
  completed: "border-sage/30",
  abandoned: "border-earth-mid/30",
}

function PhaseGroup({
  phase,
  title,
  goals,
  onLog,
}: {
  phase: LifecyclePhase
  title: string
  goals: GoalWithProgress[]
  onLog: (goalId: string, done: boolean, value?: number) => Promise<void>
}) {
  return (
    <div className="space-y-1.5">
      <p className="font-pressure-caps text-[10px] text-earth-mid tracking-wider">
        {title}
      </p>
      <ul
        className={cn(
          "rounded-md border bg-ivory-deep divide-y divide-gold/20 overflow-hidden",
          PHASE_TONE[phase],
        )}
      >
        {goals.map((g) => (
          <PlanGoalRow key={g.id} goal={g} onLog={onLog} />
        ))}
      </ul>
    </div>
  )
}

function PlanGoalRow({
  goal,
  onLog,
}: {
  goal: GoalWithProgress
  onLog: (goalId: string, done: boolean, value?: number) => Promise<void>
}) {
  const endHint =
    goal.endDate && lifecyclePhaseOf(goal) !== "in_flight"
      ? `${lifecyclePhaseOf(goal) === "overdue" ? "Was due" : "Ends"} ${formatRelativeFromToday(goal.endDate)}`
      : null

  return (
    <li className="px-3 py-2.5 space-y-1.5 hover:bg-ivory transition-colors">
      <Link
        href={`/goals/${goal.id}`}
        className="block space-y-0.5"
        aria-label={`Open ${goal.title}`}
      >
        <p className="font-lyric text-[14px] text-ink">{goal.title}</p>
        <p className="font-pressure-caps text-[9px] text-earth-mid tracking-wider">
          {GOAL_SHAPE_LABEL[goal.shape]}
          {endHint && <> · {endHint}</>}
        </p>
      </Link>

      {/* Inline log control — mirrors TodayGoalsPanel for cohesion. */}
      <div className="flex items-center gap-3 pt-1">
        {goal.shape === "daily" ? (
          <ButtonBare
            type="button"
            onClick={() => void onLog(goal.id, !goal.progress.todayDone)}
            className="flex items-center gap-2"
            aria-label={
              goal.progress.todayDone ? "Mark not done" : "Mark today done"
            }
          >
            <HabitDot
              state={goal.progress.todayDone ? "complete" : "pending"}
              size={14}
            />
            <span className="font-pressure-caps text-[10px] tracking-wider text-earth-deep">
              {goal.progress.todayDone
                ? `Done · ${goal.progress.streak ?? 0}d`
                : "Mark done"}
            </span>
          </ButtonBare>
        ) : goal.shape === "weekly" || goal.shape === "monthly" ? (
          <>
            <span className="font-pressure-caps text-[10px] text-earth-mid tracking-wider">
              {goal.progress.weekTotal ?? 0}/{goal.weeklyTarget ?? 1}{" "}
              {goal.shape === "weekly" ? "this week" : "this month"}
            </span>
            {!goal.progress.isMet && (
              <ButtonBare
                type="button"
                onClick={() => void onLog(goal.id, true)}
                className="font-pressure-caps text-[10px] tracking-wider text-saffron hover:underline"
              >
                +1
              </ButtonBare>
            )}
          </>
        ) : (
          <>
            <span className="font-pressure-caps text-[10px] text-earth-mid tracking-wider">
              {goal.progress.totalSoFar ?? 0}/{goal.totalTarget ?? 0}
            </span>
            <ButtonBare
              type="button"
              onClick={() => void onLog(goal.id, true)}
              className="font-pressure-caps text-[10px] tracking-wider text-saffron hover:underline"
            >
              +1
            </ButtonBare>
          </>
        )}
      </div>
    </li>
  )
}
