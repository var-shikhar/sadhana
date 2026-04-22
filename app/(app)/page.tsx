"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useHabits } from "@/hooks/useHabits";
import { useGrowthIndex } from "@/hooks/useGrowthIndex";
import { useReflection } from "@/hooks/useReflection";
import { getGrowthLevel } from "@/types";

export default function HomePage() {
  const { userHabits, todayLogs, loading: habitsLoading } = useHabits();
  const { current, loading: growthLoading } = useGrowthIndex();
  const { reflection, loading: reflectionLoading } = useReflection();

  const loading = habitsLoading || growthLoading || reflectionLoading;

  const completedCount = todayLogs.filter((l) => l.completed).length;
  const totalCount = userHabits.length;
  const completionPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const hasReflected = !!reflection;

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Your Sadhana</h1>
        <p className="text-muted-foreground">Loading your practice...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Growth Index */}
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Growth Index
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-primary">
              {Math.round(current.indexValue)}
            </span>
            {current.dailyScore > 0 && (
              <span className="text-sm text-sage">
                +{current.dailyScore} today
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {getGrowthLevel(current.indexValue)}
          </p>
        </CardContent>
      </Card>

      {/* Today's Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Today&apos;s Practice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Habits */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Habits</span>
              <span className="text-muted-foreground">
                {completedCount}/{totalCount}
              </span>
            </div>
            <Progress value={completionPercent} className="h-2" />
          </div>

          {/* Reflection */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Svadhyaya</span>
            {hasReflected ? (
              <span className="text-sm text-sage">Complete</span>
            ) : (
              <span className="text-sm text-muted-foreground">Not yet</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/log"
          className={cn(buttonVariants({ variant: completedCount < totalCount ? "default" : "outline" }))}
        >
          {completedCount < totalCount ? "Log Habits" : "View Log"}
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
