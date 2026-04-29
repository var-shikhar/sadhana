import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { reflections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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
  const { date, mode, quickTags, quickNote, cbtEvent, cbtThought, cbtFeeling, cbtReframe } = body;

  const existing = await db
    .select()
    .from(reflections)
    .where(and(eq(reflections.userId, auth.userId), eq(reflections.date, date)))
    .limit(1);

  const data = {
    userId: auth.userId,
    date,
    mode,
    quickTags: mode === "quick" ? quickTags : null,
    quickNote: mode === "quick" ? quickNote : null,
    cbtEvent: mode === "deep" ? cbtEvent : null,
    cbtThought: mode === "deep" ? cbtThought : null,
    cbtFeeling: mode === "deep" ? cbtFeeling : null,
    cbtReframe: mode === "deep" ? cbtReframe : null,
  };

  if (existing.length > 0) {
    await db
      .update(reflections)
      .set(data)
      .where(eq(reflections.id, existing[0].id));
  } else {
    await db.insert(reflections).values(data);
  }

  // Auto-recalculate growth index after reflection
  await calculateAndStoreGrowthIndex(auth.userId, date);

  return NextResponse.json({ success: true });
}
