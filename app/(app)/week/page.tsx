"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { PressureLabel } from "@/components/gurukul/PressureLabel";
import { GoldRule } from "@/components/gurukul/GoldRule";
import { GuidedExplainer } from "@/components/gurukul/GuidedExplainer";
import { NudgeStack } from "@/components/gurukul/NudgeStack";
import { VastuGrid } from "@/components/ornament/VastuGrid";
import { useWeek } from "@/hooks/useWeek";
import { CATEGORY_COLORS } from "@/types";
import type {
  WeekDay,
  WeekGoalRow,
  WeekDailyGoalRow,
} from "@/lib/week/summary";
import { cn } from "@/lib/utils";

const REVIEW_STORAGE_KEY = "sadhana.weekReview";

export default function WeekPage() {
  const { summary, loading } = useWeek();
  const [reviewKept, setReviewKept] = useState("");
  const [reviewSlipped, setReviewSlipped] = useState("");
  const [reviewIntention, setReviewIntention] = useState("");
  const [reviewSaved, setReviewSaved] = useState(false);

  // Restore any saved review for this week
  useEffect(() => {
    if (!summary) return;
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(REVIEW_STORAGE_KEY);
      if (!raw) return;
      const all = JSON.parse(raw) as Record<
        string,
        { kept: string; slipped: string; intention: string }
      >;
      const saved = all[summary.weekStart];
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setReviewKept(saved.kept || "");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setReviewSlipped(saved.slipped || "");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setReviewIntention(saved.intention || "");
      }
    } catch {
      // ignore
    }
  }, [summary]);

  if (loading || !summary) {
    return <p className="font-lyric-italic text-earth-mid py-6">Loading…</p>;
  }

  function saveReview() {
    if (typeof window === "undefined" || !summary) return;
    const payload = {
      weekStart: summary.weekStart,
      kept: reviewKept,
      slipped: reviewSlipped,
      intention: reviewIntention,
      savedAt: new Date().toISOString(),
    };
    try {
      const raw = window.localStorage.getItem(REVIEW_STORAGE_KEY);
      const existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      existing[summary.weekStart] = payload;
      window.localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(existing));
      setReviewSaved(true);
    } catch {
      // ignore
    }
  }

  const weekRatioPct = Math.round(summary.weekRatio * 100);
  const dailyGoals = summary.goals.filter(
    (g): g is WeekDailyGoalRow => g.shape === "daily"
  );
  const weeklyGoals = summary.goals.filter((g) => g.shape === "weekly");
  const byDateGoals = summary.goals.filter((g) => g.shape === "by_date");

  return (
    <div className="space-y-6 py-2 relative">
      <VastuGrid className="absolute -top-2 right-0 pointer-events-none" opacity={0.08} />

      <header className="text-center space-y-2 relative">
        <LabelTiny>Saptaha · the seven days</LabelTiny>
        <h1 className="font-lyric text-3xl text-ink">This week</h1>
        <p className="font-lyric-italic text-sm text-earth-deep">
          {formatRange(summary.weekStart, summary.weekEnd)}
        </p>
      </header>

      <NudgeStack max={2} />

      <GoldRule width="section" />

      <Card className="bg-ivory-deep border-gold/40">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-baseline justify-between">
            <LabelTiny>Kept this week</LabelTiny>
            <div className="font-lyric text-3xl text-ink">{weekRatioPct}%</div>
          </div>
          <div className="h-1.5 rounded-full bg-ivory border border-gold/30 overflow-hidden">
            <div
              className="h-full bg-saffron transition-all duration-500"
              style={{ width: `${weekRatioPct}%` }}
            />
          </div>
          <p className="font-lyric-italic text-xs text-earth-mid">
            Across all goals scheduled so far this week.
          </p>
        </CardContent>
      </Card>

      <DayHeader days={summary.days} />

      {dailyGoals.length > 0 && (
        <section className="space-y-2">
          <LabelTiny className="block">Daily practice</LabelTiny>
          <div className="space-y-2">
            {dailyGoals.map((g) => (
              <DailyGoalWeekRow key={g.id} goal={g} days={summary.days} />
            ))}
          </div>
        </section>
      )}

      {(weeklyGoals.length > 0 || byDateGoals.length > 0) && (
        <section className="space-y-2">
          <LabelTiny className="block">Other goals</LabelTiny>
          <div className="space-y-2">
            {weeklyGoals.map((g) => (
              <OtherGoalRow key={g.id} goal={g} />
            ))}
            {byDateGoals.map((g) => (
              <OtherGoalRow key={g.id} goal={g} />
            ))}
          </div>
        </section>
      )}

      {summary.goals.length === 0 && (
        <Card className="bg-ivory-deep border-gold/40">
          <CardContent className="p-5 text-center space-y-2">
            <p className="font-lyric text-base text-ink">
              Nothing planned for this week yet.
            </p>
            <p className="font-lyric-italic text-sm text-earth-deep">
              Set up a category and a goal to begin.
            </p>
            <Link href="/categories" className="inline-block mt-2">
              <Button>Open Plan</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <GoldRule width="section" />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <LabelTiny className="block">
            {summary.isSunday ? "Sunday review" : "End-of-week review"}
          </LabelTiny>
          {summary.isSunday && (
            <PressureLabel caps tone="saffron" className="text-[9px]">
              Today
            </PressureLabel>
          )}
        </div>

        <GuidedExplainer
          defaultOpen={summary.isSunday}
          question={
            summary.isSunday
              ? "Sit with the week before it closes."
              : "Reflect on the week."
          }
          explanation={`Three short answers — what you kept, what slipped, and what next week asks. Saved locally so you can return to it. (When the AI Acharya layer ships, your review becomes the dialogue's starting point.)`}
        />

        <Card className="bg-ivory-deep border-gold/40">
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <LabelTiny>What did you keep?</LabelTiny>
              <Textarea
                value={reviewKept}
                onChange={(e) => setReviewKept(e.target.value.slice(0, 500))}
                placeholder="Three days of meditation. One real conversation. The morning walks."
                rows={3}
                className="bg-ivory border-gold/40"
              />
            </div>
            <div className="space-y-1.5">
              <LabelTiny>What slipped?</LabelTiny>
              <Textarea
                value={reviewSlipped}
                onChange={(e) => setReviewSlipped(e.target.value.slice(0, 500))}
                placeholder="No exercise after Tuesday. Phone in bed. The sankalpa I forgot by Thursday."
                rows={3}
                className="bg-ivory border-gold/40"
              />
            </div>
            <div className="space-y-1.5">
              <LabelTiny>What does next week ask?</LabelTiny>
              <Textarea
                value={reviewIntention}
                onChange={(e) => setReviewIntention(e.target.value.slice(0, 500))}
                placeholder="Lay the phone in another room overnight. Walk every morning, even five minutes."
                rows={3}
                className="bg-ivory border-gold/40"
              />
            </div>
            <Button
              onClick={saveReview}
              disabled={
                !reviewKept.trim() &&
                !reviewSlipped.trim() &&
                !reviewIntention.trim()
              }
            >
              {reviewSaved ? "Saved · save again" : "Save the review"}
            </Button>
            {reviewSaved && (
              <p className="font-lyric-italic text-xs text-earth-mid">
                Stored locally on this device. The Acharya layer will read this
                when it ships.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <p className="text-center text-xs text-earth-mid pt-2">
        <Link href="/" className="hover:text-saffron">← back to home</Link>
      </p>
    </div>
  );
}

function DayHeader({ days }: { days: WeekDay[] }) {
  return (
    <div className="grid grid-cols-7 gap-1 px-1">
      {days.map((d) => (
        <div
          key={d.date}
          className={cn(
            "text-center font-pressure-caps text-[9px] tracking-[2px] py-1 rounded",
            d.isToday && "bg-saffron/10 text-saffron",
            !d.isToday && "text-earth-mid",
            d.isFuture && "opacity-50"
          )}
        >
          <div>{d.label}</div>
          <div className="font-lyric text-[10px] mt-0.5">
            {parseDayNumber(d.date)}
          </div>
          {d.hasReflection && (
            <div
              aria-label="reflection"
              className="w-1 h-1 rounded-full bg-sage mx-auto mt-1"
            />
          )}
        </div>
      ))}
    </div>
  );
}

function DailyGoalWeekRow({
  goal,
  days,
}: {
  goal: WeekDailyGoalRow;
  days: WeekDay[];
}) {
  const colorHex =
    CATEGORY_COLORS.find((c) => c.value === goal.categoryColor)?.hex ?? "#c46a1f";
  return (
    <Card className="flex flex-col gap-2 bg-ivory-deep border-gold/30 p-3">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
          style={{
            backgroundColor: `${colorHex}1f`,
            border: `1px solid ${colorHex}`,
          }}
        >
          {goal.categoryIcon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-lyric text-sm text-ink leading-tight truncate">
            {goal.title}
          </div>
          <div className="font-pressure-caps text-[8px] text-earth-mid">
            {goal.categoryTitle}
          </div>
        </div>
        <div className="font-pressure-caps text-[9px] text-saffron">
          {goal.daysKept}/7
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 px-1">
        {goal.daySlots.map((slot, i) => (
          <DaySlot
            key={`${goal.id}-${i}`}
            slot={slot}
            day={days[i]}
            color={colorHex}
          />
        ))}
      </div>
    </Card>
  );
}

function DaySlot({
  slot,
  day,
  color,
}: {
  slot: "kept" | "slip" | "future";
  day: WeekDay;
  color: string;
}) {
  return (
    <div
      className={cn(
        "aspect-square rounded-sm flex items-center justify-center text-[10px] font-pressure-caps",
        slot === "kept" && "text-ivory",
        slot === "slip" && "border border-saffron/40 text-saffron/40",
        slot === "future" && "border border-gold/30 text-earth-mid/40",
        day.isToday && slot !== "kept" && "ring-1 ring-saffron"
      )}
      style={slot === "kept" ? { backgroundColor: color } : undefined}
      title={`${day.label} ${parseDayNumber(day.date)} — ${slot}`}
    >
      {slot === "kept" ? "·" : slot === "slip" ? "—" : ""}
    </div>
  );
}

function OtherGoalRow({ goal }: { goal: WeekGoalRow }) {
  const colorHex =
    CATEGORY_COLORS.find((c) => c.value === goal.categoryColor)?.hex ?? "#c46a1f";

  let progress = 0;
  let label = "";
  let met = false;
  if (goal.shape === "weekly") {
    const max = goal.weeklyTarget;
    progress = max > 0 ? Math.min(1, goal.weekTotal / max) : 0;
    label = `${goal.weekTotal} of ${max}`;
    met = goal.isMet;
  } else if (goal.shape === "by_date") {
    const max = goal.totalTarget;
    progress = max > 0 ? Math.min(1, goal.weekTotal / max) : 0;
    label = `${goal.weekTotal} this week · ${goal.daysRemaining}d left`;
  }

  return (
    <Card className="flex flex-col gap-2 bg-ivory-deep border-gold/30 p-3">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
          style={{
            backgroundColor: `${colorHex}1f`,
            border: `1px solid ${colorHex}`,
          }}
        >
          {goal.categoryIcon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-lyric text-sm text-ink leading-tight truncate">
            {goal.title}
          </div>
          <div className="font-pressure-caps text-[8px] text-earth-mid">
            {goal.categoryTitle} ·{" "}
            {goal.shape === "weekly" ? "Weekly" : "By date"}
          </div>
        </div>
        <div
          className={cn(
            "font-pressure-caps text-[9px]",
            met ? "text-saffron" : "text-earth-mid"
          )}
        >
          {label}
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-ivory border border-gold/30 overflow-hidden">
        <div
          className="h-full bg-saffron transition-all duration-500"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </Card>
  );
}

function formatRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const sm = s.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const em = e.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${sm} — ${em}`;
}

function parseDayNumber(dateStr: string): number {
  return new Date(dateStr + "T00:00:00").getDate();
}
