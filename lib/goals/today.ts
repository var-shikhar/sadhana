import { db } from "@/lib/db";
import { goals, goalLogs, categories } from "@/lib/db/schema";
import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import type { GoalShape, GoalSource, GoalType, CategoryColor } from "@/types";
import { promoteScheduledGoals } from "@/lib/goals/progress";

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoWeekStart(date: string): string {
  const d = new Date(date + "T00:00:00");
  const day = d.getDay() || 7;
  if (day !== 1) d.setDate(d.getDate() - (day - 1));
  return ymd(d);
}

export interface TodayGoalRow {
  id: string;
  /** null when uncategorized. */
  categoryId: string | null;
  categoryTitle: string | null;
  categoryColor: CategoryColor | null;
  title: string;
  shape: GoalShape;
  goalType: GoalType;
  source: GoalSource;
  // daily-shape:
  todayDone?: boolean;
  streak?: number;
  // weekly OR monthly-shape (reuses weeklyTarget column for the periodic target):
  weekTotal?: number;
  weeklyTarget?: number;
  // by_date-shape:
  totalSoFar?: number;
  totalTarget?: number;
  daysRemaining?: number;
  isMet: boolean;
}

/**
 * Returns all active goals across all active categories, with today's
 * progress hydrated. Used by Home to render Today's offerings as goals
 * (replacing the legacy habit-only view).
 */
export async function getTodayGoals(userId: string): Promise<TodayGoalRow[]> {
  // Promote any 'scheduled' goal whose start date has arrived BEFORE we
  // read — otherwise a goal that became due today would silently miss the
  // Plan/Today surface for one cycle.
  await promoteScheduledGoals(userId);

  const today = ymd(new Date());
  const weekStart = isoWeekStart(today);
  const ninetyDaysAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 89);
    return ymd(d);
  })();

  // Pull TOP-LEVEL goals + their (optional) categories in one query.
  // LEFT JOIN — uncategorized goals are kept; sub-goals are excluded.
  // Filters to in-flight goals only:
  //   - status = 'active' (excludes scheduled/paused/completed/abandoned)
  //   - start_date <= today
  //   - end_date >= today OR null (open-ended)
  //   - category active OR null
  const rows = await db
    .select({
      id: goals.id,
      title: goals.title,
      shape: goals.shape,
      goalType: goals.goalType,
      source: goals.source,
      weeklyTarget: goals.weeklyTarget,
      totalTarget: goals.totalTarget,
      endDate: goals.endDate,
      categoryId: goals.categoryId,
      categoryTitle: categories.title,
      categoryColor: categories.color,
      categoryActive: categories.isActive,
    })
    .from(goals)
    .leftJoin(categories, eq(categories.id, goals.categoryId))
    .where(
      and(
        eq(goals.userId, userId),
        eq(goals.status, "active"),
        isNull(goals.parentId),
        lte(goals.startDate, today),
        or(isNull(goals.endDate), gte(goals.endDate, today)),
        // Uncategorized goal OR its category is active.
        or(isNull(goals.categoryId), eq(categories.isActive, true)),
      )
    )
    .orderBy(categories.sortOrder, goals.sortOrder);

  if (rows.length === 0) return [];

  // Pull all logs in a 90-day window for streak + weekly + total
  const logs = await db
    .select({
      goalId: goalLogs.goalId,
      date: goalLogs.date,
      value: goalLogs.value,
    })
    .from(goalLogs)
    .where(
      and(
        eq(goalLogs.userId, userId),
        gte(goalLogs.date, ninetyDaysAgo),
        lte(goalLogs.date, today)
      )
    );

  // Index logs by goal id
  const logsByGoal = new Map<string, Array<{ date: string; value: number }>>();
  for (const l of logs) {
    if (!logsByGoal.has(l.goalId)) logsByGoal.set(l.goalId, []);
    logsByGoal.get(l.goalId)!.push({ date: l.date, value: l.value });
  }

  // Pull total-so-far for by_date goals (separate cheap aggregate)
  const totals = await db
    .select({
      goalId: goalLogs.goalId,
      total: sql<number>`coalesce(sum(${goalLogs.value}), 0)`.as("total"),
    })
    .from(goalLogs)
    .where(eq(goalLogs.userId, userId))
    .groupBy(goalLogs.goalId);
  const totalByGoal = new Map<string, number>();
  for (const t of totals) totalByGoal.set(t.goalId, Number(t.total));

  return rows.map((r): TodayGoalRow => {
    const goalLogsArr = logsByGoal.get(r.id) ?? [];

    if (r.shape === "daily") {
      const datesSet = new Set(
        goalLogsArr.filter((l) => l.value > 0).map((l) => l.date)
      );
      const todayDone = datesSet.has(today);

      let streak = 0;
      let cursor = todayDone ? today : addDays(today, -1);
      while (datesSet.has(cursor)) {
        streak += 1;
        cursor = addDays(cursor, -1);
      }

      return {
        id: r.id,
        categoryId: r.categoryId,
        categoryTitle: r.categoryTitle,
        categoryColor: r.categoryColor,
        title: r.title,
        shape: r.shape,
        goalType: r.goalType,
        source: r.source,
        todayDone,
        streak,
        isMet: todayDone,
      };
    }

    if (r.shape === "weekly") {
      const weekTotal = goalLogsArr
        .filter((l) => l.date >= weekStart && l.date <= today)
        .reduce((sum, l) => sum + (l.value || 0), 0);
      const target = r.weeklyTarget ?? 1;
      return {
        id: r.id,
        categoryId: r.categoryId,
        categoryTitle: r.categoryTitle,
        categoryColor: r.categoryColor,
        title: r.title,
        shape: r.shape,
        goalType: r.goalType,
        source: r.source,
        weekTotal,
        weeklyTarget: target,
        isMet: weekTotal >= target,
      };
    }

    if (r.shape === "monthly") {
      // First day of the calendar month containing `today`.
      const m = (() => {
        const d = new Date(today + "T00:00:00");
        d.setDate(1);
        return ymd(d);
      })();
      const monthTotal = goalLogsArr
        .filter((l) => l.date >= m && l.date <= today)
        .reduce((sum, l) => sum + (l.value || 0), 0);
      const target = r.weeklyTarget ?? 1;
      return {
        id: r.id,
        categoryId: r.categoryId,
        categoryTitle: r.categoryTitle,
        categoryColor: r.categoryColor,
        title: r.title,
        shape: r.shape,
        goalType: r.goalType,
        source: r.source,
        weekTotal: monthTotal,
        weeklyTarget: target,
        isMet: monthTotal >= target,
      };
    }

    // by_date
    const totalSoFar = totalByGoal.get(r.id) ?? 0;
    const target = r.totalTarget ?? 1;
    const daysRemaining = r.endDate
      ? Math.max(
          0,
          Math.round(
            (new Date(r.endDate + "T00:00:00").getTime() -
              new Date(today + "T00:00:00").getTime()) /
              86_400_000
          )
        )
      : 0;
    return {
      id: r.id,
      categoryId: r.categoryId,
      categoryTitle: r.categoryTitle,
      categoryColor: r.categoryColor,
      title: r.title,
      shape: r.shape,
      goalType: r.goalType,
      source: r.source,
      totalSoFar,
      totalTarget: target,
      daysRemaining,
      isMet: totalSoFar >= target,
    };
  });
}

function addDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + n);
  return ymd(d);
}
