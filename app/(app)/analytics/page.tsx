"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GrowthCurve } from "@/components/analytics/GrowthCurve";
import { CalendarHeatmap } from "@/components/analytics/CalendarHeatmap";
import { useGrowthHistory } from "@/hooks/useGrowthIndex";
import { format, subDays } from "date-fns";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Viveka</h1>
        <p className="text-sm text-muted-foreground">
          Clear seeing — patterns in your practice
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Growth Curve (30 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : (
            <GrowthCurve scores={recentScores} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Practice Heatmap (90 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allLoading ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : (
            <CalendarHeatmap scores={allScores} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Recent Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentScores.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No data yet. Start your daily practice to see scores here.
            </p>
          ) : (
            <div className="space-y-2">
              {recentScores.slice(-7).reverse().map((score) => (
                <div
                  key={score.date}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">
                    {format(new Date(score.date + "T00:00:00"), "EEE, MMM d")}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {score.completionPts}+{score.reflectionPts}+
                      {score.consistencyPts}
                    </span>
                    <span className="font-medium">{score.dailyScore} pts</span>
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
