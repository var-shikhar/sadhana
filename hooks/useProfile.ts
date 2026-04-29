"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Profile } from "@/types";
import { queryKeys } from "@/lib/query-keys";

async function fetchProfile(): Promise<Profile | null> {
  const res = await fetch("/api/profile");
  if (!res.ok) return null;
  const data = await res.json();
  return data ?? null;
}

export function useProfile() {
  const query = useQuery({
    queryKey: queryKeys.profile(),
    queryFn: fetchProfile,
  });

  return {
    profile: query.data ?? null,
    loading: query.isLoading,
  };
}

interface UpdateProfilePayload {
  displayName?: string;
  morningReminderTime?: string;
  eveningReminderTime?: string;
}

export function useUpdateProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save profile");
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: queryKeys.profile() });
      const previous = qc.getQueryData<Profile | null>(queryKeys.profile());
      if (previous) {
        qc.setQueryData<Profile>(queryKeys.profile(), {
          ...previous,
          ...(payload.displayName !== undefined && { displayName: payload.displayName }),
          ...(payload.morningReminderTime !== undefined && {
            morningReminderTime: payload.morningReminderTime,
          }),
          ...(payload.eveningReminderTime !== undefined && {
            eveningReminderTime: payload.eveningReminderTime,
          }),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(queryKeys.profile(), ctx.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile() });
    },
  });
}
