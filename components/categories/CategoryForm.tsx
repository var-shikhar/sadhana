"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { IconPicker } from "./IconPicker";
import { ColorPicker } from "./ColorPicker";
import { PriorityPicker } from "./PriorityPicker";
import { CATEGORY_ICONS, type Category, type CategoryColor } from "@/types";

interface CategoryFormProps {
  initial?: Partial<Category>;
  onSubmit: (data: {
    title: string;
    description: string | null;
    icon: string;
    color: CategoryColor;
    priority: number;
  }) => void | Promise<void>;
  onCancel?: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function CategoryForm({
  initial,
  onSubmit,
  onCancel,
  submitting = false,
  submitLabel = "Create category",
}: CategoryFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState<string>(initial?.icon ?? CATEGORY_ICONS[0]);
  const [color, setColor] = useState<CategoryColor>(initial?.color ?? "saffron");
  const [priority, setPriority] = useState<number>(initial?.priority ?? 3);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    void onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      icon,
      color,
      priority,
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
        <LabelTiny>Icon</LabelTiny>
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      <div className="space-y-2">
        <LabelTiny>Color</LabelTiny>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="space-y-2">
        <LabelTiny>Priority</LabelTiny>
        <PriorityPicker value={priority} onChange={setPriority} />
      </div>

      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={!title.trim() || submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
