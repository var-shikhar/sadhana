import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { goals, milestones } from "@/lib/db/schema";
import { and, eq, max } from "drizzle-orm";
import {
  dbMilestoneToType,
  listMilestonesWithCounts,
} from "@/lib/goals/milestones";

/** GET /api/goals/:id/milestones — ordered milestones for a quest goal. */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id: goalId } = await context.params;

  // Verify the goal exists and belongs to the user. We don't 404 on a
  // discipline goal here — we just return an empty list, because the
  // client should already gate this by goalType.
  const [goal] = await db
    .select({ id: goals.id })
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, auth.userId)))
    .limit(1);
  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const rows = await listMilestonesWithCounts(auth.userId, goalId);
  return NextResponse.json(rows);
}

/** POST /api/goals/:id/milestones — append a milestone to the quest. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id: goalId } = await context.params;

  const body = (await request.json()) as {
    title: string;
    description?: string | null;
    targetValue?: number | null;
    orderIndex?: number | null;
  };

  const title = body.title?.trim().slice(0, 120);
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  // Verify ownership AND that this is a quest goal. Disciplines have no
  // milestones — reject at the API so the client can't smuggle them in.
  const [goal] = await db
    .select({ id: goals.id, goalType: goals.goalType })
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, auth.userId)))
    .limit(1);
  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }
  if (goal.goalType !== "quest") {
    return NextResponse.json(
      { error: "Only quest goals can have milestones." },
      { status: 400 },
    );
  }

  // New milestones land at the end of the sequence unless the caller
  // specified an orderIndex (used for reordering operations).
  let orderIndex = body.orderIndex;
  if (orderIndex == null) {
    const [maxRow] = await db
      .select({ m: max(milestones.orderIndex) })
      .from(milestones)
      .where(eq(milestones.goalId, goalId));
    orderIndex = (maxRow?.m ?? -1) + 1;
  }

  const [row] = await db
    .insert(milestones)
    .values({
      goalId,
      userId: auth.userId,
      title,
      description: body.description?.trim().slice(0, 400) || null,
      targetValue: body.targetValue ?? null,
      orderIndex,
    })
    .returning();

  return NextResponse.json(dbMilestoneToType(row));
}
