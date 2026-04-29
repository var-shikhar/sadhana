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

type QuickPayload = {
  mode: "quick";
  quickTags: PitfallTag[];
  quickNote: string | null;
};

type DeepPayload = {
  mode: "deep";
  cbtEvent: string;
  cbtThought: string;
  cbtFeeling: string;
  cbtReframe: string;
};

type ReflectionPayload = QuickPayload | DeepPayload;

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

      const optimistic: Reflection = {
        id: "optimistic",
        userId: "",
        date,
        mode: payload.mode,
        quickTags: payload.mode === "quick" ? payload.quickTags : null,
        quickNote: payload.mode === "quick" ? payload.quickNote : null,
        cbtEvent: payload.mode === "deep" ? payload.cbtEvent : null,
        cbtThought: payload.mode === "deep" ? payload.cbtThought : null,
        cbtFeeling: payload.mode === "deep" ? payload.cbtFeeling : null,
        cbtReframe: payload.mode === "deep" ? payload.cbtReframe : null,
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
    },
  });
}
