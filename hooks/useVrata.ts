"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Vrata, VrataLengthName, VrataState } from "@/types";

async function fetchVrata(): Promise<VrataState> {
  const res = await fetch("/api/vrata");
  if (!res.ok) throw new Error("Failed to load vrata");
  return res.json();
}

export function useVrata() {
  const query = useQuery({
    queryKey: queryKeys.vrata(),
    queryFn: fetchVrata,
  });

  return {
    state: query.data ?? null,
    loading: query.isLoading,
    refetch: query.refetch,
  };
}

interface DeclareVrataPayload {
  lengthName: VrataLengthName;
  boundHabitIds: string[];
  sankalpa: string | null;
}

export function useDeclareVrata() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DeclareVrataPayload): Promise<Vrata> => {
      const res = await fetch("/api/vrata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to declare vrata");
      }
      return res.json();
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.vrata() });
    },
  });
}

export function useAbandonVrata() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/vrata", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to abandon vrata");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.vrata() });
    },
  });
}

export function useAcknowledgeSlips() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (slipIds: string[]) => {
      const res = await fetch("/api/vrata/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slipIds }),
      });
      if (!res.ok) throw new Error("Failed to acknowledge slips");
    },
    onMutate: async (slipIds) => {
      await qc.cancelQueries({ queryKey: queryKeys.vrata() });
      const previous = qc.getQueryData<VrataState>(queryKeys.vrata());
      if (previous) {
        qc.setQueryData<VrataState>(queryKeys.vrata(), {
          ...previous,
          unacknowledgedSlips: previous.unacknowledgedSlips.filter(
            (s) => !slipIds.includes(s.id)
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.vrata(), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.vrata() });
    },
  });
}
