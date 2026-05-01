"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { ChipCategory, ReflectionChip } from "@/types";

async function fetchChips(includeArchived = false): Promise<ReflectionChip[]> {
  const url = `/api/reflection-chips${includeArchived ? "?includeArchived=true" : ""}`;
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
    mutationFn: async (input: { name: string; category: ChipCategory }) => {
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reflectionChips() });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reflectionChips() });
    },
  });
}

export function useDeleteReflectionChip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reflection-chips/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete chip");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reflectionChips() });
    },
  });
}
