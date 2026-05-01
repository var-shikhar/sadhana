"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { RetrievedVerse } from "@/lib/scripture/retrieve";

export type MessageRole = "user" | "acharya";

export interface CounselMessage {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: number;
  /** For acharya messages — the citations actually used in the answer */
  citationsUsed?: string[];
  /** For acharya messages — the full retrieved set the answer drew from */
  sources?: RetrievedVerse[];
  /** True when the safety filter triggered */
  brokeCharacter?: boolean;
}

interface CounselState {
  messages: CounselMessage[];
  appendUser: (text: string) => CounselMessage;
  appendAcharya: (
    text: string,
    citationsUsed: string[],
    sources: RetrievedVerse[],
    brokeCharacter?: boolean
  ) => CounselMessage;
  clear: () => void;
  /** Last N turns formatted for the API conversation history */
  recentHistory: (n: number) => Array<{ role: MessageRole; text: string }>;
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const useCounselStore = create<CounselState>()(
  persist(
    (set, get) => ({
      messages: [],

      appendUser: (text) => {
        const m: CounselMessage = {
          id: uid(),
          role: "user",
          text,
          createdAt: Date.now(),
        };
        set((s) => ({ messages: [...s.messages, m] }));
        return m;
      },

      appendAcharya: (text, citationsUsed, sources, brokeCharacter) => {
        const m: CounselMessage = {
          id: uid(),
          role: "acharya",
          text,
          createdAt: Date.now(),
          citationsUsed,
          sources,
          brokeCharacter,
        };
        set((s) => ({ messages: [...s.messages, m] }));
        return m;
      },

      clear: () => set({ messages: [] }),

      recentHistory: (n) =>
        get()
          .messages.slice(-n)
          .map(({ role, text }) => ({ role, text })),
    }),
    {
      name: "sadhana.counsel",
      storage: createJSONStorage(() => localStorage),
      // Don't persist sources to localStorage (large; can be re-fetched if needed)
      partialize: (state) => ({
        messages: state.messages.map((m) => ({
          ...m,
          sources: undefined, // strip heavy retrieval data from disk
        })),
      }),
    }
  )
);
