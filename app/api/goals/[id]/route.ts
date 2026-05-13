import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { goals } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import {
  countActiveQuests,
  getGoal,
  getMaxActiveQuests,
} from "@/lib/goals/progress";
import { recordGoalChanges } from "@/lib/goals/history";
import { QUEST_ACTIVATION_CONFLICT } from "@/lib/goals/lifecycle";
import {
  isHorizonAllowedUnder,
  type GoalHorizon,
  type GoalShape,
  type GoalStatus,
} from "@/types";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const goal = await getGoal(auth.userId, id);
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(goal);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const body = (await request.json()) as Partial<{
    title: string;
    description: string | null;
    horizon: GoalHorizon;
    shape: GoalShape;
    weeklyTarget: number | null;
    totalTarget: number | null;
    /** Optional finish line for any cadence. */
    endDate: string | null;
    /** When tracking begins; future value puts the goal in 'scheduled'. */
    startDate: string | null;
    status: GoalStatus;
    categoryId: string | null;
    parentId: string | null;
    sortOrder: number;
    /** Optional user-supplied reason for the change (UI captures on status change). */
    reason: string | null;
  }>;

  // Read existing row for diffing + sub-goal validation.
  const [before] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, auth.userId)))
    .limit(1);
  if (!before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title === "string")
    updates.title = body.title.trim().slice(0, 80);
  if (body.description !== undefined)
    updates.description = body.description?.trim().slice(0, 240) || null;
  if (typeof body.shape === "string") updates.shape = body.shape;
  if (body.weeklyTarget !== undefined) updates.weeklyTarget = body.weeklyTarget;
  if (body.totalTarget !== undefined) updates.totalTarget = body.totalTarget;
  if (body.endDate !== undefined) updates.endDate = body.endDate;
  if (typeof body.startDate === "string") updates.startDate = body.startDate;
  if (typeof body.status === "string") updates.status = body.status;
  if (typeof body.sortOrder === "number") updates.sortOrder = body.sortOrder;
  if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
  if (typeof body.horizon === "string") updates.horizon = body.horizon;

  // Sub-goal re-parenting: validate if parent changes.
  if (body.parentId !== undefined && body.parentId !== before.parentId) {
    if (body.parentId === null) {
      updates.parentId = null;
    } else {
      const [parent] = await db
        .select()
        .from(goals)
        .where(and(eq(goals.id, body.parentId), eq(goals.userId, auth.userId)))
        .limit(1);
      if (!parent) {
        return NextResponse.json({ error: "Parent goal not found" }, { status: 404 });
      }
      if (parent.parentId) {
        return NextResponse.json(
          { error: "Sub-goals cannot have their own sub-goals" },
          { status: 400 },
        );
      }
      const childHorizon = (updates.horizon as GoalHorizon | undefined) ?? before.horizon;
      if (!isHorizonAllowedUnder(childHorizon, parent.horizon)) {
        return NextResponse.json(
          { error: "Sub-goal horizon must be ≤ parent horizon" },
          { status: 400 },
        );
      }
      updates.parentId = body.parentId;
    }
  }

  // If horizon changes and this row is a sub-goal, re-check vs current parent.
  if (
    typeof body.horizon === "string" &&
    before.parentId &&
    body.parentId === undefined
  ) {
    const [parent] = await db
      .select({ horizon: goals.horizon })
      .from(goals)
      .where(eq(goals.id, before.parentId))
      .limit(1);
    if (parent && !isHorizonAllowedUnder(body.horizon, parent.horizon)) {
      return NextResponse.json(
        { error: "Sub-goal horizon must be ≤ parent horizon" },
        { status: 400 },
      );
    }
  }

  // If status flipped to 'completed', set completedDate.
  if (body.status === "completed" && before.status !== "completed") {
    updates.completedDate = new Date().toISOString().slice(0, 10);
  }
  if (body.status && body.status !== "completed" && before.completedDate) {
    updates.completedDate = null;
  }

  // Quest activation cap. If the patch flips a quest from non-active to
  // 'active' AND the user is already at maxActiveQuests, reject with a
  // structured conflict response. The client catches this and offers a
  // modal letting the user pause one of their current active quests.
  if (
    body.status === "active" &&
    before.status !== "active" &&
    before.goalType === "quest"
  ) {
    const [max, current] = await Promise.all([
      getMaxActiveQuests(auth.userId),
      countActiveQuests(auth.userId),
    ]);
    if (current >= max) {
      const activeRows = await db
        .select({ id: goals.id })
        .from(goals)
        .where(
          and(
            eq(goals.userId, auth.userId),
            eq(goals.goalType, "quest"),
            eq(goals.status, "active"),
          ),
        );
      return NextResponse.json(
        {
          error: QUEST_ACTIVATION_CONFLICT,
          max,
          currentActiveQuestIds: activeRows.map((r) => r.id),
        },
        { status: 409 },
      );
    }
  }

  const [row] = await db
    .update(goals)
    .set(updates)
    .where(and(eq(goals.id, id), eq(goals.userId, auth.userId)))
    .returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await recordGoalChanges({
    userId: auth.userId,
    goalId: id,
    before,
    patch: updates,
    reason: body.reason ?? null,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const [before] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, auth.userId)))
    .limit(1);
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft delete via status=abandoned. History entry written.
  const updates = { status: "abandoned" as const, updatedAt: new Date() };
  await db
    .update(goals)
    .set(updates)
    .where(and(eq(goals.id, id), eq(goals.userId, auth.userId)));

  await recordGoalChanges({
    userId: auth.userId,
    goalId: id,
    before,
    patch: updates,
    reason: null,
  });

  return NextResponse.json({ success: true });
}
