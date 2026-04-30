"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { TodayGoalRow } from "@/lib/goals/today";

async function fetchTodayGoals(): Promise<TodayGoalRow[]> {
  const res = await fetch("/api/today/goals");
  if (!res.ok) throw new Error("Failed to load today's goals");
  return res.json();
}

export function useTodayGoals() {
  const query = useQuery({
    queryKey: queryKeys.todayGoals(),
    queryFn: fetchTodayGoals,
  });
  return {
    goals: query.data ?? [],
    loading: query.isLoading,
  };
}

interface ToggleTodayPayload {
  goalId: string;
  categoryId: string;
  shape: "daily" | "weekly" | "by_date";
  done: boolean;
  value?: number;
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useToggleTodayGoal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ goalId, done, value }: ToggleTodayPayload) => {
      if (done) {
        const res = await fetch(`/api/goals/${goalId}/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: value ?? 1 }),
        });
        if (!res.ok) throw new Error("Failed to log progress");
      } else {
        const res = await fetch(`/api/goals/${goalId}/log?date=${todayYmd()}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to un-log");
      }
    },
    onMutate: async ({ goalId, done, shape, value }) => {
      await qc.cancelQueries({ queryKey: queryKeys.todayGoals() });
      const previous = qc.getQueryData<TodayGoalRow[]>(queryKeys.todayGoals());
      if (previous) {
        qc.setQueryData<TodayGoalRow[]>(
          queryKeys.todayGoals(),
          previous.map((g) => {
            if (g.id !== goalId) return g;
            const next = { ...g };
            if (shape === "daily") {
              next.todayDone = done;
              next.streak = Math.max(
                0,
                (g.streak ?? 0) + (done ? (g.todayDone ? 0 : 1) : g.todayDone ? -1 : 0)
              );
              next.isMet = !!done;
            } else if (shape === "weekly") {
              const delta = value ?? 1;
              next.weekTotal = Math.max(0, (g.weekTotal ?? 0) + (done ? delta : -delta));
              next.isMet = (next.weekTotal ?? 0) >= (g.weeklyTarget ?? 1);
            } else {
              const delta = value ?? 1;
              next.totalSoFar = Math.max(0, (g.totalSoFar ?? 0) + (done ? delta : -delta));
              next.isMet = (next.totalSoFar ?? 0) >= (g.totalTarget ?? 1);
            }
            return next;
          })
        );
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.todayGoals(), ctx.previous);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.todayGoals() });
      qc.invalidateQueries({
        queryKey: queryKeys.goalsByCategory(vars.categoryId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.prompts() });
    },
  });
}
