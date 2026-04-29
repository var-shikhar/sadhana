"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { GoalShapePicker } from "./GoalShapePicker";
import type { Goal, GoalShape } from "@/types";

interface GoalFormProps {
  initial?: Partial<Goal>;
  onSubmit: (data: {
    title: string;
    description: string | null;
    shape: GoalShape;
    weeklyTarget: number | null;
    totalTarget: number | null;
    deadlineDate: string | null;
  }) => void | Promise<void>;
  onCancel?: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function GoalForm({
  initial,
  onSubmit,
  onCancel,
  submitting = false,
  submitLabel = "Add goal",
}: GoalFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [shape, setShape] = useState<GoalShape | null>(initial?.shape ?? null);
  const [weeklyTarget, setWeeklyTarget] = useState<number>(
    initial?.weeklyTarget ?? 3
  );
  const [totalTarget, setTotalTarget] = useState<number>(
    initial?.totalTarget ?? 12
  );
  const [deadlineDate, setDeadlineDate] = useState<string>(
    initial?.deadlineDate ?? ""
  );

  // If parent passes a fresh initial after mount, sync (used for edit-mode)
  useEffect(() => {
    if (initial?.title !== undefined) setTitle(initial.title ?? "");
    if (initial?.description !== undefined) setDescription(initial.description ?? "");
    if (initial?.shape !== undefined) setShape(initial.shape ?? null);
    if (initial?.weeklyTarget !== undefined && initial.weeklyTarget !== null)
      setWeeklyTarget(initial.weeklyTarget);
    if (initial?.totalTarget !== undefined && initial.totalTarget !== null)
      setTotalTarget(initial.totalTarget);
    if (initial?.deadlineDate !== undefined && initial.deadlineDate !== null)
      setDeadlineDate(initial.deadlineDate);
  }, [initial]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shape || !title.trim()) return;
    void onSubmit({
      title: title.trim(),
      description: description?.trim() || null,
      shape,
      weeklyTarget: shape === "weekly" ? weeklyTarget : null,
      totalTarget: shape === "by_date" ? totalTarget : null,
      deadlineDate: shape === "by_date" ? deadlineDate || null : null,
    });
  }

  const canSubmit =
    !!shape &&
    !!title.trim() &&
    (shape !== "weekly" || weeklyTarget > 0) &&
    (shape !== "by_date" || (totalTarget > 0 && deadlineDate));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Step 1: shape (the most important question) */}
      <div className="space-y-2">
        <LabelTiny>What kind of goal?</LabelTiny>
        <GoalShapePicker value={shape} onChange={setShape} />
      </div>

      {/* Step 2: title + description (always visible) */}
      <div className="space-y-2">
        <LabelTiny>Goal title</LabelTiny>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 80))}
          placeholder="e.g. Meditate 10 minutes"
          className="bg-ivory border-gold/40"
          required
        />
      </div>

      <div className="space-y-2">
        <LabelTiny>Why this matters (optional)</LabelTiny>
        <Textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value.slice(0, 240))}
          placeholder="Context that helps you on hard days…"
          rows={2}
          className="bg-ivory border-gold/40"
        />
      </div>

      {/* Step 3: shape-specific fields */}
      {shape === "weekly" && (
        <div className="space-y-2">
          <LabelTiny>How many times per week?</LabelTiny>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1}
              max={7}
              value={weeklyTarget}
              onChange={(e) => setWeeklyTarget(Math.max(1, Math.min(7, Number(e.target.value) || 1)))}
              className="bg-ivory border-gold/40 w-20"
            />
            <span className="font-lyric-italic text-sm text-earth-deep">
              times each week
            </span>
          </div>
        </div>
      )}

      {shape === "by_date" && (
        <>
          <div className="space-y-2">
            <LabelTiny>How many in total?</LabelTiny>
            <Input
              type="number"
              min={1}
              value={totalTarget}
              onChange={(e) => setTotalTarget(Math.max(1, Number(e.target.value) || 1))}
              className="bg-ivory border-gold/40"
            />
          </div>
          <div className="space-y-2">
            <LabelTiny>By when?</LabelTiny>
            <Input
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="bg-ivory border-gold/40"
              required
            />
          </div>
        </>
      )}

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
        <Button type="submit" className="flex-1" disabled={!canSubmit || submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
