"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GoalWithProgress } from "@/types";
import { HabitDot } from "@/components/gurukul/HabitDot";

interface GoalCardProps {
  goal: GoalWithProgress;
  onToggleToday?: (next: boolean) => void;
  onIncrement?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  className?: string;
  busy?: boolean;
}

export function GoalCard({
  goal,
  onToggleToday,
  onIncrement,
  onEdit,
  onArchive,
  className,
  busy,
}: GoalCardProps) {
  return (
    <Card
      className={cn(
        "flex flex-col gap-3 p-4 bg-ivory-deep border-gold/30",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {goal.shape === "daily" ? (
          <button
            type="button"
            aria-label={goal.progress.todayDone ? "Mark not done" : "Mark done"}
            onClick={() => onToggleToday?.(!goal.progress.todayDone)}
            disabled={busy}
            className="mt-0.5"
          >
            <HabitDot
              state={goal.progress.todayDone ? "complete" : "pending"}
              size={20}
            />
          </button>
        ) : (
          <span aria-hidden className="mt-1 font-pressure text-saffron text-lg">
            {goal.shape === "weekly" ? "//" : "→"}
          </span>
        )}

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "font-lyric text-base text-ink leading-tight",
              goal.shape === "daily" &&
                goal.progress.todayDone &&
                "text-earth-mid line-through decoration-earth-mid/40"
            )}
          >
            {goal.title}
          </p>
          {goal.description && (
            <p className="font-lyric-italic text-xs text-earth-deep mt-0.5">
              {goal.description}
            </p>
          )}
          {goal.source === "suggestion" && (
            <span className="inline-block mt-1 text-[9px] font-pressure-caps tracking-[2px] text-saffron/80">
              Suggested
            </span>
          )}
        </div>
      </div>

      {/* Progress strip */}
      <div className="space-y-1.5">
        {goal.shape === "daily" && (
          <p className="text-[11px] text-earth-mid">
            <span className="font-pressure-caps text-[9px] text-saffron tracking-[2px]">
              Streak
            </span>{" "}
            {goal.progress.streak ?? 0}{" "}
            {goal.progress.streak === 1 ? "day" : "days"}
          </p>
        )}

        {goal.shape === "weekly" && goal.weeklyTarget && (
          <>
            <div className="flex items-center justify-between text-[11px] text-earth-mid">
              <span>
                {goal.progress.weekTotal ?? 0} of {goal.weeklyTarget} this week
              </span>
              {goal.progress.isMet && (
                <span className="font-pressure-caps text-[9px] text-saffron">
                  Kept
                </span>
              )}
            </div>
            <ProgressBar
              value={goal.progress.weekTotal ?? 0}
              max={goal.weeklyTarget}
            />
            {onIncrement && !goal.progress.isMet && (
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-1"
                onClick={onIncrement}
                disabled={busy}
              >
                + Log one
              </Button>
            )}
          </>
        )}

        {goal.shape === "by_date" && goal.totalTarget && (
          <>
            <div className="flex items-center justify-between text-[11px] text-earth-mid">
              <span>
                {goal.progress.totalSoFar ?? 0} of {goal.totalTarget}
              </span>
              <span>
                {goal.progress.daysRemaining !== undefined
                  ? `${goal.progress.daysRemaining}d left`
                  : ""}
              </span>
            </div>
            <ProgressBar
              value={goal.progress.totalSoFar ?? 0}
              max={goal.totalTarget}
            />
            {onIncrement && !goal.progress.isMet && (
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-1"
                onClick={onIncrement}
                disabled={busy}
              >
                + Log one
              </Button>
            )}
          </>
        )}
      </div>

      {(onEdit || onArchive) && (
        <div className="flex gap-2 pt-1">
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={onEdit}
              disabled={busy}
            >
              Edit
            </Button>
          )}
          {onArchive && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={onArchive}
              disabled={busy}
            >
              Archive
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="h-1.5 rounded-full bg-ivory border border-gold/30 overflow-hidden">
      <div
        className="h-full bg-saffron transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
