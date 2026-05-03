"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ButtonBare } from "@/components/ui/button";
import type { Nudge } from "@/lib/prompts/observer";

interface NudgeCardProps {
  nudge: Nudge;
  onDismiss?: (id: string) => void;
  className?: string;
}

const SEVERITY_STYLE: Record<
  Nudge["severity"],
  { border: string; tint: string; label: string; labelColor: string }
> = {
  gentle: {
    border: "border-gold/40",
    tint: "bg-ivory-deep/80",
    label: "Notice",
    labelColor: "text-earth-mid",
  },
  important: {
    border: "border-saffron/60",
    tint: "bg-saffron/8",
    label: "Notice",
    labelColor: "text-saffron",
  },
  celebration: {
    border: "border-saffron/40",
    tint: "bg-linear-to-br from-ivory-deep to-parchment",
    label: "Kept",
    labelColor: "text-saffron",
  },
};

export function NudgeCard({ nudge, onDismiss, className }: NudgeCardProps) {
  const s = SEVERITY_STYLE[nudge.severity];

  return (
    <div
      className={cn(
        "relative rounded-lg border p-4 space-y-2",
        s.border,
        s.tint,
        className
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn("font-pressure-caps text-[9px] tracking-[3px]", s.labelColor)}>
          {s.label}
        </span>
        {onDismiss && (
          <ButtonBare
            type="button"
            aria-label="Dismiss"
            onClick={() => onDismiss(nudge.id)}
            className="text-earth-mid/60 hover:text-earth-mid transition-colors text-lg leading-none"
          >
            ×
          </ButtonBare>
        )}
      </div>
      <p className="font-lyric text-base text-ink leading-snug">{nudge.title}</p>
      <p className="font-lyric-italic text-sm text-earth-deep leading-relaxed">
        {nudge.body}
      </p>
      {nudge.action && (
        <div className="pt-1">
          <Link
            href={nudge.action.href}
            className="inline-block font-pressure-caps text-[10px] tracking-[2px] text-saffron hover:text-saffron/80 underline-offset-4 hover:underline"
          >
            {nudge.action.label} →
          </Link>
        </div>
      )}
    </div>
  );
}
