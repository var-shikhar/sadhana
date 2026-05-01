"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { OmGlyph } from "@/components/gurukul/OmGlyph";

interface ThinkingIndicatorProps {
  variant?: "light" | "dark";
}

const PHRASES = [
  "consulting the texts",
  "listening across the verses",
  "weighing the words",
  "the Acharya gathers his thought",
  "the dust settles in the room",
];

/**
 * The Acharya's "thinking" state. Rich motion so the user never feels stuck:
 *  · OM glyph breathes (existing in OmGlyph)
 *  · Phrase cycles every 2.4s
 *  · Three pulsing dots
 *  · Saffron shimmer slides across the bubble base
 */
export function ThinkingIndicator({ variant = "light" }: ThinkingIndicatorProps) {
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % PHRASES.length);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  const bubbleColors =
    variant === "dark"
      ? "bg-linear-to-br from-[#1f1610] to-[#2b1810] border-earth-mid/40"
      : "bg-linear-to-br from-ivory-deep to-parchment border-gold/40";

  const avatarColors =
    variant === "dark"
      ? "bg-saffron/10 border-saffron/30"
      : "bg-saffron/15 border-saffron/40";

  const textColor =
    variant === "dark" ? "text-parchment/80" : "text-earth-deep";

  return (
    <div className="flex items-start gap-3 max-w-[85%]">
      <div
        className={cn(
          "shrink-0 w-9 h-9 rounded-full border flex items-center justify-center",
          avatarColors
        )}
      >
        <OmGlyph size={18} tone="saffron" />
      </div>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl rounded-tl-sm border px-4 py-3 shadow-sm min-w-45",
          bubbleColors
        )}
      >
        <div className="flex items-center gap-1.5 relative z-10">
          <span
            key={phraseIdx}
            className={cn("font-lyric-italic text-sm animate-phrase-fade", textColor)}
          >
            {PHRASES[phraseIdx]}
          </span>
          <span className="thinking-dot thinking-d1">·</span>
          <span className="thinking-dot thinking-d2">·</span>
          <span className="thinking-dot thinking-d3">·</span>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-px overflow-hidden">
          <div className="thinking-shimmer h-full" />
        </div>
      </div>

      <style>{`
        @keyframes phrase-fade {
          0% { opacity: 0; transform: translateY(2px); }
          12% { opacity: 1; transform: translateY(0); }
          88% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-2px); }
        }
        .animate-phrase-fade {
          animation: phrase-fade 2.4s ease-in-out forwards;
        }
        @keyframes thinking-pulse {
          0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-2px); }
        }
        .thinking-dot {
          color: #c46a1f;
          font-weight: 700;
          font-size: 16px;
          animation: thinking-pulse 1.4s ease-in-out infinite;
          line-height: 1;
        }
        .thinking-d1 { animation-delay: 0s; }
        .thinking-d2 { animation-delay: 0.18s; }
        .thinking-d3 { animation-delay: 0.36s; }

        @keyframes shimmer {
          0% { transform: translateX(-100%); opacity: 0; }
          25% { opacity: 1; }
          75% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        .thinking-shimmer {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(196, 106, 31, 0.6) 50%,
            transparent 100%
          );
          width: 100%;
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
