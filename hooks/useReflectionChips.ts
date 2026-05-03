"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { ChipCategory, ReflectionChip } from "@/types";

async function fetchChips(includeArchived = false): Promise<ReflectionChip[]> {
  const url = `/api/reflection-chips${
    includeArchived ? "?includeArchived=true" : ""
  }`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load chips");
  return res.json();
}

export function useReflectionChips(includeArchived = false) {
  const query = useQuery({
    queryKey: includeArchived
      ? [...queryKeys.reflectionChips(), "all"]
      : queryKeys.reflectionChips(),
    queryFn: () => fetchChips(includeArchived),
  });
  return {
    chips: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
  };
}

export function useCreateReflectionChip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      category: ChipCategory;
      groupId?: string | null;
      isActive?: boolean;
    }) => {
      const res = await fetch("/api/reflection-chips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to create chip");
      }
      return (await res.json()) as ReflectionChip;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: queryKeys.reflectionChips() });
      const previous = qc.getQueryData<ReflectionChip[]>(
        queryKeys.reflectionChips()
      );
      const maxSort =
        previous?.reduce((m, c) => Math.max(m, c.sortOrder), 0) ?? 0;
      const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();
      const tempChip: ReflectionChip = {
        id: tempId,
        userId: "",
        name: input.name.trim().slice(0, 60),
        category: input.category,
        groupId: input.groupId ?? null,
        sortOrder: maxSort + 1,
        isActive: input.isActive ?? true,
        lastUsedAt: null,
        useCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      qc.setQueryData<ReflectionChip[]>(
        queryKeys.reflectionChips(),
        (old) => [...(old ?? []), tempChip]
      );
      return { previous, tempId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(queryKeys.reflectionChips(), ctx.previous);
      }
    },
    onSuccess: (real, _vars, ctx) => {
      // Swap the temp chip for the real one. The server may take the
      // "reactivate existing" branch (POST /reflection-chips) and return a
      // chip whose id is already in the cache from the initial fetch — so
      // also drop any stale copy of `real.id` to avoid duplicate React keys.
      qc.setQueryData<ReflectionChip[]>(
        queryKeys.reflectionChips(),
        (old) => {
          const filtered = (old ?? []).filter(
            (c) => c.id !== ctx?.tempId && c.id !== real.id
          );
          return [...filtered, real];
        }
      );
    },
  });
}

export function useUpdateReflectionChip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      category?: ChipCategory;
      sortOrder?: number;
      isActive?: boolean;
      /** null clears the group (back to "All / Global"); a uuid sets it. */
      groupId?: string | null;
    }) => {
      const { id, ...patch } = input;
      const res = await fetch(`/api/reflection-chips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to update chip");
      }
      return (await res.json()) as ReflectionChip;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: queryKeys.reflectionChips() });
      const previous = qc.getQueryData<ReflectionChip[]>(
        queryKeys.reflectionChips()
      );
      qc.setQueryData<ReflectionChip[]>(
        queryKeys.reflectionChips(),
        (old) =>
          (old ?? []).map((c) =>
            c.id === input.id
              ? {
                  ...c,
                  ...(input.name !== undefined ? { name: input.name } : {}),
                  ...(input.category !== undefined
                    ? { category: input.category }
                    : {}),
                  ...(input.sortOrder !== undefined
                    ? { sortOrder: input.sortOrder }
                    : {}),
                  ...(input.isActive !== undefined
                    ? { isActive: input.isActive }
                    : {}),
                  ...(input.groupId !== undefined
                    ? { groupId: input.groupId }
                    : {}),
                  updatedAt: new Date().toISOString(),
                }
              : c
          )
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(queryKeys.reflectionChips(), ctx.previous);
      }
    },
  });
}

export function useDeleteReflectionChip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reflection-chips/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete chip");
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.reflectionChips() });
      const previous = qc.getQueryData<ReflectionChip[]>(
        queryKeys.reflectionChips()
      );
      // Soft-delete on the server too — flip isActive off optimistically so
      // the row vanishes from the visible (active-only) list immediately.
      qc.setQueryData<ReflectionChip[]>(
        queryKeys.reflectionChips(),
        (old) =>
          (old ?? []).map((c) => (c.id === id ? { ...c, isActive: false } : c))
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(queryKeys.reflectionChips(), ctx.previous);
      }
    },
  });
}
