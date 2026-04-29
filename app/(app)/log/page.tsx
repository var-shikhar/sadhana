"use client";

import { useHabits } from "@/hooks/useHabits";
import { HabitCard } from "@/components/habits/HabitCard";
import { Separator } from "@/components/ui/separator";
import { type PermaPillar, PERMA_LABELS } from "@/types";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { GoldRule } from "@/components/gurukul/GoldRule";
import { KolamGrid } from "@/components/ornament/KolamGrid";

export default function LogPage() {
  const { userHabits, todayLogs, loading, toggleHabit } = useHabits();

  if (loading) {
    return (
      <div className="space-y-4 py-2">
        <p className="font-lyric-italic text-earth-mid">Loading your habits...</p>
      </div>
    );
  }

  const completedCount = todayLogs.filter((l) => l.completed).length;
  const totalCount = userHabits.length;

  const permaHabits = userHabits.filter((h) => !h.habit.isAvoid);
  const avoidHabits = userHabits.filter((h) => h.habit.isAvoid);

  const grouped = Object.entries(
    permaHabits.reduce(
      (acc, h) => {
        const pillar = (h.habit.permaPillar as PermaPillar) || "P";
        if (!acc[pillar]) acc[pillar] = [];
        acc[pillar].push(h);
        return acc;
      },
      {} as Record<PermaPillar, typeof permaHabits>
    )
  );

  function isCompleted(userHabitId: string): boolean {
    return todayLogs.some((l) => l.userHabitId === userHabitId && l.completed);
  }

  return (
    <div className="space-y-6 py-2 relative">
      <KolamGrid className="absolute -top-4 right-0 pointer-events-none" opacity={0.10} />

      <header className="text-center space-y-2 relative">
        <LabelTiny>Today&apos;s offerings</LabelTiny>
        <h1 className="font-lyric text-3xl text-ink">Walk gently through the list.</h1>
        <p className="font-lyric-italic text-sm text-earth-deep">
          {completedCount} of {totalCount} made
        </p>
      </header>

      <GoldRule width="section" />

      {grouped.map(([pillar, habits]) => (
        <div key={pillar} className="space-y-2">
          <LabelTiny className="block">
            {PERMA_LABELS[pillar as PermaPillar]}
          </LabelTiny>
          <div className="space-y-2">
            {habits.map((h) => (
              <HabitCard
                key={h.id}
                name={h.habit.name}
                sankalpa={h.sankalpa}
                isAvoid={false}
                completed={isCompleted(h.id)}
                onToggle={(completed) => toggleHabit(h.id, completed)}
              />
            ))}
          </div>
        </div>
      ))}

      {avoidHabits.length > 0 && (
        <>
          <Separator className="bg-gold/30" />
          <div className="space-y-2">
            <LabelTiny className="block">Habits to Avoid</LabelTiny>
            <div className="space-y-2">
              {avoidHabits.map((h) => (
                <HabitCard
                  key={h.id}
                  name={h.habit.name}
                  sankalpa={h.sankalpa}
                  isAvoid={true}
                  completed={isCompleted(h.id)}
                  onToggle={(completed) => toggleHabit(h.id, completed)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
