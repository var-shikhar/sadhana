import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { reflectionChips } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { ChipCategory, ReflectionChip } from "@/types";

const VALID_CATEGORIES: ChipCategory[] = ["good", "bad", "neutral"];

function dbToType(row: typeof reflectionChips.$inferSelect): ReflectionChip {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    category: row.category,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    useCount: row.useCount,
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
    category: ChipCategory;
    sortOrder: number;
    isActive: boolean;
  }>;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.name === "string") {
    const trimmed = body.name.trim().slice(0, 60);
    if (!trimmed) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    updates.name = trimmed;
  }
  if (typeof body.category === "string") {
    if (!VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    updates.category = body.category;
  }
  if (typeof body.sortOrder === "number") updates.sortOrder = body.sortOrder;
  if (typeof body.isActive === "boolean") updates.isActive = body.isActive;

  const [row] = await db
    .update(reflectionChips)
    .set(updates)
    .where(and(eq(reflectionChips.id, id), eq(reflectionChips.userId, auth.userId)))
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

  // Soft delete — old reflections still reference chips by name (in the
  // good_chips/bad_chips/neutral_chips arrays), so we keep the row to
  // preserve history but flip isActive off.
  const [row] = await db
    .update(reflectionChips)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(reflectionChips.id, id), eq(reflectionChips.userId, auth.userId)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
