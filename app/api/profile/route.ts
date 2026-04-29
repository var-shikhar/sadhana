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
  const { displayName, timezone, morningReminderTime, eveningReminderTime } =
    body;

  await db
    .update(profiles)
    .set({
      ...(displayName !== undefined && { displayName }),
      ...(timezone !== undefined && { timezone }),
      ...(morningReminderTime !== undefined && { morningReminderTime }),
      ...(eveningReminderTime !== undefined && { eveningReminderTime }),
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
