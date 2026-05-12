"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ButtonBare } from "@/components/ui/button";

interface CallControlsProps {
  /** Wall-clock elapsed seconds. Driven by parent. */
  elapsedSec: number;
  /** Total cap in seconds — timer turns saffron when within last 20% of cap. */
  capSec: number;
  /** True when the user has muted their mic. */
  muted: boolean;
  onToggleMute: () => void;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function CallControls({
  elapsedSec,
  capSec,
  muted,
  onToggleMute,
}: CallControlsProps) {
  const warnThreshold = Math.floor(capSec * 0.8);
  const warning = elapsedSec >= warnThreshold;
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (!warning) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPulse(true);
    const id = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(id);
  }, [elapsedSec, warning]);

  return (
    <div className="flex items-center justify-center gap-6">
      <ButtonBare
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? "Unmute mic" : "Mute mic"}
        aria-pressed={muted}
        className={cn(
          "w-12 h-12 rounded-full border flex items-center justify-center transition-colors",
          muted
            ? "bg-saffron border-saffron text-ivory"
            : "bg-ink-soft border-earth-mid/40 text-parchment hover:border-saffron/60"
        )}
      >
        <svg
          className="w-5 h-5"
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
          {muted && <line x1="3" y1="3" x2="21" y2="21" />}
        </svg>
      </ButtonBare>

      <div
        className={cn(
          "font-mono text-base tabular-nums tracking-wide",
          warning ? "text-saffron" : "text-parchment/70",
          pulse && "scale-105"
        )}
        style={{ transition: "transform 200ms ease-out" }}
      >
        ⏱ {fmt(elapsedSec)}
      </div>
    </div>
  );
}
