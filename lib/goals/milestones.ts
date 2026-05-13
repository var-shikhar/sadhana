import { db } from "@/lib/db";
import { milestones, tasks } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import type { Milestone, MilestoneWithTaskCount } from "@/types";

export function dbMilestoneToType(
  row: typeof milestones.$inferSelect,
): Milestone {
  return {
    id: row.id,
    goalId: row.goalId,
    userId: row.userId,
    title: row.title,
    description: row.description,
    targetValue: row.targetValue,
    orderIndex: row.orderIndex,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

/**
 * Milestones for a quest goal with their task tallies. Ordered by
 * `orderIndex` ascending — the user's stated sequence.
 */
export async function listMilestonesWithCounts(
  userId: string,
  goalId: string,
): Promise<MilestoneWithTaskCount[]> {
  const rows = await db
    .select({
      id: milestones.id,
      goalId: milestones.goalId,
      userId: milestones.userId,
      title: milestones.title,
      description: milestones.description,
      targetValue: milestones.targetValue,
      orderIndex: milestones.orderIndex,
      completedAt: milestones.completedAt,
      createdAt: milestones.createdAt,
      updatedAt: milestones.updatedAt,
      taskCount: sql<number>`coalesce(count(${tasks.id}) filter (where ${tasks.id} is not null)::int, 0)`,
      taskCompletedCount: sql<number>`coalesce(count(${tasks.id}) filter (where ${tasks.status} = 'done')::int, 0)`,
    })
    .from(milestones)
    .leftJoin(tasks, eq(tasks.milestoneId, milestones.id))
    .where(and(eq(milestones.userId, userId), eq(milestones.goalId, goalId)))
    .groupBy(milestones.id)
    .orderBy(milestones.orderIndex, milestones.createdAt);

  return rows.map((r) => ({
    id: r.id,
    goalId: r.goalId,
    userId: r.userId,
    title: r.title,
    description: r.description,
    targetValue: r.targetValue,
    orderIndex: r.orderIndex,
    completedAt: r.completedAt?.toISOString() ?? null,
    createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: r.updatedAt?.toISOString() ?? new Date().toISOString(),
    taskCount: Number(r.taskCount ?? 0),
    taskCompletedCount: Number(r.taskCompletedCount ?? 0),
  }));
}

/**
 * The "current" milestone of a quest — the first one that isn't completed.
 * Returns null when every milestone is done (or there are none). The Plan
 * tab uses this to spotlight today's next checkpoint.
 */
export async function getCurrentMilestone(
  userId: string,
  goalId: string,
): Promise<Milestone | null> {
  const [row] = await db
    .select()
    .from(milestones)
    .where(
      and(
        eq(milestones.userId, userId),
        eq(milestones.goalId, goalId),
        sql`${milestones.completedAt} IS NULL`,
      ),
    )
    .orderBy(milestones.orderIndex, milestones.createdAt)
    .limit(1);
  return row ? dbMilestoneToType(row) : null;
}
