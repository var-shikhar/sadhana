"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { MalaState, TapasState } from "@/types";

interface MalaResponse {
  mala: MalaState;
  tapas: TapasState;
}

async function fetchMala(): Promise<MalaResponse> {
  const res = await fetch("/api/mala");
  if (!res.ok) throw new Error("Failed to load mala");
  return res.json();
}

export function useMala() {
  const query = useQuery({
    queryKey: queryKeys.mala(),
    queryFn: fetchMala,
  });

  return {
    mala: query.data?.mala ?? null,
    tapas: query.data?.tapas ?? null,
    loading: query.isLoading,
  };
}
