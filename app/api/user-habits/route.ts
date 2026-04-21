import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { habits, userHabits, profiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
        userId: user.id,
        habitId: preset.id,
        sankalpa: selected.sankalpa,
      })
      .onConflictDoNothing();
  }

  if (completeOnboarding) {
    await db
      .update(profiles)
      .set({ onboardingCompleted: true, updatedAt: new Date() })
      .where(eq(profiles.id, user.id));
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db
    .select({
      userHabit: userHabits,
      habit: habits,
    })
    .from(userHabits)
    .innerJoin(habits, eq(userHabits.habitId, habits.id))
    .where(
      and(
        eq(userHabits.userId, user.id),
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
