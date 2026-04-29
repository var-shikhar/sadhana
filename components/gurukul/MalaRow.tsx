"use client";

import { cn } from "@/lib/utils";
import { MalaBead, type BeadState } from "./MalaBead";

interface MalaRowProps {
  /** 27 entries oldest→newest. Use `getMalaState().recent27`. */
  beads: BeadState[];
  /** Bead diameter in px */
  beadSize?: number;
  /** Spacing in px between beads */
  gap?: number;
  className?: string;
}

/**
 * The 27-bead upamala — a small horizontal bead-strip for Home.
 * Pass exactly 27 beads (or fewer; the rest will render as future).
 */
export function MalaRow({ beads, beadSize = 8, gap = 4, className }: MalaRowProps) {
  const padded: BeadState[] = [...beads];
  while (padded.length < 27) padded.push("future");
  const display = padded.slice(0, 27);

  return (
    <div
      className={cn("flex items-center justify-center", className)}
      style={{ gap }}
    >
      {display.map((s, i) => (
        <MalaBead key={i} state={s} size={beadSize} />
      ))}
    </div>
  );
}
