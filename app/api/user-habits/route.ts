import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { habits, userHabits, profiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";


export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { habits: selectedHabits, completeOnboarding } = body as {
    habits: Array<{ name: string; sankalpa: string | null }>;
    completeOnboarding?: boolean;
  };

  const allPresets = await db
    .select()
    .from(habits)
    .where(eq(habits.isPreset, true));

  for (const selected of selectedHabits) {
    const preset = allPresets.find((p) => p.name === selected.name);
    if (!preset) continue;

    await db
      .insert(userHabits)
      .values({
        userId: auth.userId,
        habitId: preset.id,
        sankalpa: selected.sankalpa,
      })
      .onConflictDoNothing();
  }

  if (completeOnboarding) {
    await db
      .update(profiles)
      .set({ onboardingCompleted: true, updatedAt: new Date() })
      .where(eq(profiles.id, auth.userId));
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const result = await db
    .select({
      userHabit: userHabits,
      habit: habits,
    })
    .from(userHabits)
    .innerJoin(habits, eq(userHabits.habitId, habits.id))
    .where(
      and(
        eq(userHabits.userId, auth.userId),
        eq(habits.isActive, true)
      )
    );

  const formatted = result
    .filter((r) => !r.userHabit.archivedAt)
    .map((r) => ({
      ...r.userHabit,
      habit: r.habit,
    }));

  return NextResponse.json(formatted);
}

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { userHabitId, archive } = await request.json();

  if (archive) {
    await db
      .update(userHabits)
      .set({ archivedAt: new Date() })
      .where(and(eq(userHabits.id, userHabitId), eq(userHabits.userId, auth.userId)));
  }

  return NextResponse.json({ success: true });
}
