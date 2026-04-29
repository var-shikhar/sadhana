import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { dailyLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { calculateAndStoreGrowthIndex } from "@/lib/growth/calculator";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  const logs = await db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.userId, auth.userId), eq(dailyLogs.date, date)));

  return NextResponse.json(logs);
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { date, userHabitId, completed, note } = await request.json();

  const existing = await db
    .select()
    .from(dailyLogs)
    .where(
      and(
        eq(dailyLogs.userId, auth.userId),
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
      userId: auth.userId,
      date,
      userHabitId,
      completed,
      note,
    });
  }

  // Auto-recalculate growth index after logging
  await calculateAndStoreGrowthIndex(auth.userId, date);

  return NextResponse.json({ success: true });
}
