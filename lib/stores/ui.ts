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

  /** Goals list — whether sub-tasks are revealed under each top-level row.
   *  Persisted so the user doesn't have to flip the toggle every visit.
   *  Will eventually move into the user's Practice settings, but localStorage
   *  is a fine staging spot until then. */
  goalsShowSubGoals: boolean;
  setGoalsShowSubGoals: (v: boolean) => void;
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

      goalsShowSubGoals: false,
      setGoalsShowSubGoals: (v) => set({ goalsShowSubGoals: v }),
    }),
    {
      name: "sadhana.ui",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
