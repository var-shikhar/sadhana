"use client";

import { cn } from "@/lib/utils";
import type { VoiceVerse } from "@/lib/voice/types";

interface CitationToastProps {
  verse: VoiceVerse;
  onTap?: () => void;
  className?: string;
}

/** Soft-pink parchment card. The user taps to open the SourcesModal for
 *  the underlying verse. Visual styling is tuned to sit cleanly against
 *  the dark ink background of the call screen. */
export function CitationToast({
  verse,
  onTap,
  className,
}: CitationToastProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={cn(
        "block w-full max-w-md text-left rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm",
        "bg-rose-100/10 border-rose-300/30 text-parchment",
        "hover:border-rose-300/60 transition-colors",
        className
      )}
    >
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-rose-200/80 text-xs">✦</span>
        <span className="font-lyric text-sm text-rose-100">
          {verse.book} {verse.chapter}.{verse.verse}
        </span>
      </div>
      <p className="font-lyric-italic text-xs text-parchment/80 leading-relaxed line-clamp-2">
        “{verse.englishText}”
      </p>
    </button>
  );
}
