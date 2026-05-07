"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { ColorPicker } from "./ColorPicker";
import type { Category, CategoryColor } from "@/types";

interface CategoryFormProps {
  initial?: Partial<Category>;
  onSubmit: (data: {
    title: string;
    description: string | null;
    color: CategoryColor;
  }) => void | Promise<void>;
  onCancel?: () => void;
  onDelete?: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function CategoryForm({
  initial,
  onSubmit,
  onCancel,
  onDelete,
  submitting = false,
  submitLabel = "Create category",
}: CategoryFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [color, setColor] = useState<CategoryColor>(initial?.color ?? "saffron");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    void onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      color,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <LabelTiny>Title</LabelTiny>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 60))}
          placeholder="e.g. Health"
          className="bg-ivory border-gold/40"
          required
          autoFocus
        />
        <p className="text-[11px] text-earth-mid">{title.length}/60</p>
      </div>

      <div className="space-y-2">
        <LabelTiny>Description</LabelTiny>
        <Textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value.slice(0, 240))}
          placeholder="In a sentence — what does this area mean to you?"
          rows={2}
          className="bg-ivory border-gold/40"
        />
        <p className="text-[11px] text-earth-mid text-right">
          {(description ?? "").length}/240
        </p>
      </div>

      <div className="space-y-2">
        <LabelTiny>Color</LabelTiny>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        {onDelete ? (
          <Button
            type="button"
            variant="outline"
            onClick={onDelete}
            disabled={submitting}
            className="text-saffron border-saffron/40 hover:bg-saffron/10"
          >
            Remove
          </Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={!title.trim() || submitting}>
            {submitting ? "Saving…" : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
