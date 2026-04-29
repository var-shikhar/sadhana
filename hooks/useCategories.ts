"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Category, CategoryColor } from "@/types";

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to load categories");
  return res.json();
}

export function useCategories() {
  const query = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: fetchCategories,
  });

  return {
    categories: query.data ?? [],
    loading: query.isLoading,
  };
}

interface CreateCategoryPayload {
  title: string;
  description?: string | null;
  icon?: string;
  color?: CategoryColor;
  priority?: number;
}

export function useCreateCategory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCategoryPayload): Promise<Category> => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create category");
      }
      return res.json();
    },
    onSuccess: (created) => {
      qc.setQueryData<Category[]>(queryKeys.categories(), (old = []) =>
        [...old, created].sort(
          (a, b) => a.priority - b.priority || a.sortOrder - b.sortOrder
        )
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.categories() });
    },
  });
}

interface UpdateCategoryPayload {
  id: string;
  patch: Partial<{
    title: string;
    description: string | null;
    icon: string;
    color: CategoryColor;
    priority: number;
    sortOrder: number;
    isActive: boolean;
  }>;
}

export function useUpdateCategory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: UpdateCategoryPayload): Promise<Category> => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to update category");
      return res.json();
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: queryKeys.categories() });
      const previous = qc.getQueryData<Category[]>(queryKeys.categories());
      if (previous) {
        qc.setQueryData<Category[]>(
          queryKeys.categories(),
          previous.map((c) =>
            c.id === id
              ? {
                  ...c,
                  ...patch,
                  description:
                    patch.description !== undefined
                      ? patch.description
                      : c.description,
                }
              : c
          )
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.categories(), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.categories() });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to archive category");
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.categories() });
      const previous = qc.getQueryData<Category[]>(queryKeys.categories());
      qc.setQueryData<Category[]>(
        queryKeys.categories(),
        (previous ?? []).filter((c) => c.id !== id)
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.categories(), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.categories() });
    },
  });
}
