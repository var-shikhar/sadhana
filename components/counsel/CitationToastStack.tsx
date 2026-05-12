"use client";

import { useEffect, useState } from "react";
import { CitationToast } from "./CitationToast";
import type { VoiceVerse } from "@/lib/voice/types";

interface ToastEntry {
  id: string;
  verse: VoiceVerse;
  enteredAt: number;
}

interface CitationToastStackProps {
  /** Verses to surface. New entries (by externalId) push onto the stack. */
  verses: VoiceVerse[];
  /** Fired when the user taps a toast — typically opens SourcesModal. */
  onTap?: (verse: VoiceVerse) => void;
}

const TOAST_LIFE_MS = 6_000;
const MAX_VISIBLE = 3;

/** Stack manager. Auto-dismisses each toast after 6s. Caps at 3 visible
 *  — if a 4th arrives, the oldest is dismissed immediately. */
export function CitationToastStack({
  verses,
  onTap,
}: CitationToastStackProps) {
  const [stack, setStack] = useState<ToastEntry[]>([]);

  // When `verses` changes (a new retrieval landed), push any externalIds
  // we haven't shown yet.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStack((prev) => {
      const seen = new Set(prev.map((t) => t.verse.externalId));
      const additions: ToastEntry[] = [];
      for (const v of verses) {
        if (!seen.has(v.externalId)) {
          additions.push({
            id: `${v.externalId}-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 6)}`,
            verse: v,
            enteredAt: Date.now(),
          });
        }
      }
      if (additions.length === 0) return prev;
      let next = [...prev, ...additions];
      if (next.length > MAX_VISIBLE) {
        next = next.slice(next.length - MAX_VISIBLE);
      }
      return next;
    });
  }, [verses]);

  // Auto-dismiss tick — every 250ms drop any toast older than TOAST_LIFE_MS.
  useEffect(() => {
    const id = setInterval(() => {
      setStack((prev) => {
        const now = Date.now();
        const kept = prev.filter((t) => now - t.enteredAt < TOAST_LIFE_MS);
        return kept.length === prev.length ? prev : kept;
      });
    }, 250);
    return () => clearInterval(id);
  }, []);

  if (stack.length === 0) return null;

  return (
    <div className="fixed left-0 right-0 bottom-32 px-4 pointer-events-none">
      <div className="mx-auto max-w-md space-y-2">
        {stack.map((t) => (
          <div key={t.id} className="pointer-events-auto animate-toast-in">
            <CitationToast verse={t.verse} onTap={() => onTap?.(t.verse)} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-toast-in {
          animation: toast-in 240ms ease-out both;
        }
      `}</style>
    </div>
  );
}
