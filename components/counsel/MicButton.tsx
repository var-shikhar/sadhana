"use client";

import { cn } from "@/lib/utils";

interface MicButtonProps {
  isListening: boolean;
  supported: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function MicButton({
  isListening,
  supported,
  onToggle,
  disabled,
}: MicButtonProps) {
  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={isListening ? "Stop listening" : "Speak"}
      aria-pressed={isListening}
      className={cn(
        "relative flex items-center justify-center w-9 h-9 rounded-full border transition-all",
        isListening
          ? "bg-saffron border-saffron text-ivory"
          : "bg-ivory-deep border-gold/40 text-earth-deep hover:border-saffron/60",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {isListening && (
        <span className="absolute inset-0 rounded-full border-2 border-saffron animate-mic-pulse" />
      )}
      <svg
        className="w-4 h-4 relative z-10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
      <style>{`
        @keyframes mic-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.35); opacity: 0; }
        }
        .animate-mic-pulse {
          animation: mic-pulse 1.6s ease-out infinite;
        }
      `}</style>
    </button>
  );
}
