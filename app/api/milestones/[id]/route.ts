import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { milestones } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { dbMilestoneToType } from "@/lib/goals/milestones";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const body = (await request.json()) as Partial<{
    title: string;
    description: string | null;
    targetValue: number | null;
    orderIndex: number;
    /** Pass `true` to mark complete; `false` to un-complete. */
    completed: boolean;
  }>;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title === "string")
    updates.title = body.title.trim().slice(0, 120);
  if (body.description !== undefined)
    updates.description = body.description?.trim().slice(0, 400) || null;
  if (body.targetValue !== undefined) updates.targetValue = body.targetValue;
  if (typeof body.orderIndex === "number")
    updates.orderIndex = body.orderIndex;
  if (typeof body.completed === "boolean") {
    updates.completedAt = body.completed ? new Date() : null;
  }

  const [row] = await db
    .update(milestones)
    .set(updates)
    .where(and(eq(milestones.id, id), eq(milestones.userId, auth.userId)))
    .returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(dbMilestoneToType(row));
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const result = await db
    .delete(milestones)
    .where(and(eq(milestones.id, id), eq(milestones.userId, auth.userId)))
    .returning({ id: milestones.id });
  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
