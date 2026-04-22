import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { growthScores } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { calculateAndStoreGrowthIndex } from "@/lib/growth/calculator";
import { todayDate } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  if (from && to) {
    const scores = await db
      .select()
      .from(growthScores)
      .where(
        and(
          eq(growthScores.userId, user.id),
          gte(growthScores.date, from),
          lte(growthScores.date, to)
        )
      );
    return NextResponse.json(scores);
  }

  const [latest] = await db
    .select()
    .from(growthScores)
    .where(eq(growthScores.userId, user.id))
    .orderBy(desc(growthScores.date))
    .limit(1);

  return NextResponse.json(latest || { indexValue: "100", dailyScore: "0" });
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await calculateAndStoreGrowthIndex(user.id, todayDate());
  return NextResponse.json(result);
}
