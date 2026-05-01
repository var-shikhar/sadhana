import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { reflections, reflectionChips } from "@/lib/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { calculateAndStoreGrowthIndex } from "@/lib/growth/calculator";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const date = request.nextUrl.searchParams.get("date");

  if (!date) {
    // No date → return all reflections for this user (used by archive)
    const all = await db
      .select()
      .from(reflections)
      .where(eq(reflections.userId, auth.userId))
      .orderBy(reflections.date);
    return NextResponse.json(all);
  }

  const [reflection] = await db
    .select()
    .from(reflections)
    .where(and(eq(reflections.userId, auth.userId), eq(reflections.date, date)))
    .limit(1);

  return NextResponse.json(reflection || null);
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const {
    date,
    mode,
    // legacy quick/deep payload (kept for archive-edits, if ever needed)
    quickTags,
    quickNote,
    cbtEvent,
    cbtThought,
    cbtFeeling,
    cbtReframe,
    // chip-bucket flow
    goodChips,
    badChips,
    neutralChips,
    chipDescriptions,
    daySummary,
  } = body;

  const existing = await db
    .select()
    .from(reflections)
    .where(and(eq(reflections.userId, auth.userId), eq(reflections.date, date)))
    .limit(1);

  const isChipFlow =
    Array.isArray(goodChips) ||
    Array.isArray(badChips) ||
    Array.isArray(neutralChips);

  const data = {
    userId: auth.userId,
    date,
    mode,
    quickTags: !isChipFlow && mode === "quick" ? quickTags ?? null : null,
    quickNote: !isChipFlow && mode === "quick" ? quickNote ?? null : null,
    cbtEvent: mode === "deep" ? cbtEvent ?? null : null,
    cbtThought: mode === "deep" ? cbtThought ?? null : null,
    cbtFeeling: mode === "deep" ? cbtFeeling ?? null : null,
    cbtReframe: mode === "deep" ? cbtReframe ?? null : null,
    goodChips: isChipFlow ? sanitizeChipList(goodChips) : null,
    badChips: isChipFlow ? sanitizeChipList(badChips) : null,
    neutralChips: isChipFlow ? sanitizeChipList(neutralChips) : null,
    chipDescriptions:
      isChipFlow && chipDescriptions && typeof chipDescriptions === "object"
        ? sanitizeDescriptions(chipDescriptions as Record<string, unknown>)
        : null,
    daySummary:
      isChipFlow && typeof daySummary === "string"
        ? daySummary.trim().slice(0, 1000) || null
        : null,
  };

  if (existing.length > 0) {
    await db
      .update(reflections)
      .set(data)
      .where(eq(reflections.id, existing[0].id));
  } else {
    await db.insert(reflections).values(data);
  }

  // Bump usage stats on every chip the user selected today, so the chip
  // library can sort by recency / frequency next time. We don't await this
  // before responding — the reflection is what matters; stats can lag.
  if (isChipFlow) {
    const allSelected = [
      ...(data.goodChips ?? []),
      ...(data.badChips ?? []),
      ...(data.neutralChips ?? []),
    ];
    if (allSelected.length > 0) {
      await db
        .update(reflectionChips)
        .set({
          lastUsedAt: new Date(),
          useCount: sql`${reflectionChips.useCount} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(reflectionChips.userId, auth.userId),
            inArray(reflectionChips.name, allSelected)
          )
        );
    }
  }

  // Auto-recalculate growth index after reflection
  await calculateAndStoreGrowthIndex(auth.userId, date);

  return NextResponse.json({ success: true });
}

function sanitizeChipList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim().slice(0, 60))
        .filter((v) => v.length > 0)
    )
  );
}

function sanitizeDescriptions(
  value: Record<string, unknown>
): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "string") {
      const trimmed = raw.trim().slice(0, 600);
      if (trimmed) out[key.slice(0, 60)] = trimmed;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}
