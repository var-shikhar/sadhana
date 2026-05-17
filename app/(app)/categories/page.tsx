"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LabelTiny } from "@/components/gurukul/LabelTiny"
import { GoldRule } from "@/components/gurukul/GoldRule"
import { GuidedExplainer } from "@/components/gurukul/GuidedExplainer"
import { CategoryCard } from "@/components/categories/CategoryCard"
import { CategoryForm } from "@/components/categories/CategoryForm"
import { Loader } from "@/components/gurukul/Loader"
import { LotusMandala } from "@/components/ornament/LotusMandala"
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/useCategories"
import { STARTER_CATEGORIES, CATEGORY_COLORS, type Category } from "@/types"
import { cn } from "@/lib/utils"

export default function CategoriesPage() {
  const { categories, loading } = useCategories()
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const remove = useDeleteCategory()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const editing = useMemo(
    () =>
      editingId ? categories.find((c) => c.id === editingId) ?? null : null,
    [editingId, categories],
  )

  const anyOpen = createOpen || editingId !== null

  // Lock body scroll while any modal is open.
  useEffect(() => {
    if (!anyOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [anyOpen])

  if (loading) {
    return <Loader fullScreen caption="drawing the pillars…" />
  }

  const isEmpty = categories.length === 0

  return (
    <>
      {isEmpty ? (
        <EmptyState
          onAdoptStarter={(s) =>
            create.mutate({
              title: s.title,
              description: s.description,
              color: s.color,
            })
          }
          onCreate={() => setCreateOpen(true)}
          disabled={create.isPending}
        />
      ) : (
        <BrowseState
          categories={categories}
          onCreate={() => setCreateOpen(true)}
          onEdit={(id) => setEditingId(id)}
        />
      )}

      {createOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <ModalShell label="Add a category" onClose={() => setCreateOpen(false)}>
            <div className="space-y-1">
              <h3 className="font-pressure-caps text-[11px] tracking-[2px] text-earth-deep">
                New category
              </h3>
              <p className="font-lyric-italic text-[11px] text-earth-mid">
                A focus area — one or two words.
              </p>
            </div>

            <CategoryForm
              onSubmit={async (data) => {
                await create.mutateAsync(data)
                setCreateOpen(false)
              }}
              onCancel={() => setCreateOpen(false)}
              submitting={create.isPending}
            />

            {create.isError && (
              <p className="text-[11px] text-saffron font-lyric-italic">
                {(create.error as Error).message}
              </p>
            )}
          </ModalShell>,
          document.body,
        )}

      {editing &&
        typeof document !== "undefined" &&
        createPortal(
          <ModalShell label={`Edit ${editing.title}`} onClose={() => setEditingId(null)}>
            <div className="space-y-1">
              <h3 className="font-pressure-caps text-[11px] tracking-[2px] text-earth-deep">
                Edit category
              </h3>
              <p className="font-lyric-italic text-[11px] text-earth-mid">
                Rename, recolor, or remove it. Goals tagged with this category
                keep their tag if you remove — they just become uncategorized.
              </p>
            </div>

            <CategoryForm
              key={editing.id}
              initial={editing}
              submitLabel="Save"
              onSubmit={async (data) => {
                await update.mutateAsync({ id: editing.id, patch: data })
                setEditingId(null)
              }}
              onCancel={() => setEditingId(null)}
              onDelete={async () => {
                if (!confirm(`Remove the category "${editing.title}"?`)) return
                await remove.mutateAsync(editing.id)
                setEditingId(null)
              }}
              submitting={update.isPending || remove.isPending}
            />

            {update.isError && (
              <p className="text-[11px] text-saffron font-lyric-italic">
                {(update.error as Error).message}
              </p>
            )}
          </ModalShell>,
          document.body,
        )}
    </>
  )
}

function ModalShell({
  label,
  onClose,
  children,
}: {
  label: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-100 flex items-end sm:items-center justify-center sm:px-4 bg-ink/55 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-gold/40 bg-ivory-deep p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 fade-in duration-200 max-h-[88vh] overflow-y-auto"
      >
        {children}
      </div>
    </div>
  )
}

// ─── Empty state (no categories yet) ──────────────────────────────────────

function EmptyState({
  onAdoptStarter,
  onCreate,
  disabled,
}: {
  onAdoptStarter: (s: (typeof STARTER_CATEGORIES)[number]) => void
  onCreate: () => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-6 py-2 relative">
      <LotusMandala
        className="absolute -top-4 -right-6 pointer-events-none"
        opacity={0.1}
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

      <StarterGrid onAdopt={onAdoptStarter} disabled={disabled} />

      <GoldRule width="section" />

      <div className="text-center">
        <Button variant="outline" onClick={onCreate}>
          Or create your own
        </Button>
      </div>

      <p className="text-center text-xs text-earth-mid pt-2">
        <Link href="/" className="hover:text-saffron">
          ← back to home
        </Link>
      </p>
    </div>
  )
}

// ─── Browse state (has categories) ────────────────────────────────────────

function BrowseState({
  categories,
  onCreate,
  onEdit,
}: {
  categories: Category[]
  onCreate: () => void
  onEdit: (id: string) => void
}) {
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
          <CategoryCard key={c.id} category={c} onClick={() => onEdit(c.id)} />
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <Button className="flex-1" onClick={onCreate}>
          Add a category
        </Button>
      </div>

      <p className="text-center text-xs text-earth-mid pt-2">
        <Link href="/" className="hover:text-saffron">
          ← back to home
        </Link>
      </p>
    </div>
  )
}

// ─── Starter grid ─────────────────────────────────────────────────────────

function StarterGrid({
  onAdopt,
  disabled,
  existingTitles,
}: {
  onAdopt: (s: (typeof STARTER_CATEGORIES)[number]) => void
  disabled?: boolean
  existingTitles?: Set<string>
}) {
  return (
    <div className="space-y-2">
      {STARTER_CATEGORIES.map((s) => {
        const colorHex =
          CATEGORY_COLORS.find((c) => c.value === s.color)?.hex ??
          "var(--saffron)"
        const adopted = existingTitles?.has(s.title.toLowerCase()) ?? false
        return (
          <Card
            key={s.title}
            className={cn(
              "flex flex-row items-center gap-3 px-4 py-3 bg-ivory border-gold/30 transition-colors",
              !adopted && "hover:border-saffron/60 cursor-pointer",
              adopted && "opacity-50",
            )}
            onClick={() => {
              if (!adopted && !disabled) onAdopt(s)
            }}
          >
            <span
              aria-hidden
              className="w-2 h-10 rounded-full shrink-0"
              style={{ backgroundColor: colorHex }}
            />
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
        )
      })}
    </div>
  )
}

