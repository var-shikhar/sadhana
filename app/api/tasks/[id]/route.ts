import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { Task, TaskStatus } from "@/types";

function dbToType(row: typeof tasks.$inferSelect): Task {
  return {
    id: row.id,
    userId: row.userId,
    goalId: row.goalId,
    title: row.title,
    description: row.description,
    important: row.important,
    urgent: row.urgent,
    status: row.status,
    completionNote: row.completionNote,
    completedAt: row.completedAt?.toISOString() ?? null,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

/** PATCH /api/tasks/[id] — update title, description, flags, status, note. */
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
    important: boolean;
    urgent: boolean;
    status: TaskStatus;
    completionNote: string | null;
    sortOrder: number;
  }>;

  // Read the existing row for status-transition logic.
  const [before] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, auth.userId)))
    .limit(1);
  if (!before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title === "string")
    updates.title = body.title.trim().slice(0, 120);
  if (body.description !== undefined)
    updates.description = body.description?.trim().slice(0, 600) || null;
  if (typeof body.important === "boolean") updates.important = body.important;
  if (typeof body.urgent === "boolean") updates.urgent = body.urgent;
  if (typeof body.sortOrder === "number") updates.sortOrder = body.sortOrder;
  if (body.completionNote !== undefined) {
    updates.completionNote =
      body.completionNote?.trim().slice(0, 600) || null;
  }
  if (typeof body.status === "string") {
    updates.status = body.status;
    // Stamp/clear completedAt on transition.
    if (body.status === "done" && before.status !== "done") {
      updates.completedAt = new Date();
    } else if (body.status === "open" && before.status === "done") {
      updates.completedAt = null;
      // Preserve completion_note across an un-check, per spec.
    }
  }

  const [row] = await db
    .update(tasks)
    .set(updates)
    .where(and(eq(tasks.id, id), eq(tasks.userId, auth.userId)))
    .returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(dbToType(row));
}

/** DELETE /api/tasks/[id] — hard delete. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const [row] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, auth.userId)))
    .returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
