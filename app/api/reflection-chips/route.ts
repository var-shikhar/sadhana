import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { reflectionChips } from "@/lib/db/schema";
import { eq, and, asc, desc, max } from "drizzle-orm";
import type { ReflectionChip, ChipCategory } from "@/types";

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

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const includeArchived = url.searchParams.get("includeArchived") === "true";

  const where = includeArchived
    ? eq(reflectionChips.userId, auth.userId)
    : and(eq(reflectionChips.userId, auth.userId), eq(reflectionChips.isActive, true));

  // Order: most-recently-used first, then by use_count desc, then alpha.
  const rows = await db
    .select()
    .from(reflectionChips)
    .where(where)
    .orderBy(
      desc(reflectionChips.lastUsedAt),
      desc(reflectionChips.useCount),
      asc(reflectionChips.name)
    );

  return NextResponse.json(rows.map(dbToType));
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    name: string;
    category: ChipCategory;
  };

  const name = body.name?.trim().slice(0, 60);
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  // If a chip with this name already exists for the user (active or not),
  // reactivate and return it instead of creating a duplicate.
  const [existing] = await db
    .select()
    .from(reflectionChips)
    .where(
      and(eq(reflectionChips.userId, auth.userId), eq(reflectionChips.name, name))
    )
    .limit(1);

  if (existing) {
    const [row] = await db
      .update(reflectionChips)
      .set({
        isActive: true,
        category: body.category,
        updatedAt: new Date(),
      })
      .where(eq(reflectionChips.id, existing.id))
      .returning();
    return NextResponse.json(dbToType(row));
  }

  const [maxOrder] = await db
    .select({ m: max(reflectionChips.sortOrder) })
    .from(reflectionChips)
    .where(eq(reflectionChips.userId, auth.userId));

  const [row] = await db
    .insert(reflectionChips)
    .values({
      userId: auth.userId,
      name,
      category: body.category,
      sortOrder: (maxOrder?.m ?? 0) + 1,
    })
    .returning();

  return NextResponse.json(dbToType(row));
}
