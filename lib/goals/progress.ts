import { db } from "@/lib/db";
import { goals, goalLogs } from "@/lib/db/schema";
import { and, eq, gte, lte, desc, sql } from "drizzle-orm";
import type { Goal, GoalLog, GoalProgress, GoalWithProgress } from "@/types";

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

/** Monday of the ISO week of the given date, as YYYY-MM-DD. */
function isoWeekStart(date: string): string {
  const d = new Date(date + "T00:00:00");
  const day = d.getDay() || 7; // Sunday → 7
  if (day !== 1) d.setDate(d.getDate() - (day - 1));
  return ymd(d);
}

function dbGoalToType(row: typeof goals.$inferSelect): Goal {
  return {
    id: row.id,
    userId: row.userId,
    categoryId: row.categoryId,
    title: row.title,
    description: row.description,
    shape: row.shape,
    weeklyTarget: row.weeklyTarget,
    totalTarget: row.totalTarget,
    deadlineDate: row.deadlineDate,
    source: row.source,
    status: row.status,
    startedDate: row.startedDate,
    completedDate: row.completedDate,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

function dbLogToType(row: typeof goalLogs.$inferSelect): GoalLog {
  return {
    id: row.id,
    goalId: row.goalId,
    userId: row.userId,
    date: row.date,
    value: row.value,
    note: row.note,
    loggedAt: row.loggedAt?.toISOString() ?? new Date().toISOString(),
  };
}

/**
 * Compute progress for a single goal. Reads logs from DB.
 */
export async function computeProgress(goal: Goal): Promise<GoalProgress> {
  const today = ymd(new Date());

  if (goal.shape === "daily") {
    // Pull last 90 days of logs to compute streak
    const start = addDays(today, -89);
    const rows = await db
      .select({ date: goalLogs.date, value: goalLogs.value })
      .from(goalLogs)
      .where(
        and(
          eq(goalLogs.goalId, goal.id),
          gte(goalLogs.date, start),
          lte(goalLogs.date, today)
        )
      );

    const datesSet = new Set(rows.filter((r) => r.value > 0).map((r) => r.date));
    const todayDone = datesSet.has(today);

    // Streak: consecutive days backward from today (or yesterday if today not done)
    let streak = 0;
    let cursor = todayDone ? today : addDays(today, -1);
    while (datesSet.has(cursor)) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }

    return { todayDone, streak, isMet: todayDone };
  }

  if (goal.shape === "weekly") {
    const weekStart = isoWeekStart(today);
    const rows = await db
      .select({ value: goalLogs.value })
      .from(goalLogs)
      .where(
        and(
          eq(goalLogs.goalId, goal.id),
          gte(goalLogs.date, weekStart),
          lte(goalLogs.date, today)
        )
      );
    const weekTotal = rows.reduce((sum, r) => sum + (r.value || 0), 0);
    const target = goal.weeklyTarget ?? 1;
    return {
      weekTotal,
      isMet: weekTotal >= target,
    };
  }

  // by_date
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${goalLogs.value}), 0)`.as("total"),
    })
    .from(goalLogs)
    .where(eq(goalLogs.goalId, goal.id));
  const totalSoFar = Number(row?.total ?? 0);
  const target = goal.totalTarget ?? 1;
  const daysRemaining = goal.deadlineDate
    ? Math.max(
        0,
        Math.round(
          (new Date(goal.deadlineDate + "T00:00:00").getTime() -
            new Date(today + "T00:00:00").getTime()) /
            86_400_000
        )
      )
    : 0;
  return {
    totalSoFar,
    daysRemaining,
    isMet: totalSoFar >= target,
  };
}

/**
 * Pull goals for a category, attaching live progress.
 */
export async function listGoalsByCategory(
  userId: string,
  categoryId: string
): Promise<GoalWithProgress[]> {
  const rows = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.userId, userId),
        eq(goals.categoryId, categoryId),
        sql`${goals.status} != 'abandoned'`
      )
    )
    .orderBy(goals.sortOrder, desc(goals.createdAt));

  const out: GoalWithProgress[] = [];
  for (const row of rows) {
    const goal = dbGoalToType(row);
    const progress = await computeProgress(goal);
    out.push({ ...goal, progress });
  }
  return out;
}

/** All active goals across all categories, with progress. */
export async function listActiveGoals(
  userId: string
): Promise<GoalWithProgress[]> {
  const rows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.status, "active")))
    .orderBy(goals.sortOrder, desc(goals.createdAt));

  const out: GoalWithProgress[] = [];
  for (const row of rows) {
    const goal = dbGoalToType(row);
    out.push({ ...goal, progress: await computeProgress(goal) });
  }
  return out;
}

export async function getGoal(
  userId: string,
  goalId: string
): Promise<GoalWithProgress | null> {
  const [row] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.id, goalId)))
    .limit(1);
  if (!row) return null;
  const goal = dbGoalToType(row);
  return { ...goal, progress: await computeProgress(goal) };
}

export async function logGoalProgress(input: {
  userId: string;
  goalId: string;
  date: string;
  value?: number;
  note?: string | null;
}): Promise<GoalLog> {
  const value = input.value ?? 1;
  const note = input.note ?? null;

  // Daily: upsert by (goalId, date) — replace value
  // Others: insert a new log row
  // We unify by: if a row already exists for this date, update; else insert.
  const existing = await db
    .select()
    .from(goalLogs)
    .where(and(eq(goalLogs.goalId, input.goalId), eq(goalLogs.date, input.date)))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(goalLogs)
      .set({ value, note, loggedAt: new Date() })
      .where(eq(goalLogs.id, existing[0].id))
      .returning();
    return dbLogToType(updated);
  }

  const [inserted] = await db
    .insert(goalLogs)
    .values({
      goalId: input.goalId,
      userId: input.userId,
      date: input.date,
      value,
      note,
    })
    .returning();
  return dbLogToType(inserted);
}

export async function unlogGoalProgress(
  userId: string,
  goalId: string,
  date: string
): Promise<void> {
  await db
    .delete(goalLogs)
    .where(
      and(
        eq(goalLogs.userId, userId),
        eq(goalLogs.goalId, goalId),
        eq(goalLogs.date, date)
      )
    );
}
