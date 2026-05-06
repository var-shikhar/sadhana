"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Affirmation } from "@/types";

async function fetchAffirmations(): Promise<Affirmation[]> {
  const res = await fetch("/api/affirmations");
  if (!res.ok) throw new Error("Failed to load affirmations");
  return res.json();
}

export function useAffirmations() {
  const query = useQuery({
    queryKey: queryKeys.affirmations(),
    queryFn: fetchAffirmations,
  });
  return {
    affirmations: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
  };
}

export function useCreateAffirmation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { text: string; isActive?: boolean }) => {
      const res = await fetch("/api/affirmations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to create affirmation");
      }
      return (await res.json()) as Affirmation;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: queryKeys.affirmations() });
      const previous = qc.getQueryData<Affirmation[]>(queryKeys.affirmations());
      const maxSort =
        previous?.reduce((m, a) => Math.max(m, a.sortOrder), 0) ?? 0;
      const tempId = `optimistic-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const now = new Date().toISOString();
      const tempAffirmation: Affirmation = {
        id: tempId,
        userId: "",
        text: input.text.trim().slice(0, 280),
        sortOrder: maxSort + 1,
        isActive: input.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      };
      qc.setQueryData<Affirmation[]>(queryKeys.affirmations(), (old) => [
        ...(old ?? []),
        tempAffirmation,
      ]);
      return { previous, tempId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(queryKeys.affirmations(), ctx.previous);
      }
    },
    onSuccess: (real, _vars, ctx) => {
      qc.setQueryData<Affirmation[]>(queryKeys.affirmations(), (old) => {
        const filtered = (old ?? []).filter(
          (a) => a.id !== ctx?.tempId && a.id !== real.id
        );
        return [...filtered, real];
      });
    },
  });
}

export function useUpdateAffirmation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      text?: string;
      sortOrder?: number;
      isActive?: boolean;
    }) => {
      const { id, ...patch } = input;
      const res = await fetch(`/api/affirmations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to update affirmation");
      }
      return (await res.json()) as Affirmation;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: queryKeys.affirmations() });
      const previous = qc.getQueryData<Affirmation[]>(queryKeys.affirmations());
      qc.setQueryData<Affirmation[]>(queryKeys.affirmations(), (old) =>
        (old ?? []).map((a) =>
          a.id === input.id
            ? {
                ...a,
                ...(input.text !== undefined ? { text: input.text } : {}),
                ...(input.sortOrder !== undefined
                  ? { sortOrder: input.sortOrder }
                  : {}),
                ...(input.isActive !== undefined
                  ? { isActive: input.isActive }
                  : {}),
                updatedAt: new Date().toISOString(),
              }
            : a
        )
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(queryKeys.affirmations(), ctx.previous);
      }
    },
  });
}

export function useDeleteAffirmation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/affirmations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete affirmation");
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.affirmations() });
      const previous = qc.getQueryData<Affirmation[]>(queryKeys.affirmations());
      qc.setQueryData<Affirmation[]>(queryKeys.affirmations(), (old) =>
        (old ?? []).filter((a) => a.id !== id)
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(queryKeys.affirmations(), ctx.previous);
      }
    },
  });
}
