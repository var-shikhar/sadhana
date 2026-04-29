"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type {
  GoalShape,
  GoalSource,
  GoalStatus,
  GoalWithProgress,
} from "@/types";
import { GOAL_SUGGESTIONS } from "@/types";

async function fetchGoalsByCategory(
  categoryId: string
): Promise<GoalWithProgress[]> {
  const res = await fetch(`/api/categories/${categoryId}/goals`);
  if (!res.ok) throw new Error("Failed to load goals");
  return res.json();
}

export function useGoalsByCategory(categoryId: string) {
  const query = useQuery({
    queryKey: queryKeys.goalsByCategory(categoryId),
    queryFn: () => fetchGoalsByCategory(categoryId),
    enabled: !!categoryId,
  });
  return {
    goals: query.data ?? [],
    loading: query.isLoading,
  };
}

interface CreateGoalPayload {
  categoryId: string;
  title: string;
  description?: string | null;
  shape: GoalShape;
  weeklyTarget?: number | null;
  totalTarget?: number | null;
  deadlineDate?: string | null;
  source?: GoalSource;
}

export function useCreateGoal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateGoalPayload) => {
      const { categoryId, ...rest } = payload;
      const res = await fetch(`/api/categories/${categoryId}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rest),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create goal");
      }
      return res.json();
    },
    onSettled: (_data, _err, payload) => {
      qc.invalidateQueries({
        queryKey: queryKeys.goalsByCategory(payload.categoryId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.goals() });
    },
  });
}

interface UpdateGoalPayload {
  goalId: string;
  categoryId: string;
  patch: Partial<{
    title: string;
    description: string | null;
    shape: GoalShape;
    weeklyTarget: number | null;
    totalTarget: number | null;
    deadlineDate: string | null;
    status: GoalStatus;
    sortOrder: number;
  }>;
}

export function useUpdateGoal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ goalId, patch }: UpdateGoalPayload) => {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to update goal");
    },
    onMutate: async ({ goalId, categoryId, patch }) => {
      await qc.cancelQueries({
        queryKey: queryKeys.goalsByCategory(categoryId),
      });
      const previous = qc.getQueryData<GoalWithProgress[]>(
        queryKeys.goalsByCategory(categoryId)
      );
      if (previous) {
        qc.setQueryData<GoalWithProgress[]>(
          queryKeys.goalsByCategory(categoryId),
          previous.map((g) => (g.id === goalId ? { ...g, ...patch } : g))
        );
      }
      return { previous };
    },
    onError: (_e, vars, ctx) => {
      if (ctx?.previous)
        qc.setQueryData(queryKeys.goalsByCategory(vars.categoryId), ctx.previous);
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.goalsByCategory(vars.categoryId),
      });
    },
  });
}

interface DeleteGoalPayload {
  goalId: string;
  categoryId: string;
}

export function useDeleteGoal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ goalId }: DeleteGoalPayload) => {
      const res = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to archive goal");
    },
    onMutate: async ({ goalId, categoryId }) => {
      await qc.cancelQueries({
        queryKey: queryKeys.goalsByCategory(categoryId),
      });
      const previous = qc.getQueryData<GoalWithProgress[]>(
        queryKeys.goalsByCategory(categoryId)
      );
      qc.setQueryData<GoalWithProgress[]>(
        queryKeys.goalsByCategory(categoryId),
        (previous ?? []).filter((g) => g.id !== goalId)
      );
      return { previous };
    },
    onError: (_e, vars, ctx) => {
      if (ctx?.previous)
        qc.setQueryData(queryKeys.goalsByCategory(vars.categoryId), ctx.previous);
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.goalsByCategory(vars.categoryId),
      });
    },
  });
}

interface LogGoalPayload {
  goalId: string;
  categoryId: string;
  /** Pass false to un-log today instead of logging it. */
  done: boolean;
  /** For weekly/by_date goals; defaults to 1. */
  value?: number;
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useLogGoal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ goalId, done, value }: LogGoalPayload) => {
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
    onMutate: async ({ goalId, categoryId, done, value }) => {
      await qc.cancelQueries({
        queryKey: queryKeys.goalsByCategory(categoryId),
      });
      const previous = qc.getQueryData<GoalWithProgress[]>(
        queryKeys.goalsByCategory(categoryId)
      );
      if (previous) {
        qc.setQueryData<GoalWithProgress[]>(
          queryKeys.goalsByCategory(categoryId),
          previous.map((g) => {
            if (g.id !== goalId) return g;
            const p = { ...g.progress };
            if (g.shape === "daily") {
              if (done) {
                p.todayDone = true;
                p.streak = (p.streak ?? 0) + (g.progress.todayDone ? 0 : 1);
                p.isMet = true;
              } else {
                p.todayDone = false;
                p.streak = Math.max(0, (p.streak ?? 0) - 1);
                p.isMet = false;
              }
            } else if (g.shape === "weekly") {
              const delta = value ?? 1;
              p.weekTotal = Math.max(0, (p.weekTotal ?? 0) + (done ? delta : -delta));
              p.isMet = (p.weekTotal ?? 0) >= (g.weeklyTarget ?? 1);
            } else {
              const delta = value ?? 1;
              p.totalSoFar = Math.max(0, (p.totalSoFar ?? 0) + (done ? delta : -delta));
              p.isMet = (p.totalSoFar ?? 0) >= (g.totalTarget ?? 1);
            }
            return { ...g, progress: p };
          })
        );
      }
      return { previous };
    },
    onError: (_e, vars, ctx) => {
      if (ctx?.previous)
        qc.setQueryData(queryKeys.goalsByCategory(vars.categoryId), ctx.previous);
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.goalsByCategory(vars.categoryId),
      });
    },
  });
}

/** Read suggestions for a category title. Server returns an empty array
 * when the category title doesn't match any starter. We also keep a local
 * fallback (same data) so the UI works pre-fetch. */
export function useGoalSuggestions(categoryId: string, categoryTitle: string) {
  const localSuggestions = GOAL_SUGGESTIONS[categoryTitle.toLowerCase().trim()] ?? [];

  const query = useQuery({
    queryKey: queryKeys.goalSuggestions(categoryTitle),
    queryFn: async () => {
      const res = await fetch(`/api/categories/${categoryId}/suggestions`);
      if (!res.ok) return localSuggestions;
      return res.json() as Promise<typeof localSuggestions>;
    },
    enabled: !!categoryId && !!categoryTitle,
    initialData: localSuggestions,
    staleTime: 60_000,
  });

  return {
    suggestions: query.data ?? [],
    loading: query.isLoading,
  };
}
