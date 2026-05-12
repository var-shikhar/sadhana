import type { RetrievedVerse } from "@/lib/scripture/retrieve";

/** Returned by POST /api/counsel/voice/session. */
export interface SessionConfig {
  callId: string;
  ephemeralKey: string;
  expiresAt: number;
  model: string;
  voice: string;
  greeting: string;
  language: "en" | "hi";
}

/** Slim verse shape returned by retrieve_scripture's HTTP endpoint and
 *  by the data-channel tool-result event. Lighter than RetrievedVerse —
 *  no neighbor windows, no translation arrays. */
export interface VoiceVerse {
  externalId: string;
  book: string;
  chapter: number;
  verse: number;
  sanskritDevanagari: string | null;
  translator: string;
  englishText: string;
  similarity: number;
}

/** Translate a VoiceVerse into the RetrievedVerse shape the existing
 *  SourcesModal / CitationChip code consumes. Lossy but sufficient. */
export function voiceVerseToRetrieved(v: VoiceVerse): RetrievedVerse {
  return {
    verseId: v.externalId, // verseId is opaque to the UI; reuse externalId
    externalId: v.externalId,
    book: v.book,
    chapter: v.chapter,
    verse: v.verse,
    subVerse: null,
    sanskritDevanagari: v.sanskritDevanagari,
    sanskritIast: null,
    similarity: v.similarity,
    source: "bullseye",
    matchedTranslator: v.translator,
    matchedText: v.englishText,
    translations: [
      {
        translator: v.translator,
        editionYear: null,
        englishText: v.englishText,
      },
    ],
    tags: [],
  };
}

/** Voice-turn shape lives in lib/stores/counsel.ts (added in Task 3) so the
 *  store's appendVoiceTranscript signature is the source of truth. Re-export
 *  here so voice modules can import everything from one place. */
export type { VoiceTurn } from "@/lib/stores/counsel";

export type CallStatusKind =
  | "idle"
  | "connecting"
  | "listening"
  | "acharya_speaking"
  | "tool_running"
  | "reconnecting"
  | "ended";
