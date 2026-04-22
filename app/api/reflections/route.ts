import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { reflections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  const [reflection] = await db
    .select()
    .from(reflections)
    .where(and(eq(reflections.userId, user.id), eq(reflections.date, date)))
    .limit(1);

  return NextResponse.json(reflection || null);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { date, mode, quickTags, quickNote, cbtEvent, cbtThought, cbtFeeling, cbtReframe } = body;

  const existing = await db
    .select()
    .from(reflections)
    .where(and(eq(reflections.userId, user.id), eq(reflections.date, date)))
    .limit(1);

  const data = {
    userId: user.id,
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

  return NextResponse.json({ success: true });
}
