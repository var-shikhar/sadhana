import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { goals } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getGoal } from "@/lib/goals/progress";
import type { GoalShape, GoalStatus } from "@/types";

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
    shape: GoalShape;
    weeklyTarget: number | null;
    totalTarget: number | null;
    deadlineDate: string | null;
    status: GoalStatus;
    sortOrder: number;
  }>;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title === "string")
    updates.title = body.title.trim().slice(0, 80);
  if (body.description !== undefined)
    updates.description = body.description?.trim().slice(0, 240) || null;
  if (typeof body.shape === "string") updates.shape = body.shape;
  if (body.weeklyTarget !== undefined) updates.weeklyTarget = body.weeklyTarget;
  if (body.totalTarget !== undefined) updates.totalTarget = body.totalTarget;
  if (body.deadlineDate !== undefined) updates.deadlineDate = body.deadlineDate;
  if (typeof body.status === "string") updates.status = body.status;
  if (typeof body.sortOrder === "number") updates.sortOrder = body.sortOrder;

  const [row] = await db
    .update(goals)
    .set(updates)
    .where(and(eq(goals.id, id), eq(goals.userId, auth.userId)))
    .returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  // Soft delete via status=abandoned
  const [row] = await db
    .update(goals)
    .set({ status: "abandoned", updatedAt: new Date() })
    .where(and(eq(goals.id, id), eq(goals.userId, auth.userId)))
    .returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
