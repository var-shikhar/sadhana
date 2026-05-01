"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { GoldRule } from "@/components/gurukul/GoldRule";
import { cn } from "@/lib/utils";
import {
  useReflectionChips,
  useCreateReflectionChip,
  useUpdateReflectionChip,
  useDeleteReflectionChip,
} from "@/hooks/useReflectionChips";
import {
  CHIP_CATEGORY_META,
  CHIP_CATEGORY_ORDER,
  type ChipCategory,
  type ReflectionChip,
} from "@/types";

const TONE_DOT: Record<ChipCategory, string> = {
  good: "bg-sage",
  neutral: "bg-earth-mid",
  bad: "bg-saffron",
};

const TONE_BORDER: Record<ChipCategory, string> = {
  good: "border-sage/40",
  neutral: "border-earth-mid/40",
  bad: "border-saffron/40",
};

export default function ReflectionChipsSettingsPage() {
  const { chips, loading } = useReflectionChips();
  const create = useCreateReflectionChip();
  const update = useUpdateReflectionChip();
  const remove = useDeleteReflectionChip();

  const [draftName, setDraftName] = useState("");
  const [draftCategory, setDraftCategory] = useState<ChipCategory>("good");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<ChipCategory, ReflectionChip[]> = {
      good: [],
      neutral: [],
      bad: [],
    };
    for (const c of chips) {
      if (!c.isActive) continue;
      map[c.category].push(c);
    }
    return map;
  }, [chips]);

  async function handleCreate() {
    const name = draftName.trim();
    if (!name) return;
    setCreateError(null);
    try {
      await create.mutateAsync({ name, category: draftCategory });
      setDraftName("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not save");
    }
  }

  function startEdit(chip: ReflectionChip) {
    setEditingId(chip.id);
    setEditingName(chip.name);
  }

  async function commitEdit(chip: ReflectionChip) {
    const name = editingName.trim();
    if (!name || name === chip.name) {
      setEditingId(null);
      return;
    }
    await update.mutateAsync({ id: chip.id, name });
    setEditingId(null);
  }

  async function reclassify(chip: ReflectionChip, next: ChipCategory) {
    if (chip.category === next) return;
    await update.mutateAsync({ id: chip.id, category: next });
  }

  return (
    <div className="space-y-6 py-2">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] text-earth-mid">
        <Link href="/settings" className="font-pressure-caps hover:text-earth-deep">
          Settings
        </Link>
        <span>·</span>
        <span className="font-pressure-caps text-earth-deep">Chip library</span>
      </div>

      <header className="text-center space-y-2 relative">
        <LabelTiny>Vivekas · the discriminations</LabelTiny>
        <h1 className="font-lyric text-3xl text-ink">Your reflection chips.</h1>
        <p className="font-lyric-italic text-sm text-earth-deep max-w-md mx-auto">
          The vocabulary you use to read your day. Add, rename, or move a chip
          between Good · Neutral · Bad. Old reflections keep their original
          words even if you delete a chip later.
        </p>
      </header>

      <GoldRule width="section" />

      {/* Add new chip */}
      <section className="space-y-3">
        <LabelTiny className="block">Add a chip</LabelTiny>
        <Card className="bg-ivory-deep border-gold/40">
          <CardContent className="pt-6 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value.slice(0, 60))}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="e.g. deep work block, scrolling, walked the dog"
                className="bg-ivory border-gold/40 flex-1"
                disabled={create.isPending}
              />
              <div className="flex rounded-full border border-gold/40 bg-ivory p-1 self-start">
                {CHIP_CATEGORY_ORDER.map((cat) => {
                  const meta = CHIP_CATEGORY_META[cat];
                  const isActive = draftCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setDraftCategory(cat)}
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-pressure-caps tracking-wider transition-all flex items-center gap-1.5",
                        isActive
                          ? "bg-ink text-ivory shadow-sm"
                          : "text-earth-deep hover:bg-ivory-deep"
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[cat])} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
              <Button onClick={handleCreate} disabled={create.isPending || !draftName.trim()}>
                {create.isPending ? "Adding…" : "Add"}
              </Button>
            </div>
            {createError && (
              <p className="text-[11px] text-saffron font-lyric-italic">{createError}</p>
            )}
          </CardContent>
        </Card>
      </section>

      <GoldRule width="section" />

      {/* Library — three columns */}
      <section className="space-y-3">
        <LabelTiny className="block">Your library</LabelTiny>
        {loading ? (
          <p className="font-lyric-italic text-earth-mid text-sm">Loading...</p>
        ) : chips.length === 0 ? (
          <Card className="bg-ivory-deep border-gold/40">
            <CardContent className="pt-6 pb-6 text-center">
              <p className="font-lyric-italic text-sm text-earth-mid">
                No chips yet. Add a few above, or add them inline on the Reflect tab as you go.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {CHIP_CATEGORY_ORDER.map((cat) => {
              const list = grouped[cat];
              const meta = CHIP_CATEGORY_META[cat];
              return (
                <div
                  key={cat}
                  className={cn(
                    "rounded-md border bg-ivory-deep p-3 space-y-2",
                    TONE_BORDER[cat]
                  )}
                >
                  <header className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[cat])} />
                      <span className="font-pressure-caps text-[10px] text-earth-deep">
                        {meta.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-earth-mid tabular-nums">
                      {list.length}
                    </span>
                  </header>

                  {list.length === 0 ? (
                    <p className="font-lyric-italic text-[12px] text-earth-mid/70 italic py-2">
                      empty bucket
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {list.map((chip) => {
                        const isEditing = editingId === chip.id;
                        return (
                          <li
                            key={chip.id}
                            className="rounded border border-gold/25 bg-ivory p-2 space-y-1.5 group"
                          >
                            {isEditing ? (
                              <input
                                autoFocus
                                value={editingName}
                                onChange={(e) =>
                                  setEditingName(e.target.value.slice(0, 60))
                                }
                                onBlur={() => void commitEdit(chip)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void commitEdit(chip);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                                className="w-full bg-transparent outline-none font-lyric text-[13px] text-ink border-b border-gold/40"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEdit(chip)}
                                className="text-left w-full font-lyric text-[13px] text-ink hover:text-saffron transition-colors"
                              >
                                {chip.name}
                              </button>
                            )}

                            <div className="flex items-center justify-between gap-2">
                              {/* Move-to controls */}
                              <div className="flex gap-1">
                                {CHIP_CATEGORY_ORDER.filter((c) => c !== chip.category).map(
                                  (target) => (
                                    <button
                                      key={target}
                                      type="button"
                                      onClick={() => void reclassify(chip, target)}
                                      title={`Move to ${CHIP_CATEGORY_META[target].label}`}
                                      className="text-[9px] font-pressure-caps text-earth-mid hover:text-ink transition-colors flex items-center gap-0.5"
                                    >
                                      <span
                                        className={cn(
                                          "h-1 w-1 rounded-full",
                                          TONE_DOT[target]
                                        )}
                                      />
                                      → {CHIP_CATEGORY_META[target].label}
                                    </button>
                                  )
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Remove "${chip.name}"?`)) {
                                    void remove.mutateAsync(chip.id);
                                  }
                                }}
                                className="text-[9px] text-earth-mid hover:text-saffron transition-colors"
                                aria-label={`Remove ${chip.name}`}
                              >
                                ✕
                              </button>
                            </div>

                            {chip.useCount > 0 && (
                              <p className="text-[9px] text-earth-mid">
                                used {chip.useCount}×
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <GoldRule width="section" />

      <Link
        href="/settings"
        className="block text-center font-pressure-caps text-[10px] text-earth-mid hover:text-earth-deep"
      >
        ← back to settings
      </Link>
    </div>
  );
}
