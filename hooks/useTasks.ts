"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/lib/stores/toast";
import type { Task, TaskStatus } from "@/types";

async function fetchTasks(goalId: string): Promise<Task[]> {
  const res = await fetch(`/api/goals/${goalId}/tasks`);
  if (!res.ok) throw new Error("Failed to load tasks");
  return res.json();
}

export function useTasksByGoal(goalId: string | null | undefined) {
  const query = useQuery({
    queryKey: goalId
      ? queryKeys.tasksByGoal(goalId)
      : (["tasks", "goal", "_none"] as const),
    enabled: !!goalId,
    queryFn: () => fetchTasks(goalId!),
  });
  return {
    tasks: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
  };
}

interface CreateTaskInput {
  goalId: string;
  title: string;
  description?: string | null;
  important?: boolean;
  urgent?: boolean;
  /** Quest tasks live under a milestone; pass null/omit for discipline tasks. */
  milestoneId?: string | null;
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { goalId, ...body } = input;
      const res = await fetch(`/api/goals/${goalId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to create task");
      }
      return (await res.json()) as Task;
    },
    onMutate: async (input) => {
      const key = queryKeys.tasksByGoal(input.goalId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Task[]>(key);
      const maxSort =
        previous?.reduce((m, t) => Math.max(m, t.sortOrder), 0) ?? 0;
      const tempId = `optimistic-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const now = new Date().toISOString();
      const tempTask: Task = {
        id: tempId,
        userId: "",
        goalId: input.goalId,
        milestoneId: input.milestoneId ?? null,
        title: input.title.trim().slice(0, 120),
        description: input.description?.trim().slice(0, 600) || null,
        important: input.important ?? false,
        urgent: input.urgent ?? false,
        status: "open",
        completionNote: null,
        completedAt: null,
        sortOrder: maxSort + 1,
        createdAt: now,
        updatedAt: now,
      };
      qc.setQueryData<Task[]>(key, (old) => [...(old ?? []), tempTask]);
      return { previous, tempId, key };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) qc.setQueryData(ctx.key, ctx.previous);
    },
    onSuccess: (real, _vars, ctx) => {
      if (!ctx) return;
      qc.setQueryData<Task[]>(ctx.key, (old) => {
        const filtered = (old ?? []).filter(
          (t) => t.id !== ctx.tempId && t.id !== real.id,
        );
        return [...filtered, real];
      });
      toast.success("Task added");
    },
  });
}

interface UpdateTaskInput {
  id: string;
  goalId: string;
  patch: Partial<{
    title: string;
    description: string | null;
    important: boolean;
    urgent: boolean;
    status: TaskStatus;
    completionNote: string | null;
    sortOrder: number;
    milestoneId: string | null;
  }>;
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateTaskInput) => {
      const res = await fetch(`/api/tasks/${input.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to update task");
      }
      return (await res.json()) as Task;
    },
    onMutate: async (input) => {
      const key = queryKeys.tasksByGoal(input.goalId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Task[]>(key);
      const now = new Date().toISOString();
      qc.setQueryData<Task[]>(key, (old) =>
        (old ?? []).map((t) => {
          if (t.id !== input.id) return t;
          const next: Task = { ...t, ...input.patch, updatedAt: now };
          // Apply transition effects optimistically (server is the source of
          // truth; this just keeps the UI consistent until the round trip).
          if (input.patch.status === "done" && t.status !== "done") {
            next.completedAt = now;
          } else if (input.patch.status === "open" && t.status === "done") {
            next.completedAt = null;
          }
          return next;
        }),
      );
      return { previous, key };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) qc.setQueryData(ctx.key, ctx.previous);
    },
    onSuccess: (_real, vars) => {
      // Quiet for non-status patches (drag-to-reclassify, edits) — only
      // surface a toast when the user explicitly completes / re-opens a
      // task. Drag-to-reclassify is its own visual feedback (the card moves).
      if (vars.patch.status === "done") toast.success("Task completed");
      else if (vars.patch.status === "open") toast.show("Task reopened");
    },
  });
}

interface DeleteTaskInput {
  id: string;
  goalId: string;
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DeleteTaskInput) => {
      const res = await fetch(`/api/tasks/${input.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
    },
    onMutate: async (input) => {
      const key = queryKeys.tasksByGoal(input.goalId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Task[]>(key);
      qc.setQueryData<Task[]>(key, (old) =>
        (old ?? []).filter((t) => t.id !== input.id),
      );
      return { previous, key };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) qc.setQueryData(ctx.key, ctx.previous);
    },
    onSuccess: () => {
      toast.saffron("Task deleted");
    },
  });
}
