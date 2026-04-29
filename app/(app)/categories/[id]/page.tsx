"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { GoldRule } from "@/components/gurukul/GoldRule";
import { GuidedExplainer } from "@/components/gurukul/GuidedExplainer";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { GoalForm } from "@/components/goals/GoalForm";
import { GoalCard } from "@/components/goals/GoalCard";
import {
  GoalSuggestionList,
  type GoalSuggestion,
} from "@/components/goals/GoalSuggestionList";
import {
  useCategories,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/useCategories";
import {
  useGoalsByCategory,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useLogGoal,
  useGoalSuggestions,
} from "@/hooks/useGoals";
import { CATEGORY_COLORS, type GoalWithProgress } from "@/types";

type Mode = "view" | "editCategory" | "addGoal" | "editGoal";

export default function CategoryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { categories, loading: catsLoading } = useCategories();
  const updateCategory = useUpdateCategory();
  const removeCategory = useDeleteCategory();

  const category = useMemo(
    () => categories.find((c) => c.id === params.id),
    [categories, params.id]
  );

  const { goals, loading: goalsLoading } = useGoalsByCategory(params.id);
  const { suggestions } = useGoalSuggestions(
    params.id,
    category?.title ?? ""
  );
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const logGoal = useLogGoal();

  const [mode, setMode] = useState<Mode>("view");
  const [editingGoal, setEditingGoal] = useState<GoalWithProgress | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  if (catsLoading) {
    return <p className="font-lyric-italic text-earth-mid py-6">Loading…</p>;
  }

  if (!category) {
    return (
      <div className="py-6 space-y-3 text-center">
        <p className="font-lyric-italic text-earth-mid">
          That category isn't here.
        </p>
        <Link href="/categories" className="text-saffron hover:underline">
          Back to categories
        </Link>
      </div>
    );
  }

  const colorHex =
    CATEGORY_COLORS.find((c) => c.value === category.color)?.hex ?? "#c46a1f";

  const adoptedTitles = new Set(
    goals.map((g) => g.title.toLowerCase())
  );

  // ─── Edit category mode ───
  if (mode === "editCategory") {
    return (
      <div className="space-y-6 py-2">
        <header className="text-center space-y-2">
          <LabelTiny>Edit category</LabelTiny>
          <h1 className="font-lyric text-3xl text-ink">{category.title}</h1>
        </header>
        <GoldRule width="section" />
        <Card className="bg-ivory-deep border-gold/40">
          <CardContent className="p-5">
            <CategoryForm
              initial={category}
              submitLabel="Save changes"
              submitting={updateCategory.isPending}
              onCancel={() => setMode("view")}
              onSubmit={async (data) => {
                await updateCategory.mutateAsync({
                  id: category.id,
                  patch: data,
                });
                setMode("view");
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Add goal mode ───
  if (mode === "addGoal") {
    return (
      <div className="space-y-6 py-2">
        <header className="text-center space-y-2">
          <LabelTiny>{category.icon} {category.title}</LabelTiny>
          <h1 className="font-lyric text-3xl text-ink">Add a goal</h1>
        </header>
        <GoldRule width="section" />

        <GuidedExplainer
          question="A goal is one specific, trackable thing inside this category."
          explanation={`First pick the kind of goal — daily (do it every day), weekly (hit a count each week), or by-date (a total to reach by a deadline). Then name it. Goals work best when they are concrete and short-named.`}
          examples="Meditate 10 min · Exercise 3×/week · Read 12 books by Dec 31"
        />

        <Card className="bg-ivory-deep border-gold/40">
          <CardContent className="p-5">
            <GoalForm
              submitting={createGoal.isPending}
              onCancel={() => setMode("view")}
              onSubmit={async (data) => {
                await createGoal.mutateAsync({
                  categoryId: category.id,
                  source: "user",
                  ...data,
                });
                setMode("view");
              }}
            />
          </CardContent>
        </Card>

        {createGoal.isError && (
          <p className="text-sm text-destructive text-center">
            {(createGoal.error as Error).message}
          </p>
        )}
      </div>
    );
  }

  // ─── Edit goal mode ───
  if (mode === "editGoal" && editingGoal) {
    return (
      <div className="space-y-6 py-2">
        <header className="text-center space-y-2">
          <LabelTiny>Edit goal</LabelTiny>
          <h1 className="font-lyric text-3xl text-ink">{editingGoal.title}</h1>
        </header>
        <GoldRule width="section" />
        <Card className="bg-ivory-deep border-gold/40">
          <CardContent className="p-5">
            <GoalForm
              initial={editingGoal}
              submitLabel="Save changes"
              submitting={updateGoal.isPending}
              onCancel={() => {
                setEditingGoal(null);
                setMode("view");
              }}
              onSubmit={async (data) => {
                await updateGoal.mutateAsync({
                  goalId: editingGoal.id,
                  categoryId: category.id,
                  patch: data,
                });
                setEditingGoal(null);
                setMode("view");
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── View mode ───
  return (
    <div className="space-y-6 py-2">
      <header className="text-center space-y-3">
        <div
          aria-hidden
          className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl"
          style={{
            backgroundColor: `${colorHex}1f`,
            border: `2px solid ${colorHex}`,
          }}
        >
          {category.icon}
        </div>
        <h1 className="font-lyric text-3xl text-ink">{category.title}</h1>
        {category.description && (
          <p className="font-lyric-italic text-sm text-earth-deep max-w-md mx-auto">
            {category.description}
          </p>
        )}
        <div className="flex items-center justify-center gap-3 text-[10px] font-pressure-caps">
          <span style={{ color: colorHex }}>Priority {category.priority}</span>
        </div>
      </header>

      <GoldRule width="section" />

      {/* Goals section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <LabelTiny>Goals</LabelTiny>
          {goals.length > 0 && (
            <span className="text-[11px] text-earth-mid">
              {goals.filter((g) => g.progress.isMet).length} of {goals.length} kept
            </span>
          )}
        </div>

        {goalsLoading ? (
          <p className="font-lyric-italic text-earth-mid text-sm">Loading goals…</p>
        ) : goals.length === 0 ? (
          // Empty-state guided walkthrough
          <div className="space-y-4">
            <GuidedExplainer
              defaultOpen
              question={`What do you want to do in "${category.title}"?`}
              explanation={`Goals are specific, trackable. They come in three shapes: daily (do every day), weekly (hit a count each week), or by-date (reach a total by a deadline). Pick a suggestion below or write your own.`}
            />

            {suggestions.length > 0 && (
              <Card className="bg-ivory-deep border-gold/40">
                <CardContent className="p-5 space-y-3">
                  <LabelTiny className="block">Suggestions for {category.title.toLowerCase()}</LabelTiny>
                  <p className="font-lyric-italic text-xs text-earth-deep">
                    Tap any to adopt. Edit afterwards if you want.
                  </p>
                  <GoalSuggestionList
                    suggestions={suggestions as GoalSuggestion[]}
                    busy={createGoal.isPending}
                    adoptedTitles={adoptedTitles}
                    onAdopt={(s) => {
                      createGoal.mutate({
                        categoryId: category.id,
                        title: s.title,
                        description: s.description,
                        shape: s.shape,
                        weeklyTarget: s.weeklyTarget ?? null,
                        totalTarget: s.totalTarget ?? null,
                        deadlineDate: null,
                        source: "suggestion",
                      });
                    }}
                  />
                </CardContent>
              </Card>
            )}

            <Button className="w-full" onClick={() => setMode("addGoal")}>
              Or write your own
            </Button>
          </div>
        ) : (
          // Has goals
          <>
            <div className="space-y-2">
              {goals.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  busy={logGoal.isPending}
                  onToggleToday={(next) =>
                    logGoal.mutate({
                      goalId: g.id,
                      categoryId: category.id,
                      done: next,
                    })
                  }
                  onIncrement={() =>
                    logGoal.mutate({
                      goalId: g.id,
                      categoryId: category.id,
                      done: true,
                    })
                  }
                  onEdit={() => {
                    setEditingGoal(g);
                    setMode("editGoal");
                  }}
                  onArchive={() => {
                    if (confirm(`Archive "${g.title}"?`)) {
                      deleteGoal.mutate({
                        goalId: g.id,
                        categoryId: category.id,
                      });
                    }
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => setMode("addGoal")}>
                Add a goal
              </Button>
              {suggestions.length > 0 && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowSuggestions((v) => !v)}
                >
                  {showSuggestions ? "Hide suggestions" : "See suggestions"}
                </Button>
              )}
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <Card className="bg-ivory-deep border-gold/40">
                <CardContent className="p-5 space-y-3">
                  <LabelTiny className="block">Suggestions</LabelTiny>
                  <GoalSuggestionList
                    suggestions={suggestions as GoalSuggestion[]}
                    busy={createGoal.isPending}
                    adoptedTitles={adoptedTitles}
                    onAdopt={(s) =>
                      createGoal.mutate({
                        categoryId: category.id,
                        title: s.title,
                        description: s.description,
                        shape: s.shape,
                        weeklyTarget: s.weeklyTarget ?? null,
                        totalTarget: s.totalTarget ?? null,
                        deadlineDate: null,
                        source: "suggestion",
                      })
                    }
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </section>

      <GoldRule width="section" />

      {/* Category-level actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setMode("editCategory")}
        >
          Edit category
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setConfirmArchive(true)}
        >
          Archive
        </Button>
      </div>

      {confirmArchive && (
        <Card className="bg-saffron/5 border-saffron/40">
          <CardContent className="p-5 space-y-3">
            <p className="font-lyric-italic text-sm text-earth-deep">
              Archiving hides this category and pauses its goals. You can
              restore it later from settings.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmArchive(false)}
              >
                Keep
              </Button>
              <Button
                className="flex-1"
                disabled={removeCategory.isPending}
                onClick={() =>
                  removeCategory.mutate(category.id, {
                    onSuccess: () => router.push("/categories"),
                  })
                }
              >
                {removeCategory.isPending ? "Archiving…" : "Archive"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-earth-mid pt-2">
        <Link href="/categories" className="hover:text-saffron">
          ← all categories
        </Link>
      </p>
    </div>
  );
}
