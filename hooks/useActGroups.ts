"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { ActGroup } from "@/types";

async function fetchGroups(): Promise<ActGroup[]> {
  const res = await fetch("/api/act-groups");
  if (!res.ok) throw new Error("Failed to load groups");
  return res.json();
}

export function useActGroups() {
  const query = useQuery({
    queryKey: queryKeys.actGroups(),
    queryFn: fetchGroups,
  });
  return {
    groups: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
  };
}

export function useCreateActGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string }) => {
      const res = await fetch("/api/act-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to create group");
      }
      return (await res.json()) as ActGroup;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: queryKeys.actGroups() });
      const previous = qc.getQueryData<ActGroup[]>(queryKeys.actGroups());
      const maxSort =
        previous?.reduce((m, g) => Math.max(m, g.sortOrder), 0) ?? 0;
      const tempId = `optimistic-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const now = new Date().toISOString();
      const tempGroup: ActGroup = {
        id: tempId,
        userId: "",
        name: input.name.trim().slice(0, 60),
        isActive: true,
        sortOrder: maxSort + 1,
        createdAt: now,
        updatedAt: now,
      };
      qc.setQueryData<ActGroup[]>(queryKeys.actGroups(), (old) => [
        ...(old ?? []),
        tempGroup,
      ]);
      return { previous, tempId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(queryKeys.actGroups(), ctx.previous);
      }
    },
    onSuccess: (real, _vars, ctx) => {
      qc.setQueryData<ActGroup[]>(queryKeys.actGroups(), (old) =>
        (old ?? []).map((g) => (g.id === ctx?.tempId ? real : g))
      );
    },
  });
}

export function useUpdateActGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      isActive?: boolean;
      sortOrder?: number;
    }) => {
      const { id, ...patch } = input;
      const res = await fetch(`/api/act-groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to update group");
      }
      return (await res.json()) as ActGroup;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: queryKeys.actGroups() });
      const previous = qc.getQueryData<ActGroup[]>(queryKeys.actGroups());
      qc.setQueryData<ActGroup[]>(queryKeys.actGroups(), (old) =>
        (old ?? []).map((g) =>
          g.id === input.id
            ? {
                ...g,
                ...(input.name !== undefined ? { name: input.name } : {}),
                ...(input.isActive !== undefined
                  ? { isActive: input.isActive }
                  : {}),
                ...(input.sortOrder !== undefined
                  ? { sortOrder: input.sortOrder }
                  : {}),
                updatedAt: new Date().toISOString(),
              }
            : g
        )
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(queryKeys.actGroups(), ctx.previous);
      }
    },
  });
}

export function useDeleteActGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/act-groups/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete group");
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.actGroups() });
      const previous = qc.getQueryData<ActGroup[]>(queryKeys.actGroups());
      // Hard remove from the cache. The DB has ON DELETE SET NULL on the
      // chips' group_id, so the chips themselves remain. We also clear
      // groupId on any cached chips so the UI snaps to "no group" instantly.
      qc.setQueryData<ActGroup[]>(queryKeys.actGroups(), (old) =>
        (old ?? []).filter((g) => g.id !== id)
      );
      const previousChips = qc.getQueryData<
        Array<{ id: string; groupId: string | null }>
      >(queryKeys.reflectionChips());
      if (previousChips) {
        qc.setQueryData(queryKeys.reflectionChips(), (old) => {
          if (!Array.isArray(old)) return old;
          return (old as Array<Record<string, unknown>>).map((c) =>
            c.groupId === id ? { ...c, groupId: null } : c
          );
        });
      }
      return { previous, previousChips };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(queryKeys.actGroups(), ctx.previous);
      }
      if (ctx?.previousChips !== undefined) {
        qc.setQueryData(queryKeys.reflectionChips(), ctx.previousChips);
      }
    },
  });
}
