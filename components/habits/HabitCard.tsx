"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { HabitDot } from "@/components/gurukul/HabitDot";

interface HabitCardProps {
  name: string;
  sankalpa: string | null;
  isAvoid: boolean;
  completed: boolean;
  onToggle: (completed: boolean) => void;
}

export function HabitCard({
  name,
  sankalpa,
  isAvoid,
  completed,
  onToggle,
}: HabitCardProps) {
  return (
    <Card
      className={cn(
        "flex flex-row cursor-pointer items-center gap-4 p-4 transition-all bg-ivory-deep border-gold/30",
        completed && "bg-sage/10 border-sage/40"
      )}
      onClick={() => onToggle(!completed)}
    >
      <HabitDot state={completed ? "complete" : "pending"} size={18} />
      <div className="flex-1">
        <p
          className={cn(
            "font-lyric text-lg text-ink leading-tight",
            completed && "text-earth-mid line-through decoration-earth-mid/40"
          )}
        >
          {name}
        </p>
        {sankalpa && (
          <p className="mt-0.5 font-lyric-italic text-xs text-earth-deep">
            {sankalpa}
          </p>
        )}
      </div>
      {isAvoid && (
        <span className="font-pressure-caps text-[10px] text-saffron">Avoid</span>
      )}
    </Card>
  );
}
