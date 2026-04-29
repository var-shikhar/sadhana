"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "sadhana.glossSeen";
const FADE_AFTER = 3;

function readGlossCount(term: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const map = JSON.parse(raw) as Record<string, number>;
    return map[term] ?? 0;
  } catch {
    return 0;
  }
}

function bumpGlossCount(term: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    map[term] = (map[term] ?? 0) + 1;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

interface SanskritTermProps {
  term: string;
  gloss: string;
  className?: string;
  termClassName?: string;
}

export function SanskritTerm({ term, gloss, className, termClassName }: SanskritTermProps) {
  const [showGloss, setShowGloss] = useState(false);

  useEffect(() => {
    const count = readGlossCount(term);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowGloss(count < FADE_AFTER);
    bumpGlossCount(term);
  }, [term]);

  return (
    <span className={cn("inline", className)}>
      <span className={cn("font-pressure-caps", termClassName)} aria-label={`${term} — ${gloss}`}>
        {term}
      </span>
      {showGloss && (
        <span className="font-lyric-italic text-earth-mid text-sm ml-1">
          — {gloss}
        </span>
      )}
    </span>
  );
}
