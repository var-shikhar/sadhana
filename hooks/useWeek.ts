"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { WeekSummary } from "@/lib/week/summary";

async function fetchWeek(): Promise<WeekSummary> {
  const res = await fetch("/api/week");
  if (!res.ok) throw new Error("Failed to load week");
  return res.json();
}

export function useWeek() {
  const query = useQuery({
    queryKey: queryKeys.week(),
    queryFn: fetchWeek,
  });
  return {
    summary: query.data ?? null,
    loading: query.isLoading,
  };
}
