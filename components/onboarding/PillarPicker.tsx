"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type PermaPillar, PERMA_LABELS, PERMA_DESCRIPTIONS } from "@/types";
import { KolamGrid } from "@/components/ornament/KolamGrid";

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
              "relative overflow-hidden cursor-pointer p-4 transition-all bg-ivory-deep border-gold/40 flex flex-col gap-2",
              isSelected
                ? "border-saffron bg-saffron/10"
                : "hover:border-gold"
            )}
            onClick={() => onToggle(pillar)}
          >
            <KolamGrid
              className="absolute inset-0 pointer-events-none"
              opacity={0.08}
              size={120}
            />
            {isSelected && (
              <span
                aria-hidden="true"
                className="absolute top-2 right-2 w-3 h-3 rounded-full bg-saffron"
              />
            )}
            <div className="flex items-center gap-3 relative">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full font-pressure text-lg",
                  isSelected
                    ? "bg-saffron text-ivory"
                    : "bg-ivory text-earth-deep border border-gold/40"
                )}
              >
                {pillar}
              </div>
              <div>
                <h3 className="font-lyric text-lg text-ink">{PERMA_LABELS[pillar]}</h3>
                <p className="font-lyric-italic text-sm text-earth-deep">
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
