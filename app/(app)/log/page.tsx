"use client";

import { useHabits } from "@/hooks/useHabits";
import { HabitCard } from "@/components/habits/HabitCard";
import { Separator } from "@/components/ui/separator";
import { type PermaPillar, PERMA_LABELS } from "@/types";

export default function LogPage() {
  const { userHabits, todayLogs, loading, toggleHabit } = useHabits();

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Daily Log</h1>
        <p className="text-muted-foreground">Loading your habits...</p>
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
    return todayLogs.some(
      (l) => l.userHabitId === userHabitId && l.completed
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Daily Log</h1>
        <p className="text-sm text-muted-foreground">
          {completedCount} of {totalCount} completed today
        </p>
      </div>

      {grouped.map(([pillar, habits]) => (
        <div key={pillar} className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {PERMA_LABELS[pillar as PermaPillar]}
          </h2>
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
          <Separator />
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Habits to Avoid
            </h2>
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
