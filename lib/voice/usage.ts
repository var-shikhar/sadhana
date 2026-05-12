import { db } from "@/lib/db";
import { voiceSessionUsage } from "@/lib/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { MAX_CALL_SECONDS, MAX_DAILY_SECONDS } from "./constants";

// Re-export so server-side callers that already import from this file keep
// working. New client-side callers should import directly from "./constants".
export { MAX_CALL_SECONDS, MAX_DAILY_SECONDS };

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

/** Sum of duration_sec for this user since 00:00 UTC today. */
export async function getTodaySecondsUsed(userId: string): Promise<number> {
  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${voiceSessionUsage.durationSec}), 0)`,
    })
    .from(voiceSessionUsage)
    .where(
      and(
        eq(voiceSessionUsage.userId, userId),
        gte(voiceSessionUsage.startedAt, startOfTodayUtc())
      )
    );
  // Postgres returns the SUM as a numeric/text in some drivers; coerce.
  return Number(result[0]?.total ?? 0);
}

interface InsertSessionRowArgs {
  callId: string;
  userId: string;
  personaId: string;
  language: string;
}

/** Insert a row at session-mint time. duration_sec stays 0 until /end. */
export async function insertSessionRow(args: InsertSessionRowArgs) {
  await db.insert(voiceSessionUsage).values({
    callId: args.callId,
    userId: args.userId,
    personaId: args.personaId,
    language: args.language,
  });
}

interface FinalizeSessionRowArgs {
  callId: string;
  userId: string;
  durationSec: number;
  brokeCharacter: boolean;
}

/** Update a row at /end time, capping durationSec at MAX_CALL_SECONDS. */
export async function finalizeSessionRow(args: FinalizeSessionRowArgs) {
  const cappedDuration = Math.min(
    Math.max(0, Math.floor(args.durationSec)),
    MAX_CALL_SECONDS
  );
  await db
    .update(voiceSessionUsage)
    .set({
      endedAt: new Date(),
      durationSec: cappedDuration,
      brokeCharacter: args.brokeCharacter,
    })
    .where(
      and(
        eq(voiceSessionUsage.callId, args.callId),
        eq(voiceSessionUsage.userId, args.userId)
      )
    );
}

/** Verify the call_id belongs to this user — used by the tool endpoint
 *  to prevent cross-user callId guessing. */
export async function callBelongsToUser(
  callId: string,
  userId: string
): Promise<boolean> {
  const rows = await db
    .select({ id: voiceSessionUsage.id })
    .from(voiceSessionUsage)
    .where(
      and(
        eq(voiceSessionUsage.callId, callId),
        eq(voiceSessionUsage.userId, userId)
      )
    )
    .limit(1);
  return rows.length > 0;
}
