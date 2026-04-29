"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHabits } from "@/hooks/useHabits";
import { useGrowthIndex } from "@/hooks/useGrowthIndex";
import { useReflection } from "@/hooks/useReflection";
import { getGrowthLevel } from "@/types";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { PressureLabel } from "@/components/gurukul/PressureLabel";
import { GoldRule } from "@/components/gurukul/GoldRule";
import { HabitDot } from "@/components/gurukul/HabitDot";
import { GrowthOrbit } from "@/components/gurukul/GrowthOrbit";
import { KolamGrid } from "@/components/ornament/KolamGrid";

function greetingForHour(hour: number): string {
  if (hour < 12) return "The day waits for you.";
  if (hour < 17) return "Today, you are here.";
  return "The day winds toward you.";
}

export default function HomePage() {
  const { userHabits, todayLogs, loading: habitsLoading } = useHabits();
  const { current, loading: growthLoading } = useGrowthIndex();
  const { reflection, loading: reflectionLoading } = useReflection();

  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);
  const dayNumber = useMemo(() => {
    if (!current?.indexValue) return 1;
    return Math.max(1, Math.round((current.indexValue - 100) / 2) + 1);
  }, [current]);

  const loading = habitsLoading || growthLoading || reflectionLoading;

  if (loading) {
    return (
      <div className="space-y-6 py-2">
        <p className="font-lyric-italic text-earth-mid">Loading your practice...</p>
      </div>
    );
  }

  const completed = todayLogs.filter((l) => l.completed).length;
  const total = userHabits.length;
  const habitRatio = total > 0 ? completed / total : 0;
  const hasReflected = !!reflection;

  return (
    <div className="space-y-7 py-2 relative">
      <KolamGrid className="absolute -top-4 -right-4 pointer-events-none" />

      <header className="text-center space-y-2 relative">
        <PressureLabel caps tone="saffron" className="text-xs">
          Day · {dayNumber}
        </PressureLabel>
        <h1 className="font-lyric text-3xl text-ink leading-tight">{greeting}</h1>
      </header>

      <GoldRule width="section" />

      <Card className="bg-ivory-deep border-gold/40">
        <CardContent className="space-y-5 pt-6">
          <div className="text-center space-y-1">
            <LabelTiny>Growth Index</LabelTiny>
            <div className="font-lyric text-5xl text-ink leading-none">
              {Math.round(current.indexValue)}
            </div>
            <div>
              <PressureLabel caps tone="saffron" className="text-xs">
                {getGrowthLevel(current.indexValue)}
              </PressureLabel>
            </div>
            {current.dailyScore > 0 && (
              <p className="text-xs text-sage">+{current.dailyScore} today</p>
            )}
          </div>
          <GrowthOrbit
            habitRatio={habitRatio}
            reflectionRatio={hasReflected ? 1 : 0}
            level={current.dailyScore > 0 ? "active" : "steady"}
          />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <LabelTiny className="block text-center">Today&apos;s Offerings</LabelTiny>
        <div className="flex justify-center gap-3">
          {userHabits.map((h, i) => {
            const log = todayLogs.find((l) => l.userHabitId === h.id);
            return (
              <HabitDot
                key={h.id}
                state={log?.completed ? "complete" : "pending"}
                delayMs={i * 500}
              />
            );
          })}
        </div>
        <p className="text-center text-xs text-earth-mid">
          {completed} of {total} made
          {completed < total && " — one to go before sunset"}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/log"
          className={cn(buttonVariants({ variant: completed < total ? "default" : "outline" }))}
        >
          {completed < total ? "Log Habits" : "View Log"}
        </Link>
        <Link
          href="/reflect"
          className={cn(buttonVariants({ variant: !hasReflected ? "default" : "outline" }))}
        >
          {!hasReflected ? "Reflect" : "View Reflection"}
        </Link>
      </div>
    </div>
  );
}
