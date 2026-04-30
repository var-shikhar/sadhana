"use client";

import { usePrompts } from "@/hooks/usePrompts";
import { NudgeCard } from "./NudgeCard";

interface NudgeStackProps {
  /** When set, only category-scoped nudges for this id render. When unset, only unscoped nudges. */
  categoryId?: string;
  className?: string;
  /** Hard cap to avoid overwhelming the user — default 3. */
  max?: number;
}

export function NudgeStack({ categoryId, className, max = 3 }: NudgeStackProps) {
  const { nudges, dismiss } = usePrompts({ categoryId });
  if (nudges.length === 0) return null;

  return (
    <div className={className}>
      <div className="space-y-2">
        {nudges.slice(0, max).map((n) => (
          <NudgeCard key={n.id} nudge={n} onDismiss={dismiss} />
        ))}
      </div>
    </div>
  );
}
