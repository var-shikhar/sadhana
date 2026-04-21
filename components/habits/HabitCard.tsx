"use client";

import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

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
        "flex cursor-pointer items-center gap-3 p-4 transition-all",
        completed && "border-sage/30 bg-sage/5"
      )}
      onClick={() => onToggle(!completed)}
    >
      <Checkbox
        checked={completed}
        onCheckedChange={(checked) => onToggle(!!checked)}
        className="h-5 w-5"
      />
      <div className="flex-1">
        <p
          className={cn(
            "font-medium",
            completed && "text-muted-foreground line-through"
          )}
        >
          {isAvoid ? `${name}` : name}
        </p>
        {sankalpa && !completed && (
          <p className="mt-0.5 text-xs text-muted-foreground italic">
            {sankalpa}
          </p>
        )}
      </div>
      {isAvoid && (
        <span className="text-xs font-medium text-amber">Avoid</span>
      )}
    </Card>
  );
}
