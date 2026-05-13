import { db } from "@/lib/db";
import { goals, goalLogs, profiles } from "@/lib/db/schema";
import { and, eq, gte, lte, desc, sql, isNull, inArray } from "drizzle-orm";
import type {
  Goal,
  GoalHorizon,
  GoalLog,
  GoalProgress,
  GoalShape,
  GoalStatus,
  GoalWithProgress,
} from "@/types";
import { todayYmd } from "@/lib/goals/lifecycle";

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

/** First day of the calendar month of `date`, as YYYY-MM-DD. */
function monthStart(date: string): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(1);
  return ymd(d);
}

export function dbGoalToType(row: typeof goals.$inferSelect): Goal {
  return {
    id: row.id,
    userId: row.userId,
    categoryId: row.categoryId,
    parentId: row.parentId,
    title: row.title,
    description: row.description,
    horizon: row.horizon,
    shape: row.shape,
    goalType: row.goalType,
    weeklyTarget: row.weeklyTarget,
    totalTarget: row.totalTarget,
    source: row.source,
    status: row.status,
    completedDate: row.completedDate,
    startDate: row.startDate,
    endDate: row.endDate,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

/**
 * The user's max-active-quests setting. Defaults to 1 if profile row
 * absent (shouldn't happen post-onboarding but stay safe).
 */
export async function getMaxActiveQuests(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: profiles.maxActiveQuests })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return row?.n ?? 1;
}

/** Count of quests currently in 'active' status. */
export async function countActiveQuests(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(goals)
    .where(
      and(
        eq(goals.userId, userId),
        eq(goals.goalType, "quest"),
        eq(goals.status, "active"),
      ),
    );
  return Number(row?.n ?? 0);
}

/**
 * Promote any of this user's 'scheduled' goals whose start_date has arrived
 * to 'active'. Run at the start of every list / detail read so the
 * scheduled→active transition is invisible to callers.
 *
 * Rules differ by goal type:
 *   • Disciplines      — promoted unconditionally. They run in parallel,
 *                        so there's no cap.
 *   • Quests           — promoted up to (maxActiveQuests - currentActive).
 *                        If more are due than slots, the ones with earliest
 *                        startDate (then createdAt) win; the rest stay
 *                        scheduled and naturally surface as "queued."
 *
 * Returns the ids of newly-promoted goals.
 */
export async function promoteScheduledGoals(userId: string): Promise<string[]> {
  const today = todayYmd();

  // Disciplines: promote all due.
  const promotedDisciplines = await db
    .update(goals)
    .set({ status: "active", updatedAt: new Date() })
    .where(
      and(
        eq(goals.userId, userId),
        eq(goals.status, "scheduled"),
        eq(goals.goalType, "discipline"),
        lte(goals.startDate, today),
      ),
    )
    .returning({ id: goals.id });

  // Quests: only fill remaining activation slots.
  const max = await getMaxActiveQuests(userId);
  const current = await countActiveQuests(userId);
  const slots = Math.max(0, max - current);

  let promotedQuestIds: string[] = [];
  if (slots > 0) {
    const due = await db
      .select({ id: goals.id })
      .from(goals)
      .where(
        and(
          eq(goals.userId, userId),
          eq(goals.status, "scheduled"),
          eq(goals.goalType, "quest"),
          lte(goals.startDate, today),
        ),
      )
      .orderBy(goals.startDate, goals.createdAt)
      .limit(slots);

    if (due.length > 0) {
      promotedQuestIds = due.map((d) => d.id);
      await db
        .update(goals)
        .set({ status: "active", updatedAt: new Date() })
        .where(
          and(
            eq(goals.userId, userId),
            inArray(goals.id, promotedQuestIds),
          ),
        );
    }
  }

  return [...promotedDisciplines.map((p) => p.id), ...promotedQuestIds];
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

  if (goal.shape === "monthly") {
    const start = monthStart(today);
    const rows = await db
      .select({ value: goalLogs.value })
      .from(goalLogs)
      .where(
        and(
          eq(goalLogs.goalId, goal.id),
          gte(goalLogs.date, start),
          lte(goalLogs.date, today)
        )
      );
    // Reuse weeklyTarget as the periodic target for monthly too.
    const monthTotal = rows.reduce((sum, r) => sum + (r.value || 0), 0);
    const target = goal.weeklyTarget ?? 1;
    return {
      weekTotal: monthTotal,
      isMet: monthTotal >= target,
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
  const daysRemaining = goal.endDate
    ? Math.max(
        0,
        Math.round(
          (new Date(goal.endDate + "T00:00:00").getTime() -
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
 * Pull TOP-LEVEL goals for a category, attaching live progress. Sub-goals
 * are excluded from category listings — they live under their parent.
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
        isNull(goals.parentId),
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

/** All active TOP-LEVEL goals across all categories, with progress. */
export async function listActiveGoals(
  userId: string
): Promise<GoalWithProgress[]> {
  const rows = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.userId, userId),
        eq(goals.status, "active"),
        isNull(goals.parentId),
      )
    )
    .orderBy(goals.sortOrder, desc(goals.createdAt));

  const out: GoalWithProgress[] = [];
  for (const row of rows) {
    const goal = dbGoalToType(row);
    out.push({ ...goal, progress: await computeProgress(goal) });
  }
  return out;
}

export interface GoalListFilters {
  horizon?: GoalHorizon;
  shape?: GoalShape;
  status?: GoalStatus;
  /** "all" → any category, "none" → no category, uuid → that category. */
  category?: "all" | "none" | string;
}

/**
 * List the user's TOP-LEVEL goals (parent_id IS NULL) with optional
 * filters. Used by the /goals surface. Promotes any due 'scheduled' goals
 * to 'active' before reading so callers always see the live state.
 */
export async function listTopLevelGoals(
  userId: string,
  filters: GoalListFilters = {},
): Promise<GoalWithProgress[]> {
  await promoteScheduledGoals(userId);

  const conds = [eq(goals.userId, userId), isNull(goals.parentId)];
  if (filters.horizon) conds.push(eq(goals.horizon, filters.horizon));
  if (filters.shape) conds.push(eq(goals.shape, filters.shape));
  if (filters.status) conds.push(eq(goals.status, filters.status));
  if (filters.category && filters.category !== "all") {
    if (filters.category === "none") conds.push(isNull(goals.categoryId));
    else conds.push(eq(goals.categoryId, filters.category));
  }

  const rows = await db
    .select()
    .from(goals)
    .where(and(...conds))
    .orderBy(goals.sortOrder, desc(goals.createdAt));

  const out: GoalWithProgress[] = [];
  for (const row of rows) {
    const goal = dbGoalToType(row);
    out.push({ ...goal, progress: await computeProgress(goal) });
  }
  return out;
}

/** Sub-goals of a given parent, with progress. Excludes abandoned. */
export async function listSubGoals(
  userId: string,
  parentId: string,
): Promise<GoalWithProgress[]> {
  const rows = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.userId, userId),
        eq(goals.parentId, parentId),
        sql`${goals.status} != 'abandoned'`,
      )
    )
    .orderBy(goals.sortOrder, desc(goals.createdAt));

  const out: GoalWithProgress[] = [];
  for (const row of rows) {
    const goal = dbGoalToType(row);
    out.push({ ...goal, progress: await computeProgress(goal) });
  }
  return out;
}

/** Recent log rows for a goal. */
export async function listGoalLogs(
  userId: string,
  goalId: string,
  limit = 50,
): Promise<GoalLog[]> {
  const rows = await db
    .select()
    .from(goalLogs)
    .where(and(eq(goalLogs.userId, userId), eq(goalLogs.goalId, goalId)))
    .orderBy(desc(goalLogs.date), desc(goalLogs.loggedAt))
    .limit(limit);
  return rows.map(dbLogToType);
}

export async function getGoal(
  userId: string,
  goalId: string
): Promise<GoalWithProgress | null> {
  await promoteScheduledGoals(userId);
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
