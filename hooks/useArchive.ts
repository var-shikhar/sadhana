"use client";

import { useQuery } from "@tanstack/react-query";
import type { FolioReflection } from "@/components/archive/Folio";
import { queryKeys } from "@/lib/query-keys";

type ApiReflection = {
  id: string;
  date: string;
  mode: "quick" | "deep";
  quickNote: string | null;
  quickTags: string[] | null;
  cbtReframe: string | null;
  cbtEvent: string | null;
};

async function fetchArchive(): Promise<FolioReflection[]> {
  const res = await fetch("/api/reflections");
  if (!res.ok) throw new Error("Failed to load archive");
  const data = (await res.json()) as ApiReflection[];
  return data.map((r) => ({
    id: r.id,
    date: r.date,
    mode: r.mode,
    quickNote: r.quickNote,
    quickTags: r.quickTags,
    cbtReframe: r.cbtReframe,
    cbtEvent: r.cbtEvent,
  }));
}

export function useArchive() {
  const query = useQuery({
    queryKey: queryKeys.archive(),
    queryFn: fetchArchive,
  });

  return {
    reflections: query.data ?? [],
    loading: query.isLoading,
  };
}
