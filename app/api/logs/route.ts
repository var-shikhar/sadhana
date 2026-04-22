import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { dailyLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { calculateAndStoreGrowthIndex } from "@/lib/growth/calculator";

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

  const logs = await db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.userId, user.id), eq(dailyLogs.date, date)));

  return NextResponse.json(logs);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date, userHabitId, completed, note } = await request.json();

  const existing = await db
    .select()
    .from(dailyLogs)
    .where(
      and(
        eq(dailyLogs.userId, user.id),
        eq(dailyLogs.date, date),
        eq(dailyLogs.userHabitId, userHabitId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(dailyLogs)
      .set({ completed, note, loggedAt: new Date() })
      .where(eq(dailyLogs.id, existing[0].id));
  } else {
    await db.insert(dailyLogs).values({
      userId: user.id,
      date,
      userHabitId,
      completed,
      note,
    });
  }

  // Auto-recalculate growth index after logging
  await calculateAndStoreGrowthIndex(user.id, date);

  return NextResponse.json({ success: true });
}
