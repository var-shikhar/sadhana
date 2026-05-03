import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { reflectionChips } from "@/lib/db/schema";
import { eq, asc, desc, max } from "drizzle-orm";
import type { ReflectionChip, ChipCategory } from "@/types";

const VALID_CATEGORIES: ChipCategory[] = ["good", "bad", "neutral"];

/**
 * Normalize an act name for duplicate detection. Treats trivial variations
 * (case, surrounding whitespace, trailing punctuation, multiple internal
 * spaces) as the same act so we don't end up with near-dupes like
 * "shower at 7am" + "shower at 7am.".
 */
function normalizeActName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s.,!?;:'"-]+$/, "")
    .replace(/\s+/g, " ");
}

function dbToType(row: typeof reflectionChips.$inferSelect): ReflectionChip {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    category: row.category,
    groupId: row.groupId ?? null,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    useCount: row.useCount,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  // Always return every chip the user owns — including paused ones. The
  // settings page is the master library and needs to see all of them; the
  // reflect page filters client-side by chip.isActive.
  const rows = await db
    .select()
    .from(reflectionChips)
    .where(eq(reflectionChips.userId, auth.userId))
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
    /** Optional group assignment. null/undefined → All / Global. */
    groupId?: string | null;
    /** Optional initial active state. Defaults to true. */
    isActive?: boolean;
  };

  const name = body.name?.trim().slice(0, 60);
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const groupId = body.groupId ?? null;
  const isActive = body.isActive ?? true;

  // Reject near-duplicates within the destination group. We pull every chip
  // in the same bucket and compare normalized names — case + trailing
  // punctuation variants are treated as duplicates.
  const proposedNorm = normalizeActName(name);
  const peers = await db
    .select()
    .from(reflectionChips)
    .where(eq(reflectionChips.userId, auth.userId));

  const dup = peers.find(
    (p) =>
      (p.groupId ?? null) === groupId &&
      normalizeActName(p.name) === proposedNorm
  );
  if (dup) {
    return NextResponse.json(
      {
        error: `"${dup.name}" already exists in ${
          groupId ? "this group" : "All / Global"
        }.`,
      },
      { status: 409 }
    );
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
      groupId,
      isActive,
      sortOrder: (maxOrder?.m ?? 0) + 1,
    })
    .returning();

  return NextResponse.json(dbToType(row));
}
