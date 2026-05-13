import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, auth.userId))
    .limit(1);
  return NextResponse.json(profile || null);
}

export async function PUT(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const {
    displayName,
    timezone,
    morningReminderTime,
    eveningReminderTime,
    maxActiveQuests,
  } = body;

  // Clamp maxActiveQuests to the DB's allowed 1..3 range so we never send
  // a value the CHECK constraint would reject. The setting UI presents a
  // 1-3 picker, but anything else (typo in a request, stale client) gets
  // pinned to the closest valid value rather than erroring out.
  const clampedMax =
    typeof maxActiveQuests === "number"
      ? Math.max(1, Math.min(3, Math.round(maxActiveQuests)))
      : undefined;

  await db
    .update(profiles)
    .set({
      ...(displayName !== undefined && { displayName }),
      ...(timezone !== undefined && { timezone }),
      ...(morningReminderTime !== undefined && { morningReminderTime }),
      ...(eveningReminderTime !== undefined && { eveningReminderTime }),
      ...(clampedMax !== undefined && { maxActiveQuests: clampedMax }),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, auth.userId));

  const [updated] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, auth.userId))
    .limit(1);
  return NextResponse.json(updated);
}
