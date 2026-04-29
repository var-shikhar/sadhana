"use client";

import { Input } from "@/components/ui/input";

interface SankalpaFormProps {
  habits: string[];
  sankalpas: Record<string, string>;
  onChange: (habitName: string, sankalpa: string) => void;
}

const PLACEHOLDER_TEMPLATES = [
  "After my morning chai, in the study room...",
  "Right before bed, on my mat...",
  "At my desk, after lunch...",
  "On the balcony, at sunrise...",
  "After brushing teeth, in the kitchen...",
];

function placeholderForIndex(i: number): string {
  return PLACEHOLDER_TEMPLATES[i % PLACEHOLDER_TEMPLATES.length];
}

export function SankalpaForm({ habits, sankalpas, onChange }: SankalpaFormProps) {
  return (
    <div className="space-y-4">
      <p className="font-lyric-italic text-sm text-earth-deep">
        A <span className="text-saffron">Sankalpa</span> is a firm intention —
        when and where you will practice. Triples completion.
      </p>

      <div className="space-y-3">
        {habits.map((habit, i) => (
          <div
            key={habit}
            className="rounded-lg border border-gold/40 bg-ivory/70 p-4 space-y-2"
          >
            <div className="font-pressure-caps text-[11px] text-saffron tracking-[3px]">
              {habit}
            </div>
            <Input
              value={sankalpas[habit] || ""}
              onChange={(e) => onChange(habit, e.target.value)}
              placeholder={placeholderForIndex(i)}
              className="bg-ivory border-gold/40 placeholder:font-lyric-italic placeholder:text-earth-mid"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
