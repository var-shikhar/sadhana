"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GrowthCurve } from "@/components/analytics/GrowthCurve";
import { CalendarHeatmap } from "@/components/analytics/CalendarHeatmap";
import { useGrowthHistory } from "@/hooks/useGrowthIndex";
import { format, subDays } from "date-fns";
import { GrowthOrbit } from "@/components/gurukul/GrowthOrbit";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { GoldRule } from "@/components/gurukul/GoldRule";

export default function AnalyticsPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const ninetyDaysAgo = format(subDays(new Date(), 90), "yyyy-MM-dd");
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const { scores: allScores, loading: allLoading } = useGrowthHistory(
    ninetyDaysAgo,
    today
  );
  const { scores: recentScores, loading: recentLoading } = useGrowthHistory(
    thirtyDaysAgo,
    today
  );

  const { weekHabitRatio, weekReflectionRatio } = useMemo(() => {
    const last7 = recentScores.slice(-7);
    if (last7.length === 0) {
      return { weekHabitRatio: 0, weekReflectionRatio: 0 };
    }
    const totalCompletion = last7.reduce((sum, s) => sum + (s.completionPts || 0), 0);
    const habitRatio = Math.min(1, totalCompletion / (last7.length * 50));
    const reflectionDays = last7.filter((s) => (s.reflectionPts || 0) > 0).length;
    const reflectionRatio = reflectionDays / last7.length;
    return { weekHabitRatio: habitRatio, weekReflectionRatio: reflectionRatio };
  }, [recentScores]);

  return (
    <div className="space-y-6 py-2">
      <header className="text-center space-y-2">
        <LabelTiny>The Practice</LabelTiny>
        <h1 className="font-lyric text-3xl text-ink">Viveka — discernment</h1>
        <p className="font-lyric-italic text-sm text-earth-deep">
          Patterns in your practice
        </p>
      </header>

      <GoldRule width="section" />

      {/* Quick links to Week + Folio (no longer in primary nav) */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/week"
          className="rounded border border-gold/40 bg-ivory-deep p-3 text-center hover:bg-saffron/5 transition-colors"
        >
          <div className="font-pressure-caps text-[10px] text-saffron">Saptaha</div>
          <div className="font-lyric text-base text-ink mt-0.5">This week</div>
        </Link>
        <Link
          href="/archive"
          className="rounded border border-gold/40 bg-ivory-deep p-3 text-center hover:bg-saffron/5 transition-colors"
        >
          <div className="font-pressure-caps text-[10px] text-saffron">Folio</div>
          <div className="font-lyric text-base text-ink mt-0.5">Past reflections</div>
        </Link>
      </div>

      <section className="space-y-3">
        <LabelTiny className="block">This week&apos;s orbit</LabelTiny>
        <GrowthOrbit
          habitRatio={weekHabitRatio}
          reflectionRatio={weekReflectionRatio}
          size="lg"
          level={weekHabitRatio > 0.5 ? "active" : "steady"}
        />
      </section>

      <Card className="bg-ivory-deep border-gold/40">
        <CardHeader>
          <CardTitle className="font-lyric text-base text-ink-soft">
            Growth Curve (30 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <div className="flex h-48 items-center justify-center font-lyric-italic text-sm text-earth-mid">
              Loading...
            </div>
          ) : (
            <GrowthCurve scores={recentScores} />
          )}
        </CardContent>
      </Card>

      <Card className="bg-ivory-deep border-gold/40">
        <CardHeader>
          <CardTitle className="font-lyric text-base text-ink-soft">
            Practice Heatmap (90 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allLoading ? (
            <div className="flex h-24 items-center justify-center font-lyric-italic text-sm text-earth-mid">
              Loading...
            </div>
          ) : (
            <CalendarHeatmap scores={allScores} />
          )}
        </CardContent>
      </Card>

      <Card className="bg-ivory-deep border-gold/40">
        <CardHeader>
          <CardTitle className="font-lyric text-base text-ink-soft">
            Recent Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentScores.length === 0 ? (
            <p className="font-lyric-italic text-sm text-earth-mid">
              No data yet. Start your daily practice to see scores here.
            </p>
          ) : (
            <div className="space-y-2">
              {recentScores.slice(-7).reverse().map((score) => (
                <div
                  key={score.date}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-lyric text-earth-deep">
                    {format(new Date(score.date + "T00:00:00"), "EEE, MMM d")}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-earth-mid">
                      {score.completionPts}+{score.reflectionPts}+
                      {score.consistencyPts}
                    </span>
                    <span className="font-lyric text-base text-ink">{score.dailyScore} pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
