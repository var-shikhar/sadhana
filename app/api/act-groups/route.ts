import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { actGroups } from "@/lib/db/schema";
import { eq, asc, max } from "drizzle-orm";
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

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const rows = await db
    .select()
    .from(actGroups)
    .where(eq(actGroups.userId, auth.userId))
    .orderBy(asc(actGroups.sortOrder), asc(actGroups.name));

  return NextResponse.json(rows.map(dbToType));
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as { name: string };

  const name = body.name?.trim().slice(0, 60);
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const [maxOrder] = await db
    .select({ m: max(actGroups.sortOrder) })
    .from(actGroups)
    .where(eq(actGroups.userId, auth.userId));

  try {
    const [row] = await db
      .insert(actGroups)
      .values({
        userId: auth.userId,
        name,
        sortOrder: (maxOrder?.m ?? 0) + 1,
      })
      .returning();
    return NextResponse.json(dbToType(row));
  } catch (err) {
    // Unique violation — name already exists
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
