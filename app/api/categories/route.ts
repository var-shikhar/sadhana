import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { eq, and, asc, desc, max } from "drizzle-orm";
import type { Category, CategoryColor } from "@/types";

function dbToType(row: typeof categories.$inferSelect): Category {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description,
    color: row.color,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const includeArchived = url.searchParams.get("includeArchived") === "true";

  const where = includeArchived
    ? eq(categories.userId, auth.userId)
    : and(eq(categories.userId, auth.userId), eq(categories.isActive, true));

  const rows = await db
    .select()
    .from(categories)
    .where(where)
    .orderBy(asc(categories.sortOrder), desc(categories.createdAt));

  return NextResponse.json(rows.map(dbToType));
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    title: string;
    description?: string | null;
    color?: CategoryColor;
  };

  if (!body.title?.trim()) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 }
    );
  }

  const [maxOrder] = await db
    .select({ m: max(categories.sortOrder) })
    .from(categories)
    .where(eq(categories.userId, auth.userId));

  const [row] = await db
    .insert(categories)
    .values({
      userId: auth.userId,
      title: body.title.trim().slice(0, 60),
      description: body.description?.trim().slice(0, 240) || null,
      color: body.color || "saffron",
      sortOrder: (maxOrder?.m ?? 0) + 1,
    })
    .returning();

  return NextResponse.json(dbToType(row));
}
