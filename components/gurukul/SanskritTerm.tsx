"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/stores/ui";

const FADE_AFTER = 3;

interface SanskritTermProps {
  term: string;
  gloss: string;
  className?: string;
  termClassName?: string;
}

export function SanskritTerm({ term, gloss, className, termClassName }: SanskritTermProps) {
  const glossCount = useUIStore((s) => s.glossCount(term));
  const bumpGloss = useUIStore((s) => s.bumpGloss);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    bumpGloss(term);
  }, [term, bumpGloss]);

  // Pre-hydration we can't read the persisted value safely; render without
  // the gloss to avoid SSR/CSR mismatch and a flash.
  const showGloss = hydrated && glossCount < FADE_AFTER;

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
