"use client";

import { cn } from "@/lib/utils";
import { CATEGORY_COLORS, type CategoryColor } from "@/types";

interface ColorPickerProps {
  value: CategoryColor;
  onChange: (c: CategoryColor) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  return (
    <div className={cn("flex gap-2 flex-wrap", className)}>
      {CATEGORY_COLORS.map((c) => {
        const active = value === c.value;
        return (
          <button
            type="button"
            key={c.value}
            onClick={() => onChange(c.value)}
            aria-label={`Pick color ${c.label}`}
            aria-pressed={active}
            className={cn(
              "h-9 w-9 rounded-full border-2 transition-all",
              active
                ? "border-ink ring-2 ring-saffron/40 scale-110"
                : "border-ivory hover:scale-105"
            )}
            style={{ backgroundColor: c.hex }}
          />
        );
      })}
    </div>
  );
}
