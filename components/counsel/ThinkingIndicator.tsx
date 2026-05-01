"use client";

import { OmGlyph } from "@/components/gurukul/OmGlyph";

const PHASES = [
  "consulting the texts",
  "listening across the verses",
  "weighing the words",
  "the Acharya gathers his thought",
];

export function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3 max-w-[85%]">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-saffron/15 border border-saffron/40 flex items-center justify-center">
        <OmGlyph size={18} tone="saffron" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-linear-to-br from-ivory-deep to-parchment border border-gold/40 px-4 py-3 shadow-sm">
        <span className="font-lyric-italic text-sm text-earth-deep">
          <span className="thinking-cycle">{PHASES[0]}</span>
          <span className="thinking-dots">…</span>
        </span>
      </div>

      <style>{`
        @keyframes thinking-cycle {
          0%, 24% { content: "${PHASES[0]}"; }
          25%, 49% { content: "${PHASES[1]}"; }
          50%, 74% { content: "${PHASES[2]}"; }
          75%, 100% { content: "${PHASES[3]}"; }
        }
        @keyframes thinking-dots {
          0%, 20% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
        .thinking-cycle {
          display: inline-block;
        }
        .thinking-dots {
          display: inline-block;
          animation: thinking-dots 1.4s ease-in-out infinite;
          margin-left: 2px;
        }
      `}</style>
    </div>
  );
}
