"use client";

import { cn } from "@/lib/utils";
import { ButtonBare } from "@/components/ui/button";

interface PriorityPickerProps {
  value: number; // 1..5
  onChange: (p: number) => void;
  className?: string;
}

const LABELS: Record<number, string> = {
  1: "Highest",
  2: "High",
  3: "Medium",
  4: "Low",
  5: "Lowest",
};

export function PriorityPicker({ value, onChange, className }: PriorityPickerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((p) => {
          const active = p <= value;
          const isSelected = p === value;
          return (
            <ButtonBare
              type="button"
              key={p}
              onClick={() => onChange(p)}
              aria-label={`Priority ${LABELS[p]}`}
              aria-pressed={isSelected}
              className={cn(
                "flex-1 h-2 rounded-full transition-colors",
                active ? "bg-saffron" : "bg-ivory-deep border border-gold/30"
              )}
            />
          );
        })}
      </div>
      <p className="font-lyric-italic text-xs text-earth-mid text-center">
        {LABELS[value]}{" "}
        <span className="text-earth-mid/60">— affects what surfaces first on home</span>
      </p>
    </div>
  );
}
