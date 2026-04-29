"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type GrowthScore } from "@/types";
import { queryKeys } from "@/lib/query-keys";

interface GrowthCurrent {
  indexValue: number;
  dailyScore: number;
}

async function fetchCurrent(): Promise<GrowthCurrent> {
  const res = await fetch("/api/growth");
  if (!res.ok) throw new Error("Failed to load growth index");
  const data = await res.json();
  return {
    indexValue: Number(data.indexValue) || 100,
    dailyScore: Number(data.dailyScore) || 0,
  };
}

async function fetchHistory(from: string, to: string): Promise<GrowthScore[]> {
  const res = await fetch(`/api/growth?from=${from}&to=${to}`);
  if (!res.ok) throw new Error("Failed to load growth history");
  const data = await res.json();
  return data.map((s: Record<string, string>) => ({
    ...s,
    completionPts: Number(s.completionPts),
    reflectionPts: Number(s.reflectionPts),
    consistencyPts: Number(s.consistencyPts),
    dailyScore: Number(s.dailyScore),
    indexValue: Number(s.indexValue),
  })) as GrowthScore[];
}

export function useGrowthIndex() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.growthCurrent(),
    queryFn: fetchCurrent,
    placeholderData: { indexValue: 100, dailyScore: 0 },
  });

  const recalc = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/growth", { method: "POST" });
      if (!res.ok) throw new Error("Failed to recalculate growth");
      const data = await res.json();
      return {
        indexValue: Number(data.indexValue) || 100,
        dailyScore: Number(data.dailyScore) || 0,
      } satisfies GrowthCurrent;
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.growthCurrent(), data);
    },
  });

  return {
    current: query.data ?? { indexValue: 100, dailyScore: 0 },
    loading: query.isLoading,
    recalculate: () => recalc.mutateAsync(),
  };
}

export function useGrowthHistory(from: string, to: string) {
  const query = useQuery({
    queryKey: queryKeys.growthHistory(from, to),
    queryFn: () => fetchHistory(from, to),
  });

  return {
    scores: query.data ?? [],
    loading: query.isLoading,
  };
}
