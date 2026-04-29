"use client";

import { cn } from "@/lib/utils";
import { CATEGORY_ICONS } from "@/types";

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  return (
    <div className={cn("grid grid-cols-5 gap-2", className)}>
      {CATEGORY_ICONS.map((icon) => {
        const active = value === icon;
        return (
          <button
            type="button"
            key={icon}
            onClick={() => onChange(icon)}
            aria-label={`Pick icon ${icon}`}
            aria-pressed={active}
            className={cn(
              "h-11 rounded border bg-ivory text-2xl flex items-center justify-center transition-all",
              active
                ? "border-saffron bg-saffron/10 ring-2 ring-saffron/30"
                : "border-gold/40 hover:border-saffron/60"
            )}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
