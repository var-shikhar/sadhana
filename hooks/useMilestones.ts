"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/lib/stores/toast";
import type { Milestone, MilestoneWithTaskCount } from "@/types";

async function fetchMilestones(
  goalId: string,
): Promise<MilestoneWithTaskCount[]> {
  const res = await fetch(`/api/goals/${goalId}/milestones`);
  if (!res.ok) throw new Error("Failed to load milestones");
  return res.json();
}

export function useMilestones(goalId: string | null | undefined) {
  const query = useQuery({
    queryKey: goalId
      ? queryKeys.milestones(goalId)
      : (["goals", "_none", "milestones"] as const),
    enabled: !!goalId,
    queryFn: () => fetchMilestones(goalId!),
  });
  return {
    milestones: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
  };
}

interface CreateMilestoneInput {
  goalId: string;
  title: string;
  description?: string | null;
  targetValue?: number | null;
}

export function useCreateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMilestoneInput) => {
      const { goalId, ...body } = input;
      const res = await fetch(`/api/goals/${goalId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to create milestone");
      }
      return (await res.json()) as Milestone;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.milestones(vars.goalId) });
      toast.success("Milestone added");
    },
  });
}

interface UpdateMilestoneInput {
  id: string;
  goalId: string;
  patch: Partial<{
    title: string;
    description: string | null;
    targetValue: number | null;
    orderIndex: number;
    completed: boolean;
  }>;
}

export function useUpdateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateMilestoneInput) => {
      const res = await fetch(`/api/milestones/${input.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to update milestone");
      }
      return (await res.json()) as Milestone;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.milestones(vars.goalId) });
      if (vars.patch.completed === true) toast.success("Milestone reached");
    },
  });
}

interface DeleteMilestoneInput {
  id: string;
  goalId: string;
}

export function useDeleteMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: DeleteMilestoneInput) => {
      const res = await fetch(`/api/milestones/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete milestone");
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.milestones(vars.goalId) });
      // The tasks-by-goal cache also changes: those tasks just had their
      // milestone_id flipped to null by the SET NULL cascade.
      qc.invalidateQueries({ queryKey: queryKeys.tasksByGoal(vars.goalId) });
      toast.show("Milestone removed");
    },
  });
}
