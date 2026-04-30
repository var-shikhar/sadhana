"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTodayGoals, useToggleTodayGoal } from "@/hooks/useTodayGoals";
import { HabitDot } from "@/components/gurukul/HabitDot";
import { CATEGORY_COLORS } from "@/types";
import { Button } from "@/components/ui/button";

interface TodayGoalsPanelProps {
  className?: string;
}

/**
 * Surfaces today's daily goals + this-week's weekly goals, grouped by
 * category. Tap a daily goal's bead to toggle done. Weekly goals get a
 * "+ Log one" button. By-date goals appear with their progress but no
 * inline log (use the category page for those).
 */
export function TodayGoalsPanel({ className }: TodayGoalsPanelProps) {
  const { goals, loading } = useTodayGoals();
  const toggle = useToggleTodayGoal();

  if (loading) return null;

  if (goals.length === 0) {
    return (
      <div className={cn("rounded border border-gold/30 bg-ivory-deep/50 p-4 text-center", className)}>
        <p className="font-lyric text-base text-ink">
          No goals yet.
        </p>
        <p className="font-lyric-italic text-sm text-earth-deep mt-1">
          Plan your practice — set up a category and one goal.
        </p>
        <Link href="/categories" className="inline-block mt-3">
          <Button size="sm">Open Plan</Button>
        </Link>
      </div>
    );
  }

  // Group by category
  const byCat = new Map<
    string,
    { categoryTitle: string; categoryIcon: string; categoryColor: string; rows: typeof goals }
  >();
  for (const g of goals) {
    if (!byCat.has(g.categoryId)) {
      byCat.set(g.categoryId, {
        categoryTitle: g.categoryTitle,
        categoryIcon: g.categoryIcon,
        categoryColor: g.categoryColor,
        rows: [],
      });
    }
    byCat.get(g.categoryId)!.rows.push(g);
  }

  return (
    <div className={cn("space-y-4", className)}>
      {Array.from(byCat.entries()).map(([catId, group]) => {
        const colorHex =
          CATEGORY_COLORS.find((c) => c.value === group.categoryColor)?.hex ?? "#c46a1f";
        const kept = group.rows.filter((r) => r.isMet).length;
        return (
          <div key={catId} className="space-y-2">
            <Link
              href={`/categories/${catId}`}
              className="flex items-center gap-2 group"
            >
              <span
                aria-hidden
                className="w-7 h-7 rounded-full flex items-center justify-center text-base flex-shrink-0"
                style={{
                  backgroundColor: `${colorHex}1f`,
                  border: `1px solid ${colorHex}`,
                }}
              >
                {group.categoryIcon}
              </span>
              <span className="font-lyric text-base text-ink group-hover:text-saffron transition-colors">
                {group.categoryTitle}
              </span>
              <span className="font-pressure-caps text-[9px] text-earth-mid ml-auto">
                {kept} of {group.rows.length}
              </span>
            </Link>

            <div className="space-y-1.5 pl-1">
              {group.rows.map((g) => (
                <GoalRow
                  key={g.id}
                  goal={g}
                  busy={toggle.isPending}
                  onToggle={(done) =>
                    toggle.mutate({
                      goalId: g.id,
                      categoryId: g.categoryId,
                      shape: g.shape,
                      done,
                    })
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GoalRow({
  goal,
  busy,
  onToggle,
}: {
  goal: ReturnType<typeof useTodayGoals>["goals"][number];
  busy: boolean;
  onToggle: (done: boolean) => void;
}) {
  if (goal.shape === "daily") {
    return (
      <div className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-ivory-deep/50 transition-colors">
        <button
          type="button"
          aria-label={goal.todayDone ? "Mark not done" : "Mark done"}
          onClick={() => onToggle(!goal.todayDone)}
          disabled={busy}
        >
          <HabitDot
            state={goal.todayDone ? "complete" : "pending"}
            size={16}
          />
        </button>
        <span
          className={cn(
            "font-lyric text-sm text-ink flex-1 leading-tight",
            goal.todayDone && "text-earth-mid line-through decoration-earth-mid/30"
          )}
        >
          {goal.title}
        </span>
        {goal.streak !== undefined && goal.streak > 0 && (
          <span className="font-pressure-caps text-[9px] text-saffron">
            {goal.streak}d
          </span>
        )}
      </div>
    );
  }

  if (goal.shape === "weekly") {
    return (
      <div className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-ivory-deep/50 transition-colors">
        <span className="font-pressure text-saffron text-base w-4 text-center">
          {"//"}
        </span>
        <span className="font-lyric text-sm text-ink flex-1 leading-tight">
          {goal.title}
        </span>
        <span className="font-pressure-caps text-[9px] text-earth-mid">
          {goal.weekTotal ?? 0}/{goal.weeklyTarget ?? 0}
        </span>
        {!goal.isMet && (
          <button
            type="button"
            onClick={() => onToggle(true)}
            disabled={busy}
            className="font-pressure-caps text-[9px] text-saffron hover:text-saffron/80"
          >
            +1
          </button>
        )}
      </div>
    );
  }

  // by_date
  return (
    <div className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-ivory-deep/50 transition-colors">
      <span className="font-pressure text-saffron text-base w-4 text-center">
        →
      </span>
      <span className="font-lyric text-sm text-ink flex-1 leading-tight">
        {goal.title}
      </span>
      <span className="font-pressure-caps text-[9px] text-earth-mid">
        {goal.totalSoFar ?? 0}/{goal.totalTarget ?? 0}
      </span>
      {goal.daysRemaining !== undefined && (
        <span className="font-pressure-caps text-[9px] text-earth-mid">
          {goal.daysRemaining}d
        </span>
      )}
    </div>
  );
}
