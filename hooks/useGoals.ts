"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/lib/stores/toast";
import {
  QUEST_ACTIVATION_CONFLICT,
  QuestActivationConflictError,
} from "@/lib/goals/lifecycle";
import type {
  Goal,
  GoalHistoryEntry,
  GoalHorizon,
  GoalShape,
  GoalSource,
  GoalStatus,
  GoalType,
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
  endDate?: string | null;
  startDate?: string | null;
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
    endDate: string | null;
    // startDate is non-nullable on the Goal type — patches may omit it
    // (Partial) but never null it. Keeping this as `string` lets us spread
    // the patch onto a cached GoalWithProgress without widening the
    // resulting type to `string | null`.
    startDate: string;
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

// ─── New top-level goal hooks (used by /goals surface) ───────────────────

interface AllGoalsFilters {
  horizon?: GoalHorizon;
  shape?: GoalShape;
  status?: GoalStatus;
  category?: "all" | "none" | string;
}

function buildGoalsQuery(filters: AllGoalsFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.horizon) params.set("horizon", filters.horizon);
  if (filters.shape) params.set("shape", filters.shape);
  if (filters.status) params.set("status", filters.status);
  if (filters.category && filters.category !== "all") {
    params.set("category", filters.category);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function useAllGoals(filters: AllGoalsFilters = {}) {
  const key = [
    ...queryKeys.goals(),
    "all",
    filters.horizon ?? "any",
    filters.shape ?? "any",
    filters.status ?? "any",
    filters.category ?? "any",
  ] as const;
  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const res = await fetch(`/api/goals${buildGoalsQuery(filters)}`);
      if (!res.ok) throw new Error("Failed to load goals");
      return (await res.json()) as GoalWithProgress[];
    },
  });
  return {
    goals: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
  };
}

export function useGoal(goalId: string | null | undefined) {
  const query = useQuery({
    queryKey: goalId ? queryKeys.goal(goalId) : ["goals", "id", "_none"],
    enabled: !!goalId,
    queryFn: async () => {
      const res = await fetch(`/api/goals/${goalId}`);
      if (!res.ok) throw new Error("Failed to load goal");
      return (await res.json()) as GoalWithProgress;
    },
  });
  return {
    goal: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
  };
}

export function useSubGoals(parentId: string | null | undefined) {
  const query = useQuery({
    queryKey: parentId ? queryKeys.subGoals(parentId) : ["goals", "sub", "_none"],
    enabled: !!parentId,
    queryFn: async () => {
      const res = await fetch(`/api/goals/${parentId}/subgoals`);
      if (!res.ok) throw new Error("Failed to load sub-goals");
      return (await res.json()) as GoalWithProgress[];
    },
  });
  return {
    subGoals: query.data ?? [],
    loading: query.isLoading,
  };
}

export function useGoalHistory(goalId: string | null | undefined) {
  const query = useQuery({
    queryKey: goalId
      ? queryKeys.goalHistory(goalId)
      : ["goals", "history", "_none"],
    enabled: !!goalId,
    queryFn: async () => {
      const res = await fetch(`/api/goals/${goalId}/history`);
      if (!res.ok) throw new Error("Failed to load history");
      return (await res.json()) as GoalHistoryEntry[];
    },
  });
  return {
    entries: query.data ?? [],
    loading: query.isLoading,
  };
}

interface GoalLogRow {
  id: string;
  goalId: string;
  date: string;
  value: number;
  note: string | null;
  loggedAt: string;
}

export function useGoalLogs(goalId: string | null | undefined) {
  const query = useQuery({
    queryKey: goalId
      ? ([...queryKeys.goal(goalId), "logs"] as const)
      : (["goals", "logs", "_none"] as const),
    enabled: !!goalId,
    queryFn: async () => {
      const res = await fetch(`/api/goals/${goalId}/log`);
      if (!res.ok) throw new Error("Failed to load logs");
      return (await res.json()) as GoalLogRow[];
    },
  });
  return {
    logs: query.data ?? [],
    loading: query.isLoading,
  };
}

interface CreateGoalV2Payload {
  title: string;
  description?: string | null;
  horizon?: GoalHorizon;
  shape: GoalShape;
  /** Quest or discipline. Defaults inferred server-side if absent. */
  goalType?: GoalType;
  weeklyTarget?: number | null;
  totalTarget?: number | null;
  /** Optional finish line for any cadence. null = open-ended. */
  endDate?: string | null;
  /** Defaults to today; future value puts the goal in 'scheduled' status. */
  startDate?: string | null;
  categoryId?: string | null;
  parentId?: string | null;
  source?: GoalSource;
}

/** POST /api/goals — top-level or sub-goal (parentId set). */
export function useCreateGoalV2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateGoalV2Payload) => {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create goal");
      }
      return (await res.json()) as Goal;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.goals() });
      if (vars.parentId) {
        qc.invalidateQueries({ queryKey: queryKeys.subGoals(vars.parentId) });
      }
      if (vars.categoryId) {
        qc.invalidateQueries({
          queryKey: queryKeys.goalsByCategory(vars.categoryId),
        });
      }
      qc.invalidateQueries({ queryKey: queryKeys.todayGoals() });
      toast.success(vars.parentId ? "Sub-goal added" : "Goal added");
    },
  });
}

interface UpdateGoalV2Payload {
  goalId: string;
  patch: Partial<{
    title: string;
    description: string | null;
    horizon: GoalHorizon;
    shape: GoalShape;
    weeklyTarget: number | null;
    totalTarget: number | null;
    endDate: string | null;
    // Non-nullable on Goal — patches can omit but never null it.
    startDate: string;
    status: GoalStatus;
    categoryId: string | null;
    parentId: string | null;
    sortOrder: number;
    reason: string | null;
  }>;
  /** parent goal id, if this goal is a sub-goal — for sub-goal cache invalidation. */
  parentId?: string | null;
}

export function useUpdateGoalV2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ goalId, patch }: UpdateGoalV2Payload) => {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Surface the quest activation cap as a typed error so callers can
        // render the "pick one to pause" modal instead of a generic toast.
        if (res.status === 409 && data?.error === QUEST_ACTIVATION_CONFLICT) {
          throw new QuestActivationConflictError({
            max: data.max ?? 1,
            currentActiveQuestIds: data.currentActiveQuestIds ?? [],
          });
        }
        throw new Error(data.error || "Failed to update goal");
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.goals() });
      qc.invalidateQueries({ queryKey: queryKeys.goal(vars.goalId) });
      qc.invalidateQueries({ queryKey: queryKeys.goalHistory(vars.goalId) });
      if (vars.parentId) {
        qc.invalidateQueries({ queryKey: queryKeys.subGoals(vars.parentId) });
      }
      qc.invalidateQueries({ queryKey: queryKeys.todayGoals() });
      // Status-only changes get a tailored toast; everything else is generic.
      if (vars.patch.status === "completed") toast.success("Goal completed");
      else if (vars.patch.status === "paused") toast.show("Goal paused");
      else if (vars.patch.status === "active") toast.show("Goal resumed");
      else toast.show("Saved");
    },
  });
}

export function useDeleteGoalV2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goalId: string) => {
      const res = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to archive goal");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.goals() });
      qc.invalidateQueries({ queryKey: queryKeys.todayGoals() });
      toast.saffron("Goal archived");
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
