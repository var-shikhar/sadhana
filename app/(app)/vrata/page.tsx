"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useVrata, useDeclareVrata, useAbandonVrata } from "@/hooks/useVrata";
import { useTodayGoals } from "@/hooks/useTodayGoals";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { PressureLabel } from "@/components/gurukul/PressureLabel";
import { GoldRule } from "@/components/gurukul/GoldRule";
import { VrataRing } from "@/components/gurukul/VrataRing";
import { LotusMandala } from "@/components/ornament/LotusMandala";
import { VRATA_LENGTHS, type VrataLengthName } from "@/types";

export default function VrataPage() {
  const { state, loading } = useVrata();
  const { goals: todayGoals, loading: goalsLoading } = useTodayGoals();
  const router = useRouter();
  const declareMutation = useDeclareVrata();
  const abandonMutation = useAbandonVrata();

  const [step, setStep] = useState<"length" | "bind" | "vow">("length");
  const [lengthName, setLengthName] = useState<VrataLengthName | null>(null);
  const [boundGoalIds, setBoundGoalIds] = useState<string[]>([]);
  const [sankalpa, setSankalpa] = useState("");
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  const lengthDef = useMemo(
    () => VRATA_LENGTHS.find((l) => l.name === lengthName) ?? null,
    [lengthName]
  );

  // Only daily-shape goals make sense to bind to a vrata (the "every day" pattern)
  const dailyGoals = useMemo(
    () => todayGoals.filter((g) => g.shape === "daily"),
    [todayGoals]
  );

  if (loading || goalsLoading) {
    return (
      <p className="font-lyric-italic text-earth-mid py-6">Loading…</p>
    );
  }

  // Active vrata view
  if (state?.active) {
    const active = state.active;
    const activeLength = VRATA_LENGTHS.find((l) => l.name === active.lengthName);
    const boundGoals = todayGoals.filter((g) =>
      active.boundHabitIds.includes(g.id)
    );

    return (
      <div className="space-y-6 py-2">
        <header className="text-center space-y-2">
          <LabelTiny>The Active Vrata</LabelTiny>
          <h1 className="font-lyric text-3xl text-ink">A vow in progress</h1>
        </header>
        <GoldRule width="section" />

        <div className="flex flex-col items-center space-y-3">
          <VrataRing
            daysCompleted={state.daysCompleted}
            daysTarget={state.daysTarget}
            lengthLabel={active.lengthName}
            brightness={1}
            size={220}
          />
          <p className="font-lyric text-lg text-ink">
            Day {state.daysCompleted} of {state.daysTarget}
          </p>
          <p className="font-lyric-italic text-sm text-earth-deep text-center">
            {activeLength?.english} · started {formatStarted(active.startedDate)}
            {active.extensionDays > 0 && (
              <>
                <br />
                <span className="text-saffron">
                  +{active.extensionDays} days from prayaschitta
                </span>
              </>
            )}
          </p>
        </div>

        {active.sankalpa && (
          <Card className="bg-ivory-deep border-gold/40">
            <CardContent className="p-5 space-y-2">
              <LabelTiny className="block">Sankalpa</LabelTiny>
              <p className="font-lyric-italic text-base text-ink leading-relaxed">
                &quot;{active.sankalpa}&quot;
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-ivory-deep border-gold/40">
          <CardContent className="p-5 space-y-3">
            <LabelTiny className="block">Bound goals</LabelTiny>
            <ul className="space-y-1.5">
              {boundGoals.length === 0 ? (
                <li className="font-lyric-italic text-sm text-earth-mid">
                  Bound goals were removed. Abandon and start fresh.
                </li>
              ) : (
                boundGoals.map((g) => (
                  <li
                    key={g.id}
                    className="font-lyric text-base text-ink flex items-center gap-2"
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full bg-saffron"
                      aria-hidden
                    />
                    <span>{g.title}</span>
                    <span className="font-pressure-caps text-[8px] text-earth-mid ml-auto">
                      {g.categoryTitle}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>

        <div className="pt-4">
          {confirmAbandon ? (
            <Card className="bg-saffron/5 border-saffron/40">
              <CardContent className="p-5 space-y-3">
                <p className="font-lyric-italic text-sm text-earth-deep">
                  Abandoning a vrata is honest, but the path is broken. The next vow
                  begins from the beginning. Are you sure?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setConfirmAbandon(false)}
                  >
                    Hold the vow
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      abandonMutation.mutate(undefined, {
                        onSuccess: () => router.push("/"),
                      });
                    }}
                    disabled={abandonMutation.isPending}
                  >
                    {abandonMutation.isPending ? "Releasing…" : "Abandon"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setConfirmAbandon(true)}
            >
              Abandon this vrata
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-earth-mid pt-2">
          <Link href="/" className="hover:text-saffron">← back to home</Link>
        </p>
      </div>
    );
  }

  // No active vrata — declaration wizard
  const canBind = dailyGoals.length > 0;

  function toggleGoal(id: string) {
    setBoundGoalIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function reset() {
    setStep("length");
    setLengthName(null);
    setBoundGoalIds([]);
    setSankalpa("");
  }

  return (
    <div className="space-y-6 py-2 relative">
      <LotusMandala
        className="absolute -top-4 -right-4 pointer-events-none"
        opacity={0.10}
        size={180}
      />

      <header className="text-center space-y-2">
        <LabelTiny>Declare a Vrata</LabelTiny>
        <h1 className="font-lyric text-3xl text-ink">Take a vow</h1>
        <p className="font-lyric-italic text-sm text-earth-deep">
          A formal commitment for a fixed period. The vrata gives your practice
          shape.
        </p>
      </header>

      <GoldRule width="section" />

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(["length", "bind", "vow"] as const).map((s, i) => (
          <span
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              indexOfStep(step) >= i ? "bg-saffron" : "bg-ivory-deep border border-gold/30"
            )}
          />
        ))}
      </div>

      {step === "length" && (
        <div className="space-y-4">
          <PressureLabel caps tone="saffron" className="text-xs block text-center">
            Step 1 · Choose the length
          </PressureLabel>
          <div className="space-y-2">
            {VRATA_LENGTHS.map((l) => (
              <Card
                key={l.name}
                className={cn(
                  "cursor-pointer flex flex-row items-center gap-4 p-4 transition-all bg-ivory-deep border-gold/30",
                  lengthName === l.name
                    ? "border-saffron bg-saffron/10"
                    : "hover:border-gold"
                )}
                onClick={() => setLengthName(l.name)}
              >
                <div className="font-pressure text-2xl text-saffron min-w-[48px] text-center">
                  {l.baseDays}
                </div>
                <div className="flex-1">
                  <div className="font-lyric text-lg text-ink">{l.english}</div>
                  <div className="font-pressure-caps text-[9px] text-earth-mid">
                    {l.name}
                  </div>
                  <div className="font-lyric-italic text-xs text-earth-deep mt-0.5">
                    {l.description}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full">Back</Button>
            </Link>
            <Button
              className="flex-1"
              disabled={!lengthName}
              onClick={() => setStep("bind")}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === "bind" && (
        <div className="space-y-4">
          <PressureLabel caps tone="saffron" className="text-xs block text-center">
            Step 2 · Bind your daily goals
          </PressureLabel>
          {!canBind ? (
            <Card className="bg-ivory-deep border-gold/40">
              <CardContent className="p-5 text-center space-y-2">
                <p className="font-lyric-italic text-sm text-earth-deep">
                  You have no daily-shape goals yet. A vrata binds *daily*
                  practices — set up a category and a daily goal first.
                </p>
                <Link href="/categories">
                  <Button variant="outline" size="sm">Go to Plan</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="font-lyric-italic text-sm text-earth-deep">
                Each day you must keep <em>all</em> bound goals. Missing any one
                is a slip — and the vrata adds 2 days.
              </p>
              <div className="space-y-2">
                {dailyGoals.map((g) => {
                  const sel = boundGoalIds.includes(g.id);
                  return (
                    <Card
                      key={g.id}
                      className={cn(
                        "cursor-pointer flex flex-row items-center gap-3 px-4 py-3 transition-all bg-ivory-deep border-gold/30",
                        sel ? "border-saffron bg-saffron/10" : "hover:border-gold"
                      )}
                      onClick={() => toggleGoal(g.id)}
                    >
                      <span
                        className={cn(
                          "w-4 h-4 rounded-full border",
                          sel
                            ? "bg-saffron border-saffron"
                            : "border-saffron"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-lyric text-base text-ink leading-tight">
                          {g.title}
                        </div>
                        <div className="font-pressure-caps text-[9px] text-earth-mid">
                          {g.categoryTitle}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep("length")}>
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={!canBind || boundGoalIds.length === 0}
              onClick={() => setStep("vow")}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === "vow" && lengthDef && (
        <div className="space-y-4">
          <PressureLabel caps tone="saffron" className="text-xs block text-center">
            Step 3 · Take the vow
          </PressureLabel>

          <Card className="bg-linear-to-br from-ivory-deep to-parchment border-gold/40">
            <CardContent className="p-5 space-y-3">
              <p className="font-lyric-italic text-sm text-earth-deep text-center">
                For the next <strong className="text-saffron">{lengthDef.baseDays}</strong> days
                ({lengthDef.english.toLowerCase()}), I commit to keeping these{" "}
                {boundGoalIds.length}{" "}
                {boundGoalIds.length === 1 ? "goal" : "goals"}.
              </p>
              <ul className="space-y-1">
                {dailyGoals
                  .filter((g) => boundGoalIds.includes(g.id))
                  .map((g) => (
                    <li
                      key={g.id}
                      className="font-lyric text-base text-ink flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-saffron" aria-hidden />
                      <span>{g.title}</span>
                      <span className="font-pressure-caps text-[8px] text-earth-mid ml-auto">
                        {g.categoryTitle}
                      </span>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <LabelTiny>Sankalpa (optional)</LabelTiny>
            <Textarea
              placeholder="In my own words — why this vrata, why these days…"
              value={sankalpa}
              onChange={(e) => setSankalpa(e.target.value.slice(0, 280))}
              rows={3}
              className="bg-ivory border-gold/40"
            />
            <p className="font-lyric-italic text-[11px] text-earth-mid">
              The vow is held silently. Your sankalpa is for you alone.
            </p>
          </div>

          <Card className="bg-saffron/5 border-saffron/30">
            <CardContent className="p-4 space-y-1">
              <LabelTiny className="block">A note before vowing</LabelTiny>
              <p className="font-lyric-italic text-xs text-earth-deep leading-relaxed">
                A missed day is a <em>slip</em>: the vrata adds 2 days to its end.
                The path lengthens — it does not break.
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep("bind")}>
              Back
            </Button>
            <Button
              className="flex-1 font-pressure-caps"
              disabled={declareMutation.isPending}
              onClick={() => {
                declareMutation.mutate(
                  {
                    lengthName: lengthDef.name,
                    boundHabitIds: boundGoalIds,
                    sankalpa: sankalpa.trim() || null,
                  },
                  {
                    onSuccess: () => {
                      reset();
                      router.push("/");
                    },
                  }
                );
              }}
            >
              {declareMutation.isPending ? "Vowing…" : "Take the vow"}
            </Button>
          </div>

          {declareMutation.isError && (
            <p className="text-sm text-destructive text-center">
              {(declareMutation.error as Error).message}
            </p>
          )}
        </div>
      )}

      {state?.history && state.history.length > 0 && (
        <>
          <GoldRule width="section" className="mt-8" />
          <section className="space-y-3">
            <LabelTiny className="block">Past vratas</LabelTiny>
            {state.history.slice(0, 5).map((v) => {
              const def = VRATA_LENGTHS.find((l) => l.name === v.lengthName);
              return (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-3 rounded border border-gold/30 bg-ivory-deep/60"
                >
                  <div>
                    <div className="font-lyric text-base text-ink">{def?.english}</div>
                    <div className="font-pressure-caps text-[9px] text-earth-mid">
                      {v.status === "completed" ? "Kept" : "Abandoned"}
                      {" · "}
                      {formatStarted(v.startedDate)}
                    </div>
                  </div>
                  {v.status === "completed" && (
                    <span className="w-7 h-7 rounded-full bg-saffron flex items-center justify-center">
                      <span className="font-pressure-caps text-[6px] text-ivory">KEPT</span>
                    </span>
                  )}
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}

function indexOfStep(s: "length" | "bind" | "vow"): number {
  return s === "length" ? 0 : s === "bind" ? 1 : 2;
}

function formatStarted(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
