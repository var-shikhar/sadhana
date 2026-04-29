"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PITFALL_TAGS, familyForTag, type PitfallTag } from "@/types";

interface QuickModeProps {
  onSubmit: (tags: PitfallTag[], note: string) => Promise<void>;
}

export function QuickMode({ onSubmit }: QuickModeProps) {
  const [selectedTags, setSelectedTags] = useState<PitfallTag[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggleTag(tag: PitfallTag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    await onSubmit(selectedTags, note);
    setSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 font-lyric-italic text-sm text-earth-deep">
          What got in your way today?
        </h3>
        <div className="flex flex-wrap gap-2">
          {PITFALL_TAGS.map((tag) => {
            const family = familyForTag(tag);
            const selected = selectedTags.includes(tag);
            const borderColor = family === "Restraint" ? "border-sage" : "border-saffron";
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors font-sans",
                  borderColor,
                  selected
                    ? family === "Restraint"
                      ? "bg-sage/20 text-ink"
                      : "bg-saffron/15 text-ink"
                    : "bg-ivory text-earth-deep hover:bg-ivory-deep"
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="label-tiny">Quick note (optional)</label>
        <Textarea
          placeholder="Anything on your mind..."
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 280))}
          maxLength={280}
          rows={3}
          className="bg-ivory border-gold/40"
        />
        <p className="text-right text-xs text-earth-mid">{note.length}/280</p>
      </div>

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={submitting || selectedTags.length === 0}
      >
        {submitting ? "Saving..." : "Save Quick Reflection"}
      </Button>
    </div>
  );
}
