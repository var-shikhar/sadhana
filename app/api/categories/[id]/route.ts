import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { Category, CategoryColor } from "@/types";

function dbToType(row: typeof categories.$inferSelect): Category {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description,
    icon: row.icon,
    color: row.color,
    priority: row.priority,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

function clampPriority(n: number): number {
  if (n < 1) return 1;
  if (n > 5) return 5;
  return Math.round(n);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const [row] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, auth.userId)))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(dbToType(row));
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
    icon: string;
    color: CategoryColor;
    priority: number;
    sortOrder: number;
    isActive: boolean;
  }>;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title === "string")
    updates.title = body.title.trim().slice(0, 60);
  if (body.description !== undefined)
    updates.description = body.description?.trim().slice(0, 240) || null;
  if (typeof body.icon === "string") updates.icon = body.icon;
  if (typeof body.color === "string") updates.color = body.color;
  if (typeof body.priority === "number")
    updates.priority = clampPriority(body.priority);
  if (typeof body.sortOrder === "number") updates.sortOrder = body.sortOrder;
  if (typeof body.isActive === "boolean") updates.isActive = body.isActive;

  const [row] = await db
    .update(categories)
    .set(updates)
    .where(and(eq(categories.id, id), eq(categories.userId, auth.userId)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(dbToType(row));
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  // Soft delete — flip isActive instead of removing the row, so future
  // goals/logs can still reference it for history.
  const [row] = await db
    .update(categories)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.userId, auth.userId)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
