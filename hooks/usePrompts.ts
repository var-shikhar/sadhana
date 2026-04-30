"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Nudge } from "@/lib/prompts/observer";

const STORAGE_KEY = "sadhana.dismissedNudges";

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const data = JSON.parse(raw) as { date: string; ids: string[] };
    const today = new Date();
    const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (data.date !== todayYmd) {
      // New day → clear all dismissals
      window.localStorage.removeItem(STORAGE_KEY);
      return new Set();
    }
    return new Set(data.ids);
  } catch {
    return new Set();
  }
}

function persistDismissed(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  const today = new Date();
  const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ date: todayYmd, ids: Array.from(ids) })
  );
}

async function fetchPrompts(): Promise<Nudge[]> {
  const res = await fetch("/api/prompts");
  if (!res.ok) throw new Error("Failed to load prompts");
  return res.json();
}

interface UsePromptsOptions {
  /** Filter to only nudges scoped to this category (or unscoped) */
  categoryId?: string;
}

export function usePrompts(options: UsePromptsOptions = {}) {
  const query = useQuery({
    queryKey: queryKeys.prompts(),
    queryFn: fetchPrompts,
    staleTime: 5 * 60_000, // 5 min
  });

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(readDismissed());
  }, []);

  function dismiss(id: string) {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    persistDismissed(next);
  }

  const all = query.data ?? [];
  const filtered = all
    .filter((n) => !dismissed.has(n.id))
    .filter((n) =>
      options.categoryId
        ? n.categoryId === options.categoryId
        : !n.categoryId // home shows unscoped only
    );

  return {
    nudges: filtered,
    loading: query.isLoading,
    dismiss,
  };
}
