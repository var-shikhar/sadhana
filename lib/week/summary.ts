import { db } from "@/lib/db";
import { goals, goalLogs, categories, reflections } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import type { GoalShape, GoalSource, CategoryColor } from "@/types";

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + n);
  return ymd(d);
}
function isoWeekStart(date: string): string {
  const d = new Date(date + "T00:00:00");
  const day = d.getDay() || 7;
  if (day !== 1) d.setDate(d.getDate() - (day - 1));
  return ymd(d);
}

export interface WeekDay {
  date: string;        // YYYY-MM-DD
  label: string;       // "Mon"
  isToday: boolean;
  isFuture: boolean;
  hasReflection: boolean;
}

export interface WeekDailyGoalRow {
  id: string;
  title: string;
  shape: "daily";
  categoryTitle: string;
  categoryIcon: string;
  categoryColor: CategoryColor;
  source: GoalSource;
  /** length 7, oldest → newest */
  daySlots: Array<"kept" | "slip" | "future">;
  daysKept: number;
}

export interface WeekWeeklyGoalRow {
  id: string;
  title: string;
  shape: "weekly";
  categoryTitle: string;
  categoryIcon: string;
  categoryColor: CategoryColor;
  source: GoalSource;
  weeklyTarget: number;
  weekTotal: number;
  isMet: boolean;
}

export interface WeekByDateGoalRow {
  id: string;
  title: string;
  shape: "by_date";
  categoryTitle: string;
  categoryIcon: string;
  categoryColor: CategoryColor;
  source: GoalSource;
  /** Logged this week */
  weekTotal: number;
  totalTarget: number;
  daysRemaining: number;
}

export type WeekGoalRow =
  | WeekDailyGoalRow
  | WeekWeeklyGoalRow
  | WeekByDateGoalRow;

export interface WeekSummary {
  weekStart: string;
  weekEnd: string;
  days: WeekDay[];
  goals: WeekGoalRow[];
  /** Across all goals: kept / scheduled-so-far ratio (0..1) */
  weekRatio: number;
  /** Sunday flag — surface the review prompt */
  isSunday: boolean;
}

export async function getWeekSummary(userId: string): Promise<WeekSummary> {
  const today = ymd(new Date());
  const weekStart = isoWeekStart(today);
  const weekEnd = addDays(weekStart, 6);

  // ── Pull goals + categories
  const goalRows = await db
    .select({
      id: goals.id,
      title: goals.title,
      shape: goals.shape,
      source: goals.source,
      weeklyTarget: goals.weeklyTarget,
      totalTarget: goals.totalTarget,
      deadlineDate: goals.deadlineDate,
      categoryTitle: categories.title,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      categoryPriority: categories.priority,
      categorySortOrder: categories.sortOrder,
      goalSortOrder: goals.sortOrder,
    })
    .from(goals)
    .innerJoin(categories, eq(categories.id, goals.categoryId))
    .where(
      and(
        eq(goals.userId, userId),
        eq(goals.status, "active"),
        eq(categories.isActive, true)
      )
    )
    .orderBy(categories.priority, categories.sortOrder, goals.sortOrder);

  // ── Pull this week's goal logs
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
        gte(goalLogs.date, weekStart),
        lte(goalLogs.date, weekEnd)
      )
    );

  // ── Reflections this week (for the "did I sit?" indicator)
  const reflRows = await db
    .select({ date: reflections.date })
    .from(reflections)
    .where(
      and(
        eq(reflections.userId, userId),
        gte(reflections.date, weekStart),
        lte(reflections.date, weekEnd)
      )
    );
  const reflDates = new Set(reflRows.map((r) => r.date));

  // ── Build day grid (Mon..Sun)
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const days: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    days.push({
      date,
      label: dayLabels[i],
      isToday: date === today,
      isFuture: date > today,
      hasReflection: reflDates.has(date),
    });
  }

  // Index logs by goal+date
  const logKey = (gid: string, d: string) => `${gid}::${d}`;
  const logSet = new Set<string>();
  const valByKey = new Map<string, number>();
  for (const l of logs) {
    if ((l.value ?? 0) > 0) logSet.add(logKey(l.goalId, l.date));
    valByKey.set(
      logKey(l.goalId, l.date),
      (valByKey.get(logKey(l.goalId, l.date)) ?? 0) + (l.value ?? 0)
    );
  }

  // Aggregate week totals per goal
  const totalsByGoal = new Map<string, number>();
  for (const l of logs) {
    totalsByGoal.set(
      l.goalId,
      (totalsByGoal.get(l.goalId) ?? 0) + (l.value ?? 0)
    );
  }

  let scheduledSoFar = 0;
  let kept = 0;

  const goalSummaries: WeekGoalRow[] = goalRows.map((r): WeekGoalRow => {
    if (r.shape === "daily") {
      const slots: Array<"kept" | "slip" | "future"> = [];
      let daysKept = 0;
      for (const d of days) {
        if (d.isFuture) {
          slots.push("future");
        } else {
          const k = logKey(r.id, d.date);
          if (logSet.has(k)) {
            slots.push("kept");
            daysKept += 1;
            kept += 1;
            scheduledSoFar += 1;
          } else if (d.isToday) {
            // today not yet kept — count as future-shaped (no slip yet)
            slots.push("future");
          } else {
            slots.push("slip");
            scheduledSoFar += 1;
          }
        }
      }
      return {
        id: r.id,
        title: r.title,
        shape: "daily",
        categoryTitle: r.categoryTitle,
        categoryIcon: r.categoryIcon,
        categoryColor: r.categoryColor,
        source: r.source,
        daySlots: slots,
        daysKept,
      };
    }
    if (r.shape === "weekly") {
      const total = totalsByGoal.get(r.id) ?? 0;
      const target = r.weeklyTarget ?? 1;
      // Weekly contributes one "scheduled" + one "kept" if met
      scheduledSoFar += 1;
      if (total >= target) kept += 1;
      return {
        id: r.id,
        title: r.title,
        shape: "weekly",
        categoryTitle: r.categoryTitle,
        categoryIcon: r.categoryIcon,
        categoryColor: r.categoryColor,
        source: r.source,
        weeklyTarget: target,
        weekTotal: total,
        isMet: total >= target,
      };
    }
    // by_date — just show this week's contribution + total + days left
    const weekTotal = totalsByGoal.get(r.id) ?? 0;
    const target = r.totalTarget ?? 1;
    const daysRemaining = r.deadlineDate
      ? Math.max(
          0,
          Math.round(
            (new Date(r.deadlineDate + "T00:00:00").getTime() -
              new Date(today + "T00:00:00").getTime()) /
              86_400_000
          )
        )
      : 0;
    return {
      id: r.id,
      title: r.title,
      shape: "by_date",
      categoryTitle: r.categoryTitle,
      categoryIcon: r.categoryIcon,
      categoryColor: r.categoryColor,
      source: r.source,
      weekTotal,
      totalTarget: target,
      daysRemaining,
    };
  });

  const weekRatio = scheduledSoFar > 0 ? kept / scheduledSoFar : 0;
  const isSunday = new Date(today + "T00:00:00").getDay() === 0;

  return {
    weekStart,
    weekEnd,
    days,
    goals: goalSummaries,
    weekRatio,
    isSunday,
  };
}

export type _GoalShape = GoalShape;
