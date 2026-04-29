"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type PermaPillar, PERMA_LABELS, PRESET_HABITS } from "@/types";
import { HabitDot } from "@/components/gurukul/HabitDot";
import { LabelTiny } from "@/components/gurukul/LabelTiny";

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
          <LabelTiny className="block">
            {group.pillar} — {group.label}
          </LabelTiny>
          <div className="grid grid-cols-1 gap-2">
            {group.habits.map((habit) => {
              const isSelected = selected.includes(habit.name);
              return (
                <Card
                  key={habit.name}
                  className={cn(
                    "cursor-pointer flex flex-row items-center gap-3 px-4 py-3 transition-all bg-ivory-deep border-gold/30",
                    isSelected ? "border-saffron bg-saffron/10" : "hover:border-gold"
                  )}
                  onClick={() => onToggle(habit.name)}
                >
                  <HabitDot state={isSelected ? "complete" : "pending"} />
                  <span className={cn("font-lyric text-base text-ink", isSelected && "font-medium")}>
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
