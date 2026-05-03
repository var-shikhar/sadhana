"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ButtonBare } from "@/components/ui/button";

interface GuidedExplainerProps {
  /** The plain-English question or label for the section. */
  question: string;
  /** Short concept gloss, shown when the user opens the explainer. */
  explanation: string;
  /** Optional one-line example or list to seed the user's thinking. */
  examples?: string;
  className?: string;
  /** Default open. Use this on first-run surfaces; default closed elsewhere. */
  defaultOpen?: boolean;
}

/**
 * The guided pattern. Renders a question, a "Tell me more" disclosure,
 * and (when opened) the concept explanation in plain language.
 *
 * Use this anywhere the user might not know what to do or what a term means.
 */
export function GuidedExplainer({
  question,
  explanation,
  examples,
  className,
  defaultOpen = false,
}: GuidedExplainerProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("space-y-1", className)}>
      <p className="font-lyric text-lg text-ink leading-tight">{question}</p>
      <ButtonBare
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="font-lyric-italic text-xs text-saffron hover:text-saffron/80 underline-offset-2 hover:underline"
      >
        {open ? "got it" : "tell me more"}
      </ButtonBare>
      {open && (
        <div className="mt-2 rounded border-l-2 border-saffron/50 bg-ivory-deep/60 px-3 py-2 space-y-1.5">
          <p className="font-lyric-italic text-sm text-earth-deep leading-relaxed">
            {explanation}
          </p>
          {examples && (
            <p className="text-xs text-earth-mid">
              <span className="font-pressure-caps text-[9px] tracking-[2px]">
                e.g.
              </span>{" "}
              {examples}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
