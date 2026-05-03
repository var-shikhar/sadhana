"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button, ButtonBare } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LabelTiny } from "@/components/gurukul/LabelTiny"
import { GoldRule } from "@/components/gurukul/GoldRule"
import { cn } from "@/lib/utils"
import { queryKeys } from "@/lib/query-keys"
import {
  useReflectionChips,
  useCreateReflectionChip,
  useUpdateReflectionChip,
  useDeleteReflectionChip,
} from "@/hooks/useReflectionChips"
import {
  useActGroups,
  useCreateActGroup,
  useUpdateActGroup,
  useDeleteActGroup,
} from "@/hooks/useActGroups"
import {
  CHIP_CATEGORY_META,
  CHIP_CATEGORY_ORDER,
  type ChipCategory,
  type ReflectionChip,
  type ActGroup,
} from "@/types"

const TONE_DOT: Record<ChipCategory, string> = {
  good: "bg-sage",
  neutral: "bg-earth-mid",
  bad: "bg-saffron",
}

const TONE_TEXT: Record<ChipCategory, string> = {
  good: "text-sage",
  neutral: "text-earth-mid",
  bad: "text-saffron",
}

const TONE_BORDER: Record<ChipCategory, string> = {
  good: "border-sage",
  neutral: "border-earth-mid",
  bad: "border-saffron",
}

const GLOBAL_GROUP_LABEL = "All / Global"

/**
 * Normalize an act name for duplicate detection. Treats trivial variations
 * (case, surrounding whitespace, trailing punctuation, multiple internal
 * spaces) as the same act.
 */
function normalizeActName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s.,!?;:'"-]+$/, "")
    .replace(/\s+/g, " ")
}

type CategoryFilter = ChipCategory | "all"
/** "all" = every act, "none" = unassigned (Global), or a group uuid. */
type GroupFilter = "all" | "none" | string

export default function ReflectionChipsSettingsPage() {
  const { chips, loading: chipsLoading } = useReflectionChips()
  const { groups, loading: groupsLoading } = useActGroups()
  const create = useCreateReflectionChip()
  const update = useUpdateReflectionChip()
  const remove = useDeleteReflectionChip()
  const createGroup = useCreateActGroup()
  const updateGroup = useUpdateActGroup()
  const deleteGroup = useDeleteActGroup()
  const qc = useQueryClient()

  // ── Add-act form (top of page) ──
  const [draftName, setDraftName] = useState("")
  const [draftCategory, setDraftCategory] = useState<ChipCategory>("good")
  const [draftGroupId, setDraftGroupId] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  // ── Filters ──
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all")

  // Filter onChange — also syncs the add-form's group picker to whatever
  // group is currently filtered. Doing this in the event handler (not an
  // effect) avoids the setState-in-effect cascade.
  function handleGroupFilterChange(next: GroupFilter) {
    setGroupFilter(next)
    if (next === "none") setDraftGroupId(null)
    else if (next !== "all") setDraftGroupId(next)
  }

  // ── Edit panel state — name, category, AND group together. ──
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [editingCategory, setEditingCategory] = useState<ChipCategory>("good")
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  // ── Groups management section state ──
  const [newGroupName, setNewGroupName] = useState("")
  const [groupError, setGroupError] = useState<string | null>(null)
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null)
  const [renamingGroupName, setRenamingGroupName] = useState("")

  const groupById = useMemo(() => {
    const map: Record<string, ActGroup> = {}
    for (const g of groups) map[g.id] = g
    return map
  }, [groups])

  // ── Visible list — filtered; paused acts pushed to the bottom; within
  //     each active/paused band, sorted alphabetically by name. ──
  const visible = useMemo(() => {
    return chips
      .filter((c) => categoryFilter === "all" || c.category === categoryFilter)
      .filter((c) => {
        if (groupFilter === "all") return true
        if (groupFilter === "none") return c.groupId === null
        return c.groupId === groupFilter
      })
      .slice()
      .sort((a, b) => {
        // Active acts first, then paused. Within each, alphabetically by name.
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      })
  }, [chips, categoryFilter, groupFilter])

  const categoryCounts = useMemo(() => {
    const c = { all: 0, good: 0, neutral: 0, bad: 0 }
    for (const ch of chips) {
      c.all += 1
      c[ch.category] += 1
    }
    return c
  }, [chips])

  const groupCounts = useMemo(() => {
    const map: Record<string, number> = { all: 0, none: 0 }
    for (const g of groups) map[g.id] = 0
    for (const ch of chips) {
      map.all += 1
      if (ch.groupId === null) map.none += 1
      else if (map[ch.groupId] !== undefined) map[ch.groupId] += 1
    }
    return map
  }, [chips, groups])

  // ── Add-act handler ──
  function handleCreate() {
    const name = draftName.trim()
    if (!name) return
    setCreateError(null)

    // Reject near-duplicates within the same group (case / trailing-punct
    // variations of an existing act name).
    const proposedNorm = normalizeActName(name)
    const dup = chips.find(
      (c) =>
        c.groupId === draftGroupId && normalizeActName(c.name) === proposedNorm,
    )
    if (dup) {
      const where = draftGroupId
        ? `the group "${groupById[draftGroupId]?.name ?? "this group"}"`
        : `${GLOBAL_GROUP_LABEL}`
      setCreateError(`"${dup.name}" already exists in ${where}.`)
      return
    }

    const targetGroup = draftGroupId ? groupById[draftGroupId] : null
    const isActive = targetGroup ? targetGroup.isActive : true
    setDraftName("")
    create.mutate(
      {
        name,
        category: draftCategory,
        groupId: draftGroupId,
        isActive,
      },
      {
        onError: (err) => {
          setCreateError(err instanceof Error ? err.message : "Could not save")
        },
      },
    )
  }

  // ── Edit-act handlers ──
  function startEdit(chip: ReflectionChip) {
    setEditingId(chip.id)
    setEditingName(chip.name)
    setEditingCategory(chip.category)
    setEditingGroupId(chip.groupId)
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  function commitEdit(chip: ReflectionChip) {
    const name = editingName.trim()
    if (!name) {
      cancelEdit()
      return
    }
    const nameChanged = name !== chip.name
    const categoryChanged = editingCategory !== chip.category
    const groupChanged = editingGroupId !== chip.groupId
    if (!nameChanged && !categoryChanged && !groupChanged) {
      cancelEdit()
      return
    }

    // Reject near-duplicates within the destination group, ignoring the
    // chip we're editing itself.
    if (nameChanged || groupChanged) {
      const proposedNorm = normalizeActName(name)
      const dup = chips.find(
        (c) =>
          c.id !== chip.id &&
          c.groupId === editingGroupId &&
          normalizeActName(c.name) === proposedNorm,
      )
      if (dup) {
        const where = editingGroupId
          ? `the group "${groupById[editingGroupId]?.name ?? "this group"}"`
          : `${GLOBAL_GROUP_LABEL}`
        setEditError(`"${dup.name}" already exists in ${where}.`)
        return
      }
    }

    // Fire-and-forget: the mutation's onMutate already applies the patch to
    // the cache synchronously, so we can close the edit panel immediately
    // without waiting for the server round-trip.
    update.mutate({
      id: chip.id,
      ...(nameChanged ? { name } : {}),
      ...(categoryChanged ? { category: editingCategory } : {}),
      ...(groupChanged ? { groupId: editingGroupId } : {}),
    })
    cancelEdit()
  }

  function toggleChipActive(chip: ReflectionChip) {
    update.mutate({ id: chip.id, isActive: !chip.isActive })
  }

  // ── Group handlers ──
  function handleCreateGroup() {
    const name = newGroupName.trim()
    if (!name) return
    setGroupError(null)
    setNewGroupName("")
    createGroup.mutate(
      { name },
      {
        onError: (err) => {
          setGroupError(err instanceof Error ? err.message : "Could not save")
        },
      },
    )
  }

  /** Cascade: toggling a group flips its own isActive AND every child act's. */
  async function toggleGroupCascade(group: ActGroup) {
    const nextActive = !group.isActive
    const previousChips = qc.getQueryData<ReflectionChip[]>(
      queryKeys.reflectionChips(),
    )
    const previousGroups = qc.getQueryData<ActGroup[]>(queryKeys.actGroups())

    qc.setQueryData<ActGroup[]>(queryKeys.actGroups(), (old) =>
      (old ?? []).map((g) =>
        g.id === group.id ? { ...g, isActive: nextActive } : g,
      ),
    )
    qc.setQueryData<ReflectionChip[]>(queryKeys.reflectionChips(), (old) =>
      (old ?? []).map((c) =>
        c.groupId === group.id ? { ...c, isActive: nextActive } : c,
      ),
    )

    try {
      const childIds = (previousChips ?? [])
        .filter((c) => c.groupId === group.id)
        .map((c) => c.id)
      await Promise.all([
        fetch(`/api/act-groups/${group.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: nextActive }),
        }).then((r) => {
          if (!r.ok) throw new Error("Group toggle failed")
        }),
        ...childIds.map((id) =>
          fetch(`/api/reflection-chips/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: nextActive }),
          }).then((r) => {
            if (!r.ok) throw new Error("Chip toggle failed")
          }),
        ),
      ])
    } catch {
      if (previousChips) {
        qc.setQueryData(queryKeys.reflectionChips(), previousChips)
      }
      if (previousGroups) {
        qc.setQueryData(queryKeys.actGroups(), previousGroups)
      }
    }
  }

  function startGroupRename(group: ActGroup) {
    setRenamingGroupId(group.id)
    setRenamingGroupName(group.name)
  }

  function cancelGroupRename() {
    setRenamingGroupId(null)
  }

  async function commitGroupRename(group: ActGroup) {
    const name = renamingGroupName.trim()
    if (!name || name === group.name) {
      cancelGroupRename()
      return
    }
    try {
      await updateGroup.mutateAsync({ id: group.id, name })
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : "Could not save")
    }
    cancelGroupRename()
  }

  function handleGroupDelete(group: ActGroup) {
    if (
      !confirm(
        `Delete the group "${group.name}"? Acts inside it will fall back to ${GLOBAL_GROUP_LABEL}.`,
      )
    )
      return
    if (groupFilter === group.id) setGroupFilter("all")
    if (draftGroupId === group.id) setDraftGroupId(null)
    void deleteGroup.mutateAsync(group.id)
  }

  const CATEGORY_FILTER_ORDER: CategoryFilter[] = [
    "all",
    ...CHIP_CATEGORY_ORDER,
  ]

  if (chipsLoading || groupsLoading) {
    return (
      <p className="font-lyric-italic text-earth-mid py-6 text-center">
        Loading…
      </p>
    )
  }

  return (
    <div className="space-y-6 py-2">
      <header className="text-center space-y-2 relative">
        <LabelTiny>Karma · the acts of a day</LabelTiny>
        <h1 className="font-lyric text-3xl text-ink">Your acts.</h1>
        <p className="font-lyric-italic text-sm text-earth-deep max-w-md mx-auto">
          Acts are the small repeating things you do across a day. Optionally
          stash related acts in a group — pause a group to hide all its acts
          from the reflect rail, pause a single act to hide just it.
        </p>
      </header>

      <GoldRule width="section" />

      {/* ── Add an act (top) ── */}
      <section className="space-y-3">
        <LabelTiny className="block">Add an act</LabelTiny>
        <Card className="bg-ivory-deep border-gold/40">
          <CardContent className="pt-6 space-y-3">
            <Input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value.slice(0, 60))}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="e.g. deep work block, scrolling, walked the dog"
              className="bg-ivory border-gold/40 py-2"
            />

            <div className="flex flex-wrap items-center gap-2">
              {/* Category picker */}
              <div className="flex rounded-full border border-gold/40 bg-ivory p-1">
                {CHIP_CATEGORY_ORDER.map((cat) => {
                  const meta = CHIP_CATEGORY_META[cat]
                  const isActive = draftCategory === cat
                  return (
                    <ButtonBare
                      key={cat}
                      type="button"
                      onClick={() => setDraftCategory(cat)}
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-pressure-caps tracking-wider transition-all flex items-center gap-1.5",
                        isActive
                          ? "bg-ink text-ivory shadow-sm"
                          : "text-earth-deep hover:bg-ivory-deep",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          TONE_DOT[cat],
                        )}
                      />
                      {meta.label}
                    </ButtonBare>
                  )
                })}
              </div>

              {/* Group picker (select) */}
              <div className="flex items-center gap-2">
                <span className="label-tiny text-earth-mid">in</span>
                <GroupSelect
                  value={draftGroupId}
                  onChange={setDraftGroupId}
                  groups={groups}
                />
              </div>

              <Button
                onClick={handleCreate}
                disabled={!draftName.trim()}
                className="ml-auto"
              >
                Add
              </Button>
            </div>

            {createError && (
              <p className="text-[11px] text-saffron font-lyric-italic">
                {createError}
              </p>
            )}
            {draftGroupId &&
              groupById[draftGroupId] &&
              !groupById[draftGroupId].isActive && (
                <p className="font-lyric-italic text-[10px] text-earth-mid">
                  This group is paused — the new act will start paused too.
                </p>
              )}
          </CardContent>
        </Card>
      </section>

      <GoldRule width="section" />

      {/* ── Library — filters + flat list ── */}
      <section className="space-y-3">
        {/* Single unified filter bar: label · category pills · gold hairline · group select */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <LabelTiny className="shrink-0">Your acts</LabelTiny>

          <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
            {/* Category pill group — compact */}
            <div className="flex rounded-full border border-gold/40 bg-ivory p-0.5 shadow-[0_1px_2px_rgba(196,106,31,0.05)] shrink-0">
              {CATEGORY_FILTER_ORDER.map((f) => {
                const isActive = categoryFilter === f
                const label =
                  f === "all"
                    ? "All"
                    : CHIP_CATEGORY_META[f as ChipCategory].label
                const count = categoryCounts[f]
                return (
                  <ButtonBare
                    key={f}
                    type="button"
                    onClick={() => setCategoryFilter(f)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-pressure-caps tracking-wider transition-all flex items-center gap-1",
                      isActive
                        ? "bg-ink text-ivory shadow-sm"
                        : "text-earth-deep hover:bg-ivory-deep",
                    )}
                  >
                    {f !== "all" && (
                      <span
                        className={cn(
                          "h-1 w-1 rounded-full",
                          TONE_DOT[f as ChipCategory],
                        )}
                      />
                    )}
                    <span>{label}</span>
                    <span
                      className={cn(
                        "tabular-nums text-[8px]",
                        isActive ? "text-ivory/70" : "text-earth-mid",
                      )}
                    >
                      {count}
                    </span>
                  </ButtonBare>
                )
              })}
            </div>

            {/* Hairline divider */}
            <span
              aria-hidden="true"
              className="h-4 w-px bg-linear-to-b from-transparent via-gold/60 to-transparent shrink-0"
            />

            {/* Group select — compact pill with custom chevron */}
            <div className="relative min-w-0">
              <select
                value={groupFilter}
                onChange={(e) =>
                  handleGroupFilterChange(e.target.value as GroupFilter)
                }
                className="appearance-none rounded-full border border-gold/40 bg-ivory pl-2.5 pr-6 py-1 text-[9px] font-pressure-caps tracking-wider text-earth-deep outline-none cursor-pointer hover:bg-ivory-deep focus:border-ink/40 transition-colors max-w-40 truncate shadow-[0_1px_2px_rgba(196,106,31,0.05)]"
              >
                <option value="all">All · {groupCounts.all}</option>
                <option value="none">Global · {groupCounts.none}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} · {groupCounts[g.id] ?? 0}
                  </option>
                ))}
              </select>
              <svg
                aria-hidden="true"
                viewBox="0 0 12 8"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-2 w-2.5 text-earth-mid pointer-events-none"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 1.5l5 5 5-5" />
              </svg>
            </div>
          </div>
        </div>

        <p className="font-lyric-italic text-[11px] text-earth-mid">
          Click an act to edit. The toggle on the right pauses just that act.
          Sorted alphabetically — paused acts settle to the bottom.
        </p>

        {chips.length === 0 ? (
          <Card className="bg-ivory-deep border-gold/40">
            <CardContent className="pt-6 pb-6 text-center">
              <p className="font-lyric-italic text-sm text-earth-mid">
                No acts yet. Add one above, or add inline on the Reflect tab.
              </p>
            </CardContent>
          </Card>
        ) : visible.length === 0 ? (
          <Card className="bg-ivory-deep border-gold/40">
            <CardContent className="pt-6 pb-6 text-center">
              <p className="font-lyric-italic text-sm text-earth-mid">
                No acts in this view.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="rounded-md border border-gold/30 bg-ivory-deep divide-y divide-gold/20 overflow-x-hidden overflow-y-auto h-[45vh]">
            {visible.map((chip) => {
              const isEditing = editingId === chip.id
              const meta = CHIP_CATEGORY_META[chip.category]
              const groupName = chip.groupId
                ? (groupById[chip.groupId]?.name ?? null)
                : null
              const groupPaused = chip.groupId
                ? groupById[chip.groupId]?.isActive === false
                : false
              return (
                <li
                  key={chip.id}
                  className={cn(
                    "group relative transition-colors",
                    isEditing ? "bg-ivory" : "hover:bg-ivory",
                    !chip.isActive && !isEditing && "opacity-60",
                  )}
                >
                  {isEditing ? (
                    <div className="px-3 py-3 space-y-3">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <label className="label-tiny block">Name</label>
                        <input
                          autoFocus
                          value={editingName}
                          onChange={(e) => {
                            setEditingName(e.target.value.slice(0, 60))
                            setEditError(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit(chip)
                            if (e.key === "Escape") cancelEdit()
                          }}
                          placeholder="rename this act…"
                          className="w-full bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[13px] font-sans outline-none focus:border-ink/40"
                        />
                      </div>

                      {/* Category */}
                      <div className="space-y-1.5">
                        <label className="label-tiny block">
                          Where it belongs
                        </label>
                        <div className="flex gap-1.5">
                          {CHIP_CATEGORY_ORDER.map((cat) => {
                            const m = CHIP_CATEGORY_META[cat]
                            const isActive = editingCategory === cat
                            return (
                              <ButtonBare
                                key={cat}
                                type="button"
                                onClick={() => setEditingCategory(cat)}
                                className={cn(
                                  "flex-1 rounded-full px-3 py-1.5 text-[10px] font-pressure-caps tracking-wider transition-all flex items-center justify-center gap-1.5 border",
                                  isActive
                                    ? cn(
                                        "bg-ink text-ivory shadow-sm",
                                        TONE_BORDER[cat],
                                      )
                                    : "bg-ivory text-earth-deep border-gold/30 hover:bg-ivory-deep",
                                )}
                              >
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    TONE_DOT[cat],
                                  )}
                                />
                                {m.label}
                              </ButtonBare>
                            )
                          })}
                        </div>
                      </div>

                      {/* Group (select) */}
                      <div className="space-y-1.5">
                        <label className="label-tiny block">Group</label>
                        <GroupSelect
                          value={editingGroupId}
                          onChange={setEditingGroupId}
                          groups={groups}
                        />
                      </div>

                      {/* Inline error (e.g. duplicate name in group) */}
                      {editError && (
                        <p className="text-[11px] text-saffron font-lyric-italic">
                          {editError}
                        </p>
                      )}

                      {/* Footer actions */}
                      <div className="flex items-center justify-between pt-1">
                        <ButtonBare
                          type="button"
                          onClick={() => {
                            if (confirm(`Remove "${chip.name}"?`)) {
                              void remove.mutateAsync(chip.id)
                              cancelEdit()
                            }
                          }}
                          className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-saffron transition-colors"
                        >
                          Remove
                        </ButtonBare>
                        <div className="flex items-center gap-2">
                          <ButtonBare
                            type="button"
                            onClick={cancelEdit}
                            className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-earth-deep px-3 py-1.5"
                          >
                            Cancel
                          </ButtonBare>
                          <ButtonBare
                            type="button"
                            onClick={() => commitEdit(chip)}
                            disabled={!editingName.trim()}
                            className="text-[10px] font-pressure-caps tracking-wider bg-ink text-ivory rounded-md px-3 py-1.5 disabled:opacity-50"
                          >
                            Save
                          </ButtonBare>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-stretch">
                      <ButtonBare
                        type="button"
                        onClick={() => startEdit(chip)}
                        className="flex-1 text-left px-3 py-2.5"
                        aria-label={`Edit ${chip.name}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0 space-y-1">
                            <p
                              className={cn(
                                "font-lyric text-[14px] truncate",
                                chip.isActive
                                  ? "text-ink"
                                  : "text-earth-mid line-through",
                              )}
                            >
                              {chip.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] flex-wrap">
                              <span className="inline-flex items-center gap-1.5 font-pressure-caps tracking-wider text-earth-mid">
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    TONE_DOT[chip.category],
                                  )}
                                />
                                <span className={TONE_TEXT[chip.category]}>
                                  {meta.label}
                                </span>
                              </span>
                              {groupName && (
                                <>
                                  <span className="text-earth-mid/50">·</span>
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 font-pressure-caps tracking-wider",
                                      groupPaused
                                        ? "text-earth-mid/60 line-through"
                                        : "text-earth-deep",
                                    )}
                                  >
                                    in {groupName}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] font-pressure-caps tracking-wider text-earth-mid/0 group-hover:text-earth-mid transition-colors self-center">
                            edit →
                          </span>
                        </div>
                      </ButtonBare>

                      {/* Per-act active toggle */}
                      <ButtonBare
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleChipActive(chip)
                        }}
                        title={
                          chip.isActive ? "Pause this act" : "Activate this act"
                        }
                        aria-pressed={chip.isActive}
                        className={cn(
                          "relative h-4 w-7 rounded-full transition-colors shrink-0 self-center mr-3",
                          chip.isActive ? "bg-saffron" : "bg-earth-mid/30",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 h-3 w-3 rounded-full bg-ivory shadow transition-all",
                            chip.isActive ? "left-3.5" : "left-0.5",
                          )}
                        />
                      </ButtonBare>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <GoldRule width="section" />

      {/* ── Manage groups (moved to bottom — less-frequent than the act library) ── */}
      <section className="space-y-3">
        <LabelTiny className="block">Groups</LabelTiny>
        <Card className="bg-ivory-deep border-gold/40">
          <CardContent className="pt-6 space-y-4">
            <p className="font-lyric-italic text-[12px] text-earth-deep">
              An optional roof for related acts — like a project, a season, or a
              theme. Pausing a group cascades to every act inside it.
            </p>

            {groups.length === 0 ? (
              <p className="font-lyric-italic text-[12px] text-earth-mid italic">
                no groups yet — add one below to start organising
              </p>
            ) : (
              <ul className="rounded border border-gold/30 bg-ivory divide-y divide-gold/20 overflow-hidden">
                {groups.map((g) => {
                  const isRenaming = renamingGroupId === g.id
                  const count = groupCounts[g.id] ?? 0
                  return (
                    <li
                      key={g.id}
                      className="px-3 py-2 flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        {isRenaming ? (
                          <input
                            autoFocus
                            value={renamingGroupName}
                            onChange={(e) =>
                              setRenamingGroupName(e.target.value.slice(0, 60))
                            }
                            onBlur={() => void commitGroupRename(g)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void commitGroupRename(g)
                              if (e.key === "Escape") cancelGroupRename()
                            }}
                            className="w-full bg-transparent outline-none font-lyric text-[14px] text-ink border-b border-gold/50"
                          />
                        ) : (
                          <ButtonBare
                            type="button"
                            onClick={() => startGroupRename(g)}
                            className="text-left font-lyric text-[14px] text-ink hover:text-saffron transition-colors"
                            title="Click to rename"
                          >
                            {g.name}
                          </ButtonBare>
                        )}
                        <div className="text-[10px] text-earth-mid font-pressure-caps tracking-wider mt-0.5">
                          {count} {count === 1 ? "act" : "acts"}
                          {!g.isActive && " · paused"}
                        </div>
                      </div>

                      <ButtonBare
                        type="button"
                        onClick={() => void toggleGroupCascade(g)}
                        title={
                          g.isActive
                            ? "Pause this group (and all its acts)"
                            : "Activate this group (and all its acts)"
                        }
                        aria-pressed={g.isActive}
                        className={cn(
                          "relative h-5 w-9 rounded-full transition-colors shrink-0",
                          g.isActive ? "bg-saffron" : "bg-earth-mid/30",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 h-4 w-4 rounded-full bg-ivory shadow transition-all",
                            g.isActive ? "left-4.5" : "left-0.5",
                          )}
                        />
                      </ButtonBare>

                      <ButtonBare
                        type="button"
                        onClick={() => handleGroupDelete(g)}
                        title="Delete group"
                        aria-label={`Delete ${g.name}`}
                        className="text-earth-mid/60 hover:text-saffron transition-colors text-[14px]"
                      >
                        ✕
                      </ButtonBare>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value.slice(0, 60))}
                onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                placeholder="add a new group — e.g. Project Atlas"
                className="flex-1 bg-ivory border border-gold/40 rounded-md px-3 py-2 text-[13px] font-sans outline-none focus:border-ink/40"
              />
              <ButtonBare
                type="button"
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim()}
                className="bg-ink text-ivory rounded-md px-4 py-2 text-[11px] font-pressure-caps tracking-wider disabled:opacity-40"
              >
                Add group
              </ButtonBare>
            </div>
            {groupError && (
              <p className="text-[11px] text-saffron font-lyric-italic">
                {groupError}
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <GoldRule width="section" />

      <Link
        href="/settings"
        className="block text-center font-pressure-caps text-[10px] text-earth-mid hover:text-earth-deep"
      >
        ← back to settings
      </Link>
    </div>
  )
}

/**
 * Group select — used in the add-an-act form, the edit panel's "Move to"
 * field, and (via inline JSX) the library filter row. Native select element
 * styled to match the gurukul palette.
 *
 * `value === null` → "All / Global". Empty-string option value maps to null.
 */
function GroupSelect({
  value,
  onChange,
  groups,
}: {
  value: string | null
  onChange: (id: string | null) => void
  groups: ActGroup[]
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      className="bg-ivory border border-gold/40 rounded-md px-3 py-1.5 text-[12px] font-sans text-ink outline-none focus:border-ink/40 cursor-pointer min-w-[180px]"
    >
      <option value="">{GLOBAL_GROUP_LABEL}</option>
      {groups.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </select>
  )
}
