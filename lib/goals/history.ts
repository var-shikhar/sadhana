import { db } from "@/lib/db";
import { goalHistory, goals } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import type { Goal, GoalHistoryEntry } from "@/types";

const TRACKED_FIELDS = [
  "status",
  "horizon",
  "shape",
  "title",
  "categoryId",
  "parentId",
  "endDate",
  "startDate",
] as const;

type TrackedField = (typeof TRACKED_FIELDS)[number];

/** Map an internal goal field to the change_type label written to history. */
const FIELD_TO_TYPE: Record<TrackedField, string> = {
  status: "status",
  horizon: "horizon",
  shape: "shape",
  title: "title",
  categoryId: "category",
  parentId: "parent",
  endDate: "end",
  startDate: "start",
};

function dbHistoryToType(
  row: typeof goalHistory.$inferSelect,
): GoalHistoryEntry {
  return {
    id: row.id,
    goalId: row.goalId,
    userId: row.userId,
    changeType: row.changeType,
    fromValue: row.fromValue ?? null,
    toValue: row.toValue ?? null,
    reason: row.reason ?? null,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

/**
 * Compare a previous goal row to the patch and write one history row per
 * tracked field that actually changed. `reason` is attached to every row
 * written for this PATCH (in practice the UI only collects it for status
 * changes — for other fields it's null).
 */
export async function recordGoalChanges(input: {
  userId: string;
  goalId: string;
  before: typeof goals.$inferSelect;
  patch: Record<string, unknown>;
  reason?: string | null;
}): Promise<void> {
  const rows: Array<typeof goalHistory.$inferInsert> = [];

  for (const field of TRACKED_FIELDS) {
    if (!(field in input.patch)) continue;
    const fromVal = (input.before as Record<string, unknown>)[field];
    const toVal = input.patch[field];
    if (Object.is(fromVal ?? null, toVal ?? null)) continue;

    rows.push({
      goalId: input.goalId,
      userId: input.userId,
      changeType: FIELD_TO_TYPE[field],
      fromValue: fromVal == null ? null : String(fromVal),
      toValue: toVal == null ? null : String(toVal),
      reason: input.reason ?? null,
    });
  }

  if (rows.length === 0) return;
  await db.insert(goalHistory).values(rows);
}

/** Write a single "created" history row for a brand-new goal. */
export async function recordGoalCreated(input: {
  userId: string;
  goal: Goal;
}): Promise<void> {
  await db.insert(goalHistory).values({
    goalId: input.goal.id,
    userId: input.userId,
    changeType: "created",
    fromValue: null,
    toValue: input.goal.title,
    reason: null,
  });
}

/** Read a goal's history, newest first. */
export async function listGoalHistory(
  userId: string,
  goalId: string,
): Promise<GoalHistoryEntry[]> {
  const rows = await db
    .select()
    .from(goalHistory)
    .where(
      and(eq(goalHistory.userId, userId), eq(goalHistory.goalId, goalId)),
    )
    .orderBy(desc(goalHistory.createdAt));
  return rows.map(dbHistoryToType);
}
