import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { growthScores } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { calculateAndStoreGrowthIndex } from "@/lib/growth/calculator";
import { todayDate } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  if (from && to) {
    const scores = await db
      .select()
      .from(growthScores)
      .where(
        and(
          eq(growthScores.userId, auth.userId),
          gte(growthScores.date, from),
          lte(growthScores.date, to)
        )
      );
    return NextResponse.json(scores);
  }

  const [latest] = await db
    .select()
    .from(growthScores)
    .where(eq(growthScores.userId, auth.userId))
    .orderBy(desc(growthScores.date))
    .limit(1);

  return NextResponse.json(latest || { indexValue: "100", dailyScore: "0" });
}

export async function POST() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const result = await calculateAndStoreGrowthIndex(auth.userId, todayDate());
  return NextResponse.json(result);
}
