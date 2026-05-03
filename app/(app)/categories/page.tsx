"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button, ButtonBare } from "@/components/ui/button";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { GoldRule } from "@/components/gurukul/GoldRule";
import { GuidedExplainer } from "@/components/gurukul/GuidedExplainer";
import { CategoryCard } from "@/components/categories/CategoryCard";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { LotusMandala } from "@/components/ornament/LotusMandala";
import { useCategories, useCreateCategory } from "@/hooks/useCategories";
import { STARTER_CATEGORIES, CATEGORY_COLORS } from "@/types";
import { cn } from "@/lib/utils";

type Mode = "browse" | "create" | "starter";

export default function CategoriesPage() {
  const { categories, loading } = useCategories();
  const create = useCreateCategory();
  const [mode, setMode] = useState<Mode>("browse");

  if (loading) {
    return <p className="font-lyric-italic text-earth-mid py-6">Loading…</p>;
  }

  const isEmpty = categories.length === 0;

  // ─── Empty state: guided walkthrough ───
  if (isEmpty && mode === "browse") {
    return (
      <div className="space-y-6 py-2 relative">
        <LotusMandala
          className="absolute -top-4 -right-6 pointer-events-none"
          opacity={0.10}
          size={200}
        />

        <header className="text-center space-y-2 relative">
          <LabelTiny>Begin here</LabelTiny>
          <h1 className="font-lyric text-3xl text-ink">
            What do you want to focus on?
          </h1>
        </header>

        <GoldRule width="section" />

        <GuidedExplainer
          defaultOpen
          question="A category is just an area of your life."
          explanation={`Think of categories as the rooms of a house. Health is one room. Work is another. Inner practice is another. Inside each room you'll later set goals — specific things you want to do — but for now, we're just naming the rooms.`}
          examples="Health · Work · Relationships · Inner Practice · Rest"
        />

        <div className="space-y-3">
          <LabelTiny className="block">Use a starter, or make your own</LabelTiny>
          <p className="font-lyric-italic text-sm text-earth-deep">
            Most people begin with one or two of these. Pick what resonates —
            you can edit anything, archive any, or write your own.
          </p>
        </div>

        <StarterGrid
          onAdopt={(starter) =>
            create.mutate(
              {
                title: starter.title,
                description: starter.description,
                icon: starter.icon,
                color: starter.color,
                priority: starter.priority,
              },
              { onSuccess: () => setMode("browse") }
            )
          }
          disabled={create.isPending}
        />

        <GoldRule width="section" />

        <div className="text-center">
          <Button variant="outline" onClick={() => setMode("create")}>
            Or create your own
          </Button>
        </div>

        <p className="text-center text-xs text-earth-mid pt-2">
          <Link href="/" className="hover:text-saffron">← back to home</Link>
        </p>
      </div>
    );
  }

  // ─── Create mode ───
  if (mode === "create") {
    return (
      <div className="space-y-6 py-2 relative">
        <header className="text-center space-y-2">
          <LabelTiny>New category</LabelTiny>
          <h1 className="font-lyric text-3xl text-ink">Name a focus area</h1>
        </header>

        <GoldRule width="section" />

        <GuidedExplainer
          question="Give it a clear, simple name."
          explanation={`Categories work best as one or two words. Don't overthink — you can always rename it. Pick a color and an icon you'll recognize at a glance.`}
          examples="Sleep · Reading · Family · Faith · Side project"
        />

        <Card className="bg-ivory-deep border-gold/40">
          <CardContent className="p-5">
            <CategoryForm
              onSubmit={(data) =>
                create.mutateAsync(data).then(() => setMode("browse"))
              }
              onCancel={() => setMode("browse")}
              submitting={create.isPending}
            />
          </CardContent>
        </Card>

        {create.isError && (
          <p className="text-sm text-destructive text-center">
            {(create.error as Error).message}
          </p>
        )}

        <p className="text-center text-xs text-earth-mid pt-2">
          <ButtonBare
            onClick={() => setMode("browse")}
            className="hover:text-saffron"
          >
            ← cancel
          </ButtonBare>
        </p>
      </div>
    );
  }

  // ─── Browse mode (has at least one category) ───
  return (
    <div className="space-y-6 py-2">
      <header className="text-center space-y-2">
        <LabelTiny>Your focus areas</LabelTiny>
        <h1 className="font-lyric text-3xl text-ink">Categories</h1>
        <p className="font-lyric-italic text-sm text-earth-deep">
          The rooms of your practice
        </p>
      </header>

      <GoldRule width="section" />

      <div className="space-y-3">
        {categories.map((c) => (
          <CategoryCard key={c.id} category={c} summary="goals coming next" />
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <Button className="flex-1" onClick={() => setMode("create")}>
          Add a category
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setMode("starter")}
        >
          Browse starters
        </Button>
      </div>

      {mode === ("starter" as Mode) && (
        <Card className="bg-ivory-deep border-gold/40 mt-4">
          <CardContent className="p-5 space-y-4">
            <LabelTiny className="block">Starter categories</LabelTiny>
            <StarterGrid
              onAdopt={(starter) =>
                create.mutate(
                  {
                    title: starter.title,
                    description: starter.description,
                    icon: starter.icon,
                    color: starter.color,
                    priority: starter.priority,
                  },
                  {
                    onSuccess: () => {
                      // stay on starter view; user may want to adopt several
                    },
                  }
                )
              }
              disabled={create.isPending}
              existingTitles={new Set(categories.map((c) => c.title.toLowerCase()))}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setMode("browse")}
            >
              Done
            </Button>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-earth-mid pt-2">
        <Link href="/" className="hover:text-saffron">← back to home</Link>
      </p>
    </div>
  );
}

function StarterGrid({
  onAdopt,
  disabled,
  existingTitles,
}: {
  onAdopt: (s: (typeof STARTER_CATEGORIES)[number]) => void;
  disabled?: boolean;
  existingTitles?: Set<string>;
}) {
  return (
    <div className="space-y-2">
      {STARTER_CATEGORIES.map((s) => {
        const colorHex =
          CATEGORY_COLORS.find((c) => c.value === s.color)?.hex ?? "#c46a1f";
        const adopted = existingTitles?.has(s.title.toLowerCase()) ?? false;
        return (
          <Card
            key={s.title}
            className={cn(
              "flex flex-row items-center gap-3 px-4 py-3 bg-ivory border-gold/30 transition-colors",
              !adopted && "hover:border-saffron/60 cursor-pointer",
              adopted && "opacity-50"
            )}
            onClick={() => {
              if (!adopted && !disabled) onAdopt(s);
            }}
          >
            <div
              aria-hidden
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: `${colorHex}1f`, border: `1.5px solid ${colorHex}` }}
            >
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-lyric text-base text-ink leading-tight">
                {s.title}
              </p>
              <p className="font-lyric-italic text-xs text-earth-deep mt-0.5">
                {s.description}
              </p>
            </div>
            {adopted ? (
              <span className="font-pressure-caps text-[8px] text-earth-mid">
                Added
              </span>
            ) : (
              <span aria-hidden className="text-saffron text-xl leading-none">
                +
              </span>
            )}
          </Card>
        );
      })}
    </div>
  );
}
