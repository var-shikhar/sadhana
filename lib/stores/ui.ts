"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * UI store for ephemeral, *non-server* client state that needs to be shared
 * across pages. Server state (habits, reflections, growth) lives in TanStack
 * Query — do NOT put fetched data here.
 *
 * Persisted to localStorage so refreshes don't lose UX choices.
 */

type ReflectMode = "quick" | "deep";

interface UIState {
  /** Last-used Reflect mode — restored when reopening Reflect mid-day. */
  reflectMode: ReflectMode;
  setReflectMode: (m: ReflectMode) => void;

  /** Sanskrit-term gloss display counter (term → times shown).
   *  Used by SanskritTerm to fade after 3 displays. */
  glossSeen: Record<string, number>;
  bumpGloss: (term: string) => void;
  glossCount: (term: string) => number;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      reflectMode: "quick",
      setReflectMode: (m) => set({ reflectMode: m }),

      glossSeen: {},
      bumpGloss: (term) =>
        set((s) => ({
          glossSeen: { ...s.glossSeen, [term]: (s.glossSeen[term] ?? 0) + 1 },
        })),
      glossCount: (term) => get().glossSeen[term] ?? 0,
    }),
    {
      name: "sadhana.ui",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
