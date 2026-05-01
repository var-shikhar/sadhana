"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Reflection, type PitfallTag } from "@/types";
import { todayDate } from "@/lib/utils";
import { queryKeys } from "@/lib/query-keys";

async function fetchReflection(date: string): Promise<Reflection | null> {
  const res = await fetch(`/api/reflections?date=${date}`);
  if (!res.ok) throw new Error("Failed to load reflection");
  return res.json();
}

export function useReflection() {
  const date = todayDate();
  const query = useQuery({
    queryKey: queryKeys.reflectionByDate(date),
    queryFn: () => fetchReflection(date),
  });

  return {
    reflection: query.data ?? null,
    loading: query.isLoading,
  };
}

/** Legacy quick-mode payload (pitfall tags + free-text note). */
type LegacyQuickPayload = {
  mode: "quick";
  quickTags: PitfallTag[];
  quickNote: string | null;
};

/** Legacy CBT deep-mode payload — preserved for backward compatibility. */
type LegacyDeepPayload = {
  mode: "deep";
  cbtEvent: string;
  cbtThought: string;
  cbtFeeling: string;
  cbtReframe: string;
};

/** New chip-bucket payload — current default. */
type ChipFlowPayload = {
  mode: "quick";
  goodChips: string[];
  badChips: string[];
  neutralChips: string[];
  chipDescriptions: Record<string, string>;
  daySummary: string | null;
};

export type ReflectionPayload =
  | LegacyQuickPayload
  | LegacyDeepPayload
  | ChipFlowPayload;

export function useSubmitReflection() {
  const date = todayDate();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ReflectionPayload) => {
      const res = await fetch("/api/reflections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, ...payload }),
      });
      if (!res.ok) throw new Error("Failed to save reflection");
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: queryKeys.reflectionByDate(date) });
      const previous = qc.getQueryData<Reflection | null>(
        queryKeys.reflectionByDate(date)
      );

      const isChip = "goodChips" in payload;

      const optimistic: Reflection = {
        id: "optimistic",
        userId: "",
        date,
        mode: payload.mode,
        quickTags:
          !isChip && payload.mode === "quick" ? payload.quickTags : null,
        quickNote:
          !isChip && payload.mode === "quick" ? payload.quickNote : null,
        cbtEvent: payload.mode === "deep" ? payload.cbtEvent : null,
        cbtThought: payload.mode === "deep" ? payload.cbtThought : null,
        cbtFeeling: payload.mode === "deep" ? payload.cbtFeeling : null,
        cbtReframe: payload.mode === "deep" ? payload.cbtReframe : null,
        goodChips: isChip ? payload.goodChips : null,
        badChips: isChip ? payload.badChips : null,
        neutralChips: isChip ? payload.neutralChips : null,
        chipDescriptions: isChip ? payload.chipDescriptions : null,
        daySummary: isChip ? payload.daySummary : null,
        aiResponse: null,
        aiQuestion: null,
        userFollowup: null,
        aiFollowup: null,
        createdAt: new Date().toISOString(),
      };

      qc.setQueryData(queryKeys.reflectionByDate(date), optimistic);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(queryKeys.reflectionByDate(date), ctx.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reflectionByDate(date) });
      qc.invalidateQueries({ queryKey: queryKeys.archive() });
      qc.invalidateQueries({ queryKey: queryKeys.growthCurrent() });
      qc.invalidateQueries({ queryKey: queryKeys.reflectionChips() });
    },
  });
}
