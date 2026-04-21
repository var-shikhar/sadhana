"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type PermaPillar, PERMA_LABELS, PERMA_DESCRIPTIONS } from "@/types";

interface PillarPickerProps {
  selected: PermaPillar[];
  onToggle: (pillar: PermaPillar) => void;
}

const PILLARS: PermaPillar[] = ["P", "E", "R", "M", "A"];

export function PillarPicker({ selected, onToggle }: PillarPickerProps) {
  return (
    <div className="space-y-3">
      {PILLARS.map((pillar) => {
        const isSelected = selected.includes(pillar);
        return (
          <Card
            key={pillar}
            className={cn(
              "cursor-pointer p-4 transition-all",
              isSelected
                ? "border-primary bg-primary/10"
                : "border-border hover:border-muted-foreground"
            )}
            onClick={() => onToggle(pillar)}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {pillar}
              </div>
              <div>
                <h3 className="font-semibold">{PERMA_LABELS[pillar]}</h3>
                <p className="text-sm text-muted-foreground">
                  {PERMA_DESCRIPTIONS[pillar]}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
