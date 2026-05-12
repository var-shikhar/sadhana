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
  /** Set to "voice" when the message originated in a real-time call. */
  via?: "voice";
  /** Voice-call duration in seconds — set on the first user turn of the
   *  call so the UI can render a "from voice · mm:ss" badge. */
  durationSec?: number;
}

/** A single turn captured during a voice call. The transcript builder in
 *  CallScreen produces an ordered list of these, then hands them to the
 *  store at end-of-call via appendVoiceTranscript. */
export interface VoiceTurn {
  role: MessageRole;
  text: string;
  at: number;
  /** Verses fetched by retrieve_scripture during this turn (acharya turns only). */
  citations?: RetrievedVerse[];
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
  /** Append the full transcript of a voice call as a sequence of normal
   *  CounselMessages. Each carries via: "voice"; the first message of the
   *  batch carries durationSec so the UI can render a badge. */
  appendVoiceTranscript: (turns: VoiceTurn[], durationSec: number) => void;
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

      appendVoiceTranscript: (turns, durationSec) => {
        if (turns.length === 0) return;
        const batch: CounselMessage[] = turns.map((t, i) => ({
          id: uid(),
          role: t.role,
          text: t.text,
          createdAt: t.at,
          via: "voice",
          // Stamp duration only on the first message of the batch so the
          // "from voice · 04:12" badge renders once per call.
          durationSec: i === 0 ? durationSec : undefined,
          citationsUsed:
            t.role === "acharya" && t.citations
              ? t.citations.map((v) => v.externalId)
              : undefined,
          sources: t.role === "acharya" ? t.citations : undefined,
        }));
        set((s) => ({ messages: [...s.messages, ...batch] }));
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
