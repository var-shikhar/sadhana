"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button, ButtonBare } from "@/components/ui/button"
import { LabelTiny } from "@/components/gurukul/LabelTiny"
import { GoldRule } from "@/components/gurukul/GoldRule"
import { HabitDot } from "@/components/gurukul/HabitDot"
import { cn } from "@/lib/utils"
import { useAllGoals } from "@/hooks/useGoals"
import { useAffirmations } from "@/hooks/useAffirmations"
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

  const { overdue, dueSoon, inFlight, upcoming } = useMemo(() => {
    const overdue: GoalWithProgress[] = []
    const dueSoon: GoalWithProgress[] = []
    const inFlight: GoalWithProgress[] = []
    const upcoming: GoalWithProgress[] = []
    for (const g of activeGoals) {
      if (!isInFlight(g, today) && g.endDate && g.endDate < today) {
        overdue.push(g)
        continue
      }
      const phase = lifecyclePhaseOf(g, today)
      if (phase === "due_soon") dueSoon.push(g)
      else if (phase === "in_flight") inFlight.push(g)
    }
    for (const g of scheduledGoals) upcoming.push(g)
    return { overdue, dueSoon, inFlight, upcoming }
  }, [activeGoals, scheduledGoals, today])

  const totalPlannable = inFlight.length + dueSoon.length + overdue.length
  const completedToday = [...inFlight, ...dueSoon, ...overdue].filter(
    (g) => g.progress.isMet,
  ).length

  const hasActiveAffirmation = affirmations.some((a) => a.isActive)

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
    return (
      <p className="font-lyric-italic text-earth-mid py-6 text-center">
        Loading…
      </p>
    )
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
          <Link
            href="/settings/affirmations/practice"
            className="block w-full text-center bg-saffron text-ivory rounded-md px-4 py-2.5 text-[11px] font-pressure-caps tracking-[3px] shadow-[0_2px_8px_rgba(196,106,31,0.25)] hover:bg-saffron/90 transition-colors"
          >
            Begin recital →
          </Link>
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
      {totalPlannable === 0 && upcoming.length === 0 && (
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

      {/* ── Overdue ──────────────────────────────────────────────── */}
      {overdue.length > 0 && (
        <PhaseSection
          phase="overdue"
          title="Overdue"
          caption="The window passed — review or close them out."
          goals={overdue}
          onLog={logProgress}
        />
      )}

      {/* ── Due soon (within 7 days) ─────────────────────────────── */}
      {dueSoon.length > 0 && (
        <PhaseSection
          phase="due_soon"
          title="Due soon"
          caption="Closing in. Don't let these slip."
          goals={dueSoon}
          onLog={logProgress}
        />
      )}

      {/* ── In flight ────────────────────────────────────────────── */}
      {inFlight.length > 0 && (
        <PhaseSection
          phase="in_flight"
          title="In flight"
          caption="Active and on time."
          goals={inFlight}
          onLog={logProgress}
        />
      )}

      {/* ── Upcoming (scheduled goals) ────────────────────────────── */}
      {upcoming.length > 0 && (
        <section className="space-y-2">
          <div>
            <LabelTiny>Upcoming</LabelTiny>
            <p className="font-lyric-italic text-[11px] text-earth-mid mt-0.5">
              Set up — not yet started. They&apos;ll join the Plan when their
              day arrives.
            </p>
          </div>
          <ul className="rounded-md border border-gold/30 bg-ivory-deep divide-y divide-gold/20 overflow-hidden">
            {upcoming.map((g) => (
              <li key={g.id} className="hover:bg-ivory transition-colors">
                <Link
                  href={`/goals/${g.id}`}
                  className="block px-3 py-2.5 space-y-0.5"
                >
                  <p className="font-lyric text-[14px] text-ink">{g.title}</p>
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
    </div>
  )
}

// ─── Phase section ────────────────────────────────────────────────────────

const PHASE_TONE: Record<LifecyclePhase, string> = {
  overdue: "border-saffron/60",
  due_soon: "border-saffron/40",
  in_flight: "border-gold/30",
  scheduled: "border-gold/30",
  paused: "border-earth-mid/30",
  completed: "border-sage/30",
  abandoned: "border-earth-mid/30",
}

function PhaseSection({
  phase,
  title,
  caption,
  goals,
  onLog,
}: {
  phase: LifecyclePhase
  title: string
  caption: string
  goals: GoalWithProgress[]
  onLog: (goalId: string, done: boolean, value?: number) => Promise<void>
}) {
  return (
    <section className="space-y-2">
      <div>
        <LabelTiny>{title}</LabelTiny>
        <p className="font-lyric-italic text-[11px] text-earth-mid mt-0.5">
          {caption}
        </p>
      </div>
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
    </section>
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
