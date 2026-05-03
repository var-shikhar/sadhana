import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { actGroups } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { ActGroup } from "@/types";

function dbToType(row: typeof actGroups.$inferSelect): ActGroup {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const body = (await request.json()) as Partial<{
    name: string;
    isActive: boolean;
    sortOrder: number;
  }>;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.name === "string") {
    const trimmed = body.name.trim().slice(0, 60);
    if (!trimmed) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    updates.name = trimmed;
  }
  if (typeof body.isActive === "boolean") updates.isActive = body.isActive;
  if (typeof body.sortOrder === "number") updates.sortOrder = body.sortOrder;

  try {
    const [row] = await db
      .update(actGroups)
      .set(updates)
      .where(and(eq(actGroups.id, id), eq(actGroups.userId, auth.userId)))
      .returning();

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(dbToType(row));
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("act_groups_user_name_unique")) {
      return NextResponse.json(
        { error: "A group with that name already exists" },
        { status: 409 }
      );
    }
    throw err;
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  // Hard delete — chips referencing this group have ON DELETE SET NULL,
  // so they fall back to the implicit "All / Global" bucket automatically.
  const [row] = await db
    .delete(actGroups)
    .where(and(eq(actGroups.id, id), eq(actGroups.userId, auth.userId)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
