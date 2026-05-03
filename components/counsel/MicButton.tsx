"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ButtonBare } from "@/components/ui/button";

interface MicButtonProps {
  isListening: boolean;
  supported: boolean;
  onToggle: () => void;
  disabled?: boolean;
  /** Apply dark-theme classes for the Counsel surface. */
  variant?: "light" | "dark";
}

/**
 * Mic button is ALWAYS rendered. When the browser doesn't support the Web
 * Speech API, it stays visible but disabled with an explanatory tooltip —
 * better than silently disappearing, which makes the user think the
 * feature is broken when in fact their browser is the issue.
 */
export function MicButton({
  isListening,
  supported,
  onToggle,
  disabled,
  variant = "light",
}: MicButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [permState, setPermState] = useState<
    "unknown" | "granted" | "denied" | "prompt"
  >("unknown");

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    navigator.permissions
      // Some browsers (Firefox, older Safari) reject the 'microphone' name.
      // We swallow the rejection — permState stays "unknown".
      .query({ name: "microphone" as PermissionName })
      .then((status) => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPermState(status.state as typeof permState);
        status.onchange = () => setPermState(status.state as typeof permState);
      })
      .catch(() => undefined);
  }, []);

  const isUnavailable = !supported;
  const isDenied = supported && permState === "denied";

  function handleClick() {
    if (isUnavailable || isDenied) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
      return;
    }
    onToggle();
  }

  const baseColors =
    variant === "dark"
      ? isListening
        ? "bg-saffron border-saffron text-ivory"
        : isUnavailable || isDenied
        ? "bg-ink-soft/60 border-earth-mid/40 text-earth-mid/50"
        : "bg-ink-soft border-earth-mid/40 text-parchment hover:border-saffron/60 hover:text-saffron"
      : isListening
      ? "bg-saffron border-saffron text-ivory"
      : isUnavailable || isDenied
      ? "bg-ivory-deep/40 border-gold/20 text-earth-mid/50"
      : "bg-ivory-deep border-gold/40 text-earth-deep hover:border-saffron/60";

  const tooltipText = isUnavailable
    ? "Voice input needs Chrome, Edge, or Safari (and a secure connection)."
    : isDenied
    ? "Microphone access denied. Enable it in your browser's site settings."
    : null;

  return (
    <div className="relative">
      <ButtonBare
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={
          isListening
            ? "Stop listening"
            : isUnavailable
            ? "Voice not available"
            : "Speak"
        }
        aria-pressed={isListening}
        className={cn(
          "relative flex items-center justify-center w-10 h-10 rounded-full border transition-all",
          baseColors,
          disabled && "opacity-50 cursor-not-allowed",
          (isUnavailable || isDenied) && "cursor-help"
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
          {isUnavailable && (
            <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" />
          )}
        </svg>
      </ButtonBare>

      {showTooltip && tooltipText && (
        <div
          role="tooltip"
          className={cn(
            "absolute right-0 bottom-12 w-56 rounded-lg border p-3 shadow-lg z-10 animate-tooltip-in",
            variant === "dark"
              ? "bg-ink-soft border-earth-mid/40 text-parchment"
              : "bg-ivory-deep border-gold/40 text-ink"
          )}
        >
          <p className="font-lyric-italic text-xs leading-relaxed">
            {tooltipText}
          </p>
        </div>
      )}

      <style>{`
        @keyframes mic-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.35); opacity: 0; }
        }
        .animate-mic-pulse {
          animation: mic-pulse 1.6s ease-out infinite;
        }
        @keyframes tooltip-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-tooltip-in {
          animation: tooltip-in 200ms ease-out forwards;
        }
      `}</style>
    </div>
  );
}
