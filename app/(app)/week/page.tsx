"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMala } from "@/hooks/useMala";
import { useGrowthHistory } from "@/hooks/useGrowthIndex";
import { format, subDays } from "date-fns";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { PressureLabel } from "@/components/gurukul/PressureLabel";
import { GoldRule } from "@/components/gurukul/GoldRule";
import { MalaBead } from "@/components/gurukul/MalaBead";
import { VastuGrid } from "@/components/ornament/VastuGrid";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function WeekPage() {
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const sevenDaysAgo = useMemo(
    () => format(subDays(new Date(), 6), "yyyy-MM-dd"),
    []
  );
  const { mala } = useMala();
  const { scores, loading } = useGrowthHistory(sevenDaysAgo, today);

  // Take the last 7 of recent27 as this week's pattern
  const last7Beads = useMemo(() => {
    if (!mala) return [] as Array<"filled" | "slip" | "future">;
    return mala.recent27.slice(-7);
  }, [mala]);

  const [kept, setKept] = useState("");
  const [slipped, setSlipped] = useState("");
  const [next, setNext] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    // Persist locally for now — a future commit will store these in the
    // archive alongside reflections, and feed them into the AI Acharya's
    // weekly context.
    const review = { date: today, kept, slipped, next };
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem("sadhana.weeklyReviews") ?? "[]";
      const prior = JSON.parse(raw) as Array<typeof review>;
      window.localStorage.setItem(
        "sadhana.weeklyReviews",
        JSON.stringify([review, ...prior].slice(0, 52))
      );
    }
    setSubmitted(true);
  }

  if (loading) {
    return <p className="font-lyric-italic text-earth-mid py-6">Loading…</p>;
  }

  return (
    <div className="space-y-6 py-2 relative">
      <VastuGrid className="absolute -top-2 right-0 pointer-events-none" opacity={0.08} />

      <header className="text-center space-y-2 relative">
        <LabelTiny>Saptaha</LabelTiny>
        <h1 className="font-lyric text-3xl text-ink">A week walked</h1>
        <p className="font-lyric-italic text-sm text-earth-deep">
          Look back without judgment. Look forward with intention.
        </p>
      </header>

      <GoldRule width="section" />

      {/* The 7-cell row */}
      <Card className="bg-ivory-deep border-gold/40">
        <CardContent className="p-5 space-y-4">
          <LabelTiny className="block text-center">The week</LabelTiny>
          <div className="grid grid-cols-7 gap-2 max-w-sm mx-auto">
            {Array.from({ length: 7 }).map((_, i) => {
              const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
              const score = scores.find((s) => s.date === date);
              const reflected = (score?.reflectionPts ?? 0) > 0;
              const beadState = last7Beads[i] ?? "future";
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className="font-pressure-caps text-[8px] text-earth-mid">
                    {DAY_LABELS[i]}
                  </div>
                  <MalaBead state={beadState} size={20} />
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${reflected ? "bg-sage" : "bg-transparent border border-earth-mid/30"}`}
                    aria-label={reflected ? "reflected" : "no reflection"}
                  />
                </div>
              );
            })}
          </div>
          <p className="text-center text-[10px] text-earth-mid">
            bead = day kept · sage dot = day reflected
          </p>
        </CardContent>
      </Card>

      {/* Review form */}
      {!submitted ? (
        <div className="space-y-4">
          <Card className="bg-ivory-deep border-gold/40">
            <CardContent className="p-5 space-y-3">
              <LabelTiny className="block">What did you keep?</LabelTiny>
              <Textarea
                placeholder="The offerings that held this week…"
                value={kept}
                onChange={(e) => setKept(e.target.value.slice(0, 280))}
                rows={3}
                className="bg-ivory border-gold/40"
              />
            </CardContent>
          </Card>

          <Card className="bg-ivory-deep border-gold/40">
            <CardContent className="p-5 space-y-3">
              <LabelTiny className="block">What slipped?</LabelTiny>
              <Textarea
                placeholder="Honestly, without shame…"
                value={slipped}
                onChange={(e) => setSlipped(e.target.value.slice(0, 280))}
                rows={3}
                className="bg-ivory border-gold/40"
              />
            </CardContent>
          </Card>

          <Card className="bg-ivory-deep border-gold/40">
            <CardContent className="p-5 space-y-3">
              <LabelTiny className="block">What does next week ask?</LabelTiny>
              <Textarea
                placeholder="One intention to carry forward…"
                value={next}
                onChange={(e) => setNext(e.target.value.slice(0, 280))}
                rows={3}
                className="bg-ivory border-gold/40"
              />
            </CardContent>
          </Card>

          <Button
            className="w-full"
            disabled={!kept.trim() && !slipped.trim() && !next.trim()}
            onClick={handleSubmit}
          >
            Seal the week
          </Button>
        </div>
      ) : (
        <Card className="bg-linear-to-br from-ivory-deep to-parchment border-gold/40">
          <CardContent className="p-6 text-center space-y-3">
            <PressureLabel caps tone="saffron" className="text-xs">
              Sealed
            </PressureLabel>
            <p className="font-lyric text-xl text-ink">The week is held.</p>
            <p className="font-lyric-italic text-sm text-earth-deep">
              Begin the next without expectation.
            </p>
            <div className="pt-2">
              <Link href="/">
                <Button>Return home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-earth-mid pt-2">
        <Link href="/" className="hover:text-saffron">← back to home</Link>
      </p>
    </div>
  );
}
