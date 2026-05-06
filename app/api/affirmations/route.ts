import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { affirmations } from "@/lib/db/schema";
import { eq, asc, max } from "drizzle-orm";
import type { Affirmation } from "@/types";

function dbToType(row: typeof affirmations.$inferSelect): Affirmation {
  return {
    id: row.id,
    userId: row.userId,
    text: row.text,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

/** Normalize for duplicate detection — case + whitespace tolerant. */
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const rows = await db
    .select()
    .from(affirmations)
    .where(eq(affirmations.userId, auth.userId))
    .orderBy(asc(affirmations.sortOrder), asc(affirmations.createdAt));

  return NextResponse.json(rows.map(dbToType));
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as { text: string; isActive?: boolean };

  const text = body.text?.trim().slice(0, 280);
  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const proposed = normalize(text);
  const peers = await db
    .select()
    .from(affirmations)
    .where(eq(affirmations.userId, auth.userId));

  const dup = peers.find((p) => normalize(p.text) === proposed);
  if (dup) {
    return NextResponse.json(
      { error: `"${dup.text}" is already in your library.` },
      { status: 409 }
    );
  }

  const [maxOrder] = await db
    .select({ m: max(affirmations.sortOrder) })
    .from(affirmations)
    .where(eq(affirmations.userId, auth.userId));

  const [row] = await db
    .insert(affirmations)
    .values({
      userId: auth.userId,
      text,
      sortOrder: (maxOrder?.m ?? 0) + 1,
      isActive: body.isActive ?? true,
    })
    .returning();

  return NextResponse.json(dbToType(row));
}
