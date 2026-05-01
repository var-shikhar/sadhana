import { db } from "@/lib/db";
import { dailyLogs, userHabits, reflections, growthScores } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { format, subDays } from "date-fns";

interface DailyScoreBreakdown {
  completionPts: number;
  reflectionPts: number;
  consistencyPts: number;
  dailyScore: number;
}

export async function calculateDailyScore(
  userId: string,
  date: string
): Promise<DailyScoreBreakdown> {
  const activeHabits = await db
    .select()
    .from(userHabits)
    .where(eq(userHabits.userId, userId));

  const nonArchived = activeHabits.filter((h) => !h.archivedAt);
  const totalHabits = nonArchived.length;

  const logs = await db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.userId, userId), eq(dailyLogs.date, date)));

  const completedCount = logs.filter((l) => l.completed).length;
  const completionPts =
    totalHabits > 0 ? (completedCount / totalHabits) * 50 : 0;

  const [reflection] = await db
    .select()
    .from(reflections)
    .where(and(eq(reflections.userId, userId), eq(reflections.date, date)))
    .limit(1);

  let reflectionPts = 0;
  if (reflection) {
    const isChipFlow =
      Array.isArray(reflection.goodChips) ||
      Array.isArray(reflection.badChips) ||
      Array.isArray(reflection.neutralChips);

    if (isChipFlow) {
      // Base 15 for any chip-flow submission.
      reflectionPts = 15;
      const desc = reflection.chipDescriptions as Record<string, string> | null;
      const hasDescriptions =
        !!desc && Object.values(desc).some((v) => v && v.trim().length > 0);
      if (hasDescriptions) reflectionPts += 5;
      if (reflection.daySummary && reflection.daySummary.trim().length > 0) {
        reflectionPts += 5;
      }
    } else if (reflection.mode === "quick") {
      reflectionPts = 15;
    } else if (reflection.mode === "deep") {
      reflectionPts = reflection.aiResponse ? 30 : 25;
    }
  }

  const sevenDaysAgo = format(subDays(new Date(date), 6), "yyyy-MM-dd");
  const weekLogs = await db
    .select()
    .from(dailyLogs)
    .where(
      and(
        eq(dailyLogs.userId, userId),
        gte(dailyLogs.date, sevenDaysAgo),
        lte(dailyLogs.date, date)
      )
    );

  const dailyRatios: Record<string, number> = {};
  for (const log of weekLogs) {
    if (!dailyRatios[log.date]) dailyRatios[log.date] = 0;
    if (log.completed) dailyRatios[log.date]++;
  }

  const ratios = Object.values(dailyRatios).map((completed) =>
    totalHabits > 0 ? completed / totalHabits : 0
  );
  const avgCompletion =
    ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / 7 : 0;
  const consistencyPts = avgCompletion * 20;

  const dailyScore = Math.min(
    100,
    Math.round((completionPts + reflectionPts + consistencyPts) * 100) / 100
  );

  return {
    completionPts: Math.round(completionPts * 100) / 100,
    reflectionPts,
    consistencyPts: Math.round(consistencyPts * 100) / 100,
    dailyScore,
  };
}

export async function calculateAndStoreGrowthIndex(
  userId: string,
  date: string
): Promise<{ dailyScore: number; indexValue: number }> {
  const breakdown = await calculateDailyScore(userId, date);

  const yesterday = format(subDays(new Date(date), 1), "yyyy-MM-dd");
  const [prevScore] = await db
    .select()
    .from(growthScores)
    .where(
      and(eq(growthScores.userId, userId), eq(growthScores.date, yesterday))
    )
    .limit(1);

  const prevIndex = prevScore ? Number(prevScore.indexValue) : 100;

  const indexValue =
    breakdown.dailyScore > 0
      ? prevIndex * (1 + breakdown.dailyScore / 10000)
      : prevIndex;

  const roundedIndex = Math.round(indexValue * 10000) / 10000;

  const existing = await db
    .select()
    .from(growthScores)
    .where(and(eq(growthScores.userId, userId), eq(growthScores.date, date)))
    .limit(1);

  const values = {
    userId,
    date,
    completionPts: String(breakdown.completionPts),
    reflectionPts: String(breakdown.reflectionPts),
    consistencyPts: String(breakdown.consistencyPts),
    dailyScore: String(breakdown.dailyScore),
    indexValue: String(roundedIndex),
  };

  if (existing.length > 0) {
    await db
      .update(growthScores)
      .set(values)
      .where(eq(growthScores.id, existing[0].id));
  } else {
    await db.insert(growthScores).values(values);
  }

  return { dailyScore: breakdown.dailyScore, indexValue: roundedIndex };
}
