"use client";

import { type GrowthScore } from "@/types";
import { cn } from "@/lib/utils";
import {
  format,
  eachDayOfInterval,
  subDays,
  startOfWeek,
} from "date-fns";

interface CalendarHeatmapProps {
  scores: GrowthScore[];
}

function getIntensityClasses(score: number): string {
  if (score === 0) return "bg-ivory-deep";
  if (score < 25) return "bg-parchment";
  if (score < 50) return "bg-gold/60";
  if (score < 75) return "bg-saffron/70";
  return "bg-saffron";
}

export function CalendarHeatmap({ scores }: CalendarHeatmapProps) {
  const today = new Date();
  const start = startOfWeek(subDays(today, 90), { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start, end: today });
  const scoreMap = new Map(scores.map((s) => [s.date, s.dailyScore]));

  const weeks: Array<Array<{ date: Date; score: number }>> = [];
  let currentWeek: Array<{ date: Date; score: number }> = [];

  for (const day of days) {
    const dayOfWeek = day.getDay();
    if (dayOfWeek === 1 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    const dateStr = format(day, "yyyy-MM-dd");
    currentWeek.push({ date: day, score: scoreMap.get(dateStr) || 0 });
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  return (
    <div className="space-y-2">
      <div className="flex gap-[3px] overflow-x-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <div
                key={format(day.date, "yyyy-MM-dd")}
                className={cn(
                  "h-3 w-3 rounded-sm transition-colors border border-gold/20",
                  getIntensityClasses(day.score)
                )}
                title={`${format(day.date, "MMM d")}: ${day.score} pts`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 text-xs text-earth-mid">
        <span>Less</span>
        <div className="h-3 w-3 rounded-sm bg-ivory-deep border border-gold/20" />
        <div className="h-3 w-3 rounded-sm bg-parchment border border-gold/20" />
        <div className="h-3 w-3 rounded-sm bg-gold/60 border border-gold/20" />
        <div className="h-3 w-3 rounded-sm bg-saffron/70 border border-gold/20" />
        <div className="h-3 w-3 rounded-sm bg-saffron border border-gold/20" />
        <span>More</span>
      </div>
    </div>
  );
}
