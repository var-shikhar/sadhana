"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GOAL_SHAPE_DEFS, type GoalShape } from "@/types";

export interface GoalSuggestion {
  title: string;
  description: string;
  shape: GoalShape;
  weeklyTarget?: number;
  totalTarget?: number;
  deadlineHint?: string;
}

interface GoalSuggestionListProps {
  suggestions: GoalSuggestion[];
  onAdopt: (s: GoalSuggestion) => void;
  adoptedTitles?: Set<string>;
  busy?: boolean;
  className?: string;
}

const SHAPE_CHIP: Record<GoalShape, string> = {
  daily: "Daily",
  weekly: "Weekly",
  by_date: "By date",
};

export function GoalSuggestionList({
  suggestions,
  onAdopt,
  adoptedTitles,
  busy,
  className,
}: GoalSuggestionListProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {suggestions.map((s) => {
        const adopted = adoptedTitles?.has(s.title.toLowerCase()) ?? false;
        const def = GOAL_SHAPE_DEFS.find((d) => d.shape === s.shape);
        return (
          <Card
            key={s.title}
            className={cn(
              "flex flex-row items-center gap-3 px-4 py-3 bg-ivory border-gold/30 transition-colors",
              !adopted && !busy && "hover:border-saffron/60 cursor-pointer",
              adopted && "opacity-50"
            )}
            onClick={() => {
              if (!adopted && !busy) onAdopt(s);
            }}
          >
            <span
              aria-hidden
              className="font-pressure text-saffron text-lg w-7 text-center flex-shrink-0"
              title={def?.label}
            >
              {s.shape === "daily" ? "·" : s.shape === "weekly" ? "//" : "→"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-lyric text-base text-ink leading-tight">
                {s.title}
                {s.shape === "weekly" && s.weeklyTarget && (
                  <span className="text-saffron text-sm ml-1">
                    · {s.weeklyTarget}×/wk
                  </span>
                )}
                {s.shape === "by_date" && s.totalTarget && (
                  <span className="text-saffron text-sm ml-1">
                    · {s.totalTarget} {s.deadlineHint ?? ""}
                  </span>
                )}
              </p>
              <p className="font-lyric-italic text-xs text-earth-deep mt-0.5">
                {s.description}
              </p>
              <span className="text-[9px] font-pressure-caps tracking-[2px] text-earth-mid">
                {SHAPE_CHIP[s.shape]}
              </span>
            </div>
            {adopted ? (
              <span className="font-pressure-caps text-[8px] text-earth-mid">
                Added
              </span>
            ) : (
              <span aria-hidden className="text-saffron text-xl leading-none">
                +
              </span>
            )}
          </Card>
        );
      })}
    </div>
  );
}
