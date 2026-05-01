"use client";

import { cn } from "@/lib/utils";

interface SpeakerButtonProps {
  isSpeaking: boolean;
  supported: boolean;
  onToggle: () => void;
  className?: string;
}

export function SpeakerButton({
  isSpeaking,
  supported,
  onToggle,
  className,
}: SpeakerButtonProps) {
  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isSpeaking ? "Stop speaking" : "Speak this aloud"}
      aria-pressed={isSpeaking}
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-pressure-caps tracking-[2px] transition-colors",
        isSpeaking
          ? "text-saffron"
          : "text-earth-mid hover:text-saffron",
        className
      )}
    >
      <svg
        className="w-3.5 h-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {isSpeaking ? (
          <>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </>
        ) : (
          <line x1="23" y1="9" x2="17" y2="15" />
        )}
        {!isSpeaking && <line x1="17" y1="9" x2="23" y2="15" />}
      </svg>
      <span>{isSpeaking ? "Speaking" : "Speak"}</span>
    </button>
  );
}
