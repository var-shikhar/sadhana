"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants, Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHabits } from "@/hooks/useHabits";
import { useReflection } from "@/hooks/useReflection";
import { useVrata } from "@/hooks/useVrata";
import { useMala } from "@/hooks/useMala";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { PressureLabel } from "@/components/gurukul/PressureLabel";
import { GoldRule } from "@/components/gurukul/GoldRule";
import { HabitDot } from "@/components/gurukul/HabitDot";
import { VrataRing } from "@/components/gurukul/VrataRing";
import { MalaRow } from "@/components/gurukul/MalaRow";
import { PrayaschittaBanner } from "@/components/gurukul/PrayaschittaBanner";
import { SamapanaCard } from "@/components/gurukul/SamapanaCard";
import { NudgeStack } from "@/components/gurukul/NudgeStack";
import { TodayGoalsPanel } from "@/components/goals/TodayGoalsPanel";
import { Loader } from "@/components/gurukul/Loader";
import { KolamGrid } from "@/components/ornament/KolamGrid";
import { GrowthOrbit } from "@/components/gurukul/GrowthOrbit";
import { useGrowthHistory } from "@/hooks/useGrowthIndex";
import { VRATA_LENGTHS } from "@/types";
import { format, subDays } from "date-fns";

function greetingForHour(hour: number): string {
  if (hour < 12) return "The day waits for you.";
  if (hour < 17) return "Today, you are here.";
  return "The day winds toward you.";
}

function offeringHint(hour: number, completed: number, total: number): string {
  if (total === 0) return "";
  if (completed >= total) return "The day's offerings are complete.";
  if (hour < 12) return "Begin gently.";
  if (hour < 17) return "Half the day remains.";
  return "One to go before sunset.";
}

export default function HomePage() {
  const { userHabits, todayLogs, loading: habitsLoading } = useHabits();
  const { reflection, loading: reflectionLoading } = useReflection();
  const { state: vrataState, loading: vrataLoading } = useVrata();
  const { mala, tapas, loading: malaLoading } = useMala();

  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);
  const hour = new Date().getHours();

  const loading = habitsLoading || reflectionLoading || vrataLoading || malaLoading;

  if (loading) {
    return <Loader fullScreen caption="gathering the day’s practice…" />;
  }

  const completed = todayLogs.filter((l) => l.completed).length;
  const total = userHabits.length;
  const hasReflected = !!reflection;

  const active = vrataState?.active ?? null;
  const lengthDef = active
    ? VRATA_LENGTHS.find((l) => l.name === active.lengthName)
    : null;
  const lengthLabel = lengthDef?.name ?? "";
  const daysCompleted = vrataState?.daysCompleted ?? 0;
  const daysTarget = vrataState?.daysTarget ?? 0;

  const justCompletedVrata =
    !active &&
    vrataState?.history?.[0]?.status === "completed" &&
    vrataState.history[0].completedDate &&
    daysSince(vrataState.history[0].completedDate) <= 2;

  const brightness = tapas?.brightness ?? 0;

  return (
    <div className="space-y-7 py-2 relative">
      <KolamGrid className="absolute -top-4 -right-4 pointer-events-none" />

      {/* Acharya nudges — proactive system prompts */}
      <NudgeStack />

      {/* Prayaschitta surface — strict slip acknowledgement */}
      {vrataState?.unacknowledgedSlips && vrataState.unacknowledgedSlips.length > 0 && (
        <PrayaschittaBanner slips={vrataState.unacknowledgedSlips} />
      )}

      {/* Samapana — vrata just completed */}
      {justCompletedVrata && vrataState?.history[0] && (
        <SamapanaCard vrata={vrataState.history[0]} />
      )}

      {/* Greeting */}
      <header className="text-center space-y-2 relative">
        {active ? (
          <PressureLabel caps tone="saffron" className="text-xs">
            Day {daysCompleted} of {daysTarget}
          </PressureLabel>
        ) : (
          <PressureLabel caps tone="saffron" className="text-xs">
            No active vrata
          </PressureLabel>
        )}
        <h1 className="font-lyric text-3xl text-ink leading-tight">{greeting}</h1>
      </header>

      <GoldRule width="section" />

      {/* The Vrata Ring (with flame inside) — only when active */}
      {active ? (
        <div className="flex flex-col items-center space-y-4">
          <Link href="/vrata" aria-label="Manage active vrata">
            <VrataRing
              daysCompleted={daysCompleted}
              daysTarget={daysTarget}
              lengthLabel={lengthLabel}
              brightness={brightness}
              size={220}
            />
          </Link>
        </div>
      ) : (
        <Card className="bg-ivory-deep border-gold/40">
          <CardContent className="p-6 text-center space-y-3">
            <p className="font-lyric text-lg text-ink">
              Walking without a vow is wandering.
            </p>
            <p className="font-lyric-italic text-sm text-earth-deep">
              Take a vrata to give your practice shape.
            </p>
            <Link href="/vrata">
              <Button>Declare a Vrata</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Mala — 27-bead upamala (Home-compact) */}
      {mala && (
        <div className="space-y-2">
          <div className="text-center">
            <LabelTiny>
              Mala · {mala.totalDaysWalked} of 108
            </LabelTiny>
          </div>
          <Link href="/mala" className="block">
            <MalaRow beads={mala.recent27} beadSize={9} gap={4} />
          </Link>
          <p className="text-center text-[10px] text-earth-mid">
            upamala · the past 27 days
          </p>
        </div>
      )}

      <GoldRule width="section" />

      {/* Today's goals (Phase 2 + 3) */}
      <section className="space-y-3">
        <LabelTiny className="block text-center">Today&apos;s Practice</LabelTiny>
        <TodayGoalsPanel />
      </section>

      {/* Legacy PERMA habit dots — kept as a secondary surface so the old
          system still has a presence while users migrate to goals. */}
      {total > 0 && (
        <section className="space-y-2 pt-2 border-t border-gold/20">
          <LabelTiny className="block text-center">PERMA habits (legacy)</LabelTiny>
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
            {completed} of {total} made — {offeringHint(hour, completed, total)}
          </p>
        </section>
      )}

      {/* Slim weekly progress preview — Viveka in miniature, with a link
          to the full view. Surfaces here so the user sees how the week is
          shaping without having to navigate to /analytics. */}
      <HomeProgressStrip />

      {/* Quick actions */}
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

function HomeProgressStrip() {
  const today = format(new Date(), "yyyy-MM-dd");
  const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
  const { scores, loading } = useGrowthHistory(sevenDaysAgo, today);

  if (loading || scores.length === 0) return null;

  const totalCompletion = scores.reduce(
    (sum, s) => sum + (s.completionPts || 0),
    0,
  );
  const habitRatio = Math.min(1, totalCompletion / (scores.length * 50));
  const reflectionDays = scores.filter(
    (s) => (s.reflectionPts || 0) > 0,
  ).length;
  const reflectionRatio = reflectionDays / scores.length;
  const weekScore = scores.reduce((sum, s) => sum + (s.dailyScore || 0), 0);

  return (
    <section className="rounded-md border border-gold/30 bg-ivory-deep p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <LabelTiny>This week&apos;s practice</LabelTiny>
        <Link
          href="/analytics"
          className="font-pressure-caps text-[10px] text-saffron underline-offset-4 hover:underline"
        >
          See full summary →
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-28 shrink-0">
          <GrowthOrbit
            habitRatio={habitRatio}
            reflectionRatio={reflectionRatio}
            size="sm"
            level={habitRatio > 0.5 ? "active" : "steady"}
          />
        </div>
        <div className="flex-1 space-y-1">
          <ProgressLine
            label="Habits"
            value={`${Math.round(habitRatio * 100)}%`}
          />
          <ProgressLine
            label="Reflections"
            value={`${Math.round(reflectionRatio * 100)}%`}
          />
          <ProgressLine
            label="Week score"
            value={`${Math.round(weekScore)} pts`}
          />
        </div>
      </div>
    </section>
  );
}

function ProgressLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="font-pressure-caps text-[9px] text-earth-mid tracking-wider">
        {label}
      </span>
      <span className="font-lyric text-[14px] text-ink tabular-nums">
        {value}
      </span>
    </div>
  );
}

function daysSince(date: string): number {
  const d = new Date(date + "T00:00:00").getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - d) / 86_400_000);
}
