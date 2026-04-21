"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type PermaPillar, PERMA_LABELS, PRESET_HABITS } from "@/types";

interface HabitPickerProps {
  pillars: PermaPillar[];
  selected: string[];
  onToggle: (habitName: string) => void;
}

export function HabitPicker({ pillars, selected, onToggle }: HabitPickerProps) {
  const filteredHabits = PRESET_HABITS.filter((h) =>
    pillars.includes(h.permaPillar)
  );

  const grouped = pillars.map((pillar) => ({
    pillar,
    label: PERMA_LABELS[pillar],
    habits: filteredHabits.filter((h) => h.permaPillar === pillar),
  }));

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <div key={group.pillar} className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            {group.pillar} — {group.label}
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {group.habits.map((habit) => {
              const isSelected = selected.includes(habit.name);
              return (
                <Card
                  key={habit.name}
                  className={cn(
                    "cursor-pointer px-4 py-3 transition-all",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-muted-foreground"
                  )}
                  onClick={() => onToggle(habit.name)}
                >
                  <span className={cn(isSelected && "font-medium")}>
                    {habit.name}
                  </span>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
