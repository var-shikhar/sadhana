"use client";

import { cn } from "@/lib/utils";
import { GOAL_SHAPE_DEFS, type GoalShape } from "@/types";

interface GoalShapePickerProps {
  value: GoalShape | null;
  onChange: (shape: GoalShape) => void;
  className?: string;
}

const ICON: Record<GoalShape, string> = {
  daily: "·",
  weekly: "//",
  by_date: "→",
};

export function GoalShapePicker({ value, onChange, className }: GoalShapePickerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {GOAL_SHAPE_DEFS.map((def) => {
        const active = value === def.shape;
        return (
          <button
            type="button"
            key={def.shape}
            onClick={() => onChange(def.shape)}
            aria-pressed={active}
            className={cn(
              "w-full text-left p-3 rounded border bg-ivory transition-all flex items-start gap-3",
              active
                ? "border-saffron bg-saffron/10"
                : "border-gold/40 hover:border-saffron/60"
            )}
          >
            <span
              className={cn(
                "font-pressure text-2xl leading-none mt-0.5 w-6 text-center",
                active ? "text-saffron" : "text-earth-mid"
              )}
            >
              {ICON[def.shape]}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-lyric text-base text-ink">{def.label}</div>
              <div className="font-lyric-italic text-xs text-earth-deep mt-0.5">
                {def.description}
              </div>
              <div className="text-[11px] text-earth-mid mt-1">
                <span className="font-pressure-caps text-[8px] tracking-[2px]">e.g.</span>{" "}
                {def.example}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
