"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PITFALL_TAGS, type PitfallTag } from "@/types";

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
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          What got in your way today?
        </h3>
        <div className="flex flex-wrap gap-2">
          {PITFALL_TAGS.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? "default" : "outline"}
              className={cn(
                "cursor-pointer px-3 py-1.5 text-sm transition-all",
                selectedTags.includes(tag) && "bg-primary text-primary-foreground"
              )}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Quick note (optional)
        </label>
        <Textarea
          placeholder="Anything on your mind..."
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 280))}
          maxLength={280}
          rows={3}
        />
        <p className="text-right text-xs text-muted-foreground">
          {note.length}/280
        </p>
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
