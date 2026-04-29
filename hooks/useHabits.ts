"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type UserHabit, type DailyLog } from "@/types";
import { todayDate } from "@/lib/utils";
import { queryKeys } from "@/lib/query-keys";

async function fetchUserHabits(): Promise<UserHabit[]> {
  const res = await fetch("/api/user-habits");
  if (!res.ok) throw new Error("Failed to load habits");
  return res.json();
}

async function fetchTodayLogs(date: string): Promise<DailyLog[]> {
  const res = await fetch(`/api/logs?date=${date}`);
  if (!res.ok) throw new Error("Failed to load logs");
  return res.json();
}

export function useHabits() {
  const date = todayDate();
  const qc = useQueryClient();

  const habitsQuery = useQuery({
    queryKey: queryKeys.habits(),
    queryFn: fetchUserHabits,
  });

  const logsQuery = useQuery({
    queryKey: queryKeys.todayLogs(date),
    queryFn: () => fetchTodayLogs(date),
  });

  const toggleMutation = useMutation({
    mutationFn: async (vars: { userHabitId: string; completed: boolean }) => {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, ...vars }),
      });
      if (!res.ok) throw new Error("Failed to toggle habit");
    },
    onMutate: async ({ userHabitId, completed }) => {
      await qc.cancelQueries({ queryKey: queryKeys.todayLogs(date) });
      const previous = qc.getQueryData<DailyLog[]>(queryKeys.todayLogs(date));

      qc.setQueryData<DailyLog[]>(queryKeys.todayLogs(date), (old = []) => {
        const existing = old.find((l) => l.userHabitId === userHabitId);
        if (existing) {
          return old.map((l) =>
            l.userHabitId === userHabitId ? { ...l, completed } : l
          );
        }
        return [
          ...old,
          {
            id: `temp-${userHabitId}`,
            userId: "",
            date,
            userHabitId,
            completed,
            note: null,
            loggedAt: new Date().toISOString(),
          },
        ];
      });

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(queryKeys.todayLogs(date), ctx.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.todayLogs(date) });
      qc.invalidateQueries({ queryKey: queryKeys.growthCurrent() });
    },
  });

  function toggleHabit(userHabitId: string, completed: boolean) {
    toggleMutation.mutate({ userHabitId, completed });
  }

  function refresh() {
    qc.invalidateQueries({ queryKey: queryKeys.habits() });
    qc.invalidateQueries({ queryKey: queryKeys.todayLogs(date) });
  }

  return {
    userHabits: habitsQuery.data ?? [],
    todayLogs: logsQuery.data ?? [],
    loading: habitsQuery.isLoading || logsQuery.isLoading,
    toggleHabit,
    refresh,
  };
}
