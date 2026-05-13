"use client"

import { useMemo, useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Button, ButtonBare } from "@/components/ui/button"
import { LabelTiny } from "@/components/gurukul/LabelTiny"
import { cn } from "@/lib/utils"
import {
  useCreateTask,
  useDeleteTask,
  useTasksByGoal,
  useUpdateTask,
} from "@/hooks/useTasks"
import {
  TASK_QUADRANTS,
  TASK_QUADRANT_META,
  quadrantOf,
  type Task,
  type TaskQuadrant,
} from "@/types"
import { TaskCard } from "./TaskCard"
import { TaskFormModal } from "./TaskFormModal"

interface TaskMatrixProps {
  goalId: string
  /**
   * Optional: scope this matrix to a single milestone of a quest goal.
   * When set:
   *   • only tasks whose milestoneId matches are shown,
   *   • newly-created tasks are anchored to that milestone.
   * When omitted (or null), the matrix shows all tasks of the goal — the
   * old discipline-style behavior.
   */
  milestoneId?: string | null
}

/** Inverse of `quadrantOf` — the (important, urgent) flags for a quadrant. */
const QUADRANT_FLAGS: Record<
  TaskQuadrant,
  { important: boolean; urgent: boolean }
> = {
  do_now: { important: true, urgent: true },
  schedule: { important: true, urgent: false },
  when_you_can: { important: false, urgent: true },
  maybe_later: { important: false, urgent: false },
}

/**
 * Eisenhower-classified tasks for one goal/sub-goal. Drag a card between
 * quadrants to reclassify it. Tap a card to edit it. Tap the checkbox to
 * mark done. Completed tasks live behind a "View completed (today)" link
 * — they don't clutter the matrix.
 */
export function TaskMatrix({ goalId, milestoneId }: TaskMatrixProps) {
  const { tasks: allTasks, loading } = useTasksByGoal(goalId)
  const create = useCreateTask()
  const update = useUpdateTask()
  const remove = useDeleteTask()

  // Scope to milestone when one is provided. We filter client-side rather
  // than adding a query param so cache invalidation stays simple — every
  // task mutation invalidates the per-goal key once.
  const tasks = useMemo(() => {
    if (milestoneId === undefined) return allTasks
    return allTasks.filter((t) => t.milestoneId === milestoneId)
  }, [allTasks, milestoneId])

  const [addOpen, setAddOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [doneOpen, setDoneOpen] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"matrix" | "list">("matrix")

  const editing = useMemo(
    () => (editingId ? tasks.find((t) => t.id === editingId) ?? null : null),
    [editingId, tasks],
  )

  // Sensor config: tap-to-edit and long-press-to-drag must not fight.
  // - Pointer (mouse/pen): require a small drag distance before activating
  //   so a click on the card body still triggers the edit modal.
  // - Touch: require a 200ms hold + a small distance, so a normal tap on
  //   the card or its checkbox doesn't accidentally start a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  )

  // Split into open and done; group open by quadrant.
  const { byQuadrant, doneToday } = useMemo(() => {
    const buckets: Record<TaskQuadrant, Task[]> = {
      do_now: [],
      schedule: [],
      when_you_can: [],
      maybe_later: [],
    }
    const done: Task[] = []
    const todayStr = todayLocalYmd()
    for (const t of tasks) {
      if (t.status === "done") {
        if (t.completedAt && completedOnLocalDay(t.completedAt, todayStr)) {
          done.push(t)
        }
        continue
      }
      buckets[quadrantOf(t)].push(t)
    }
    done.sort((a, b) =>
      (b.completedAt ?? "").localeCompare(a.completedAt ?? ""),
    )
    return { byQuadrant: buckets, doneToday: done }
  }, [tasks])

  function markDone(t: Task, note: string | null) {
    update.mutate({
      id: t.id,
      goalId,
      patch: { status: "done", completionNote: note },
    })
  }

  function unDone(t: Task) {
    update.mutate({ id: t.id, goalId, patch: { status: "open" } })
  }

  function handleDragStart(e: DragStartEvent) {
    setDraggingId(String(e.active.id))
  }

  function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null)
    if (!e.over) return
    const taskId = String(e.active.id)
    const target = String(e.over.id) as TaskQuadrant
    if (!isQuadrant(target)) return

    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const flags = QUADRANT_FLAGS[target]
    if (task.important === flags.important && task.urgent === flags.urgent) {
      return // dropped back into the same quadrant
    }

    update.mutate({
      id: task.id,
      goalId,
      patch: { important: flags.important, urgent: flags.urgent },
    })
  }

  const draggingTask = useMemo(
    () => (draggingId ? tasks.find((t) => t.id === draggingId) ?? null : null),
    [draggingId, tasks],
  )

  // Flat list of open tasks, ordered by quadrant priority then sortOrder.
  // Used by the list view; matrix view doesn't need this.
  const flatOpen = useMemo(() => {
    const order: Record<TaskQuadrant, number> = {
      do_now: 0,
      schedule: 1,
      when_you_can: 2,
      maybe_later: 3,
    }
    return [...byQuadrant.do_now, ...byQuadrant.schedule, ...byQuadrant.when_you_can, ...byQuadrant.maybe_later].sort(
      (a, b) => {
        const qa = order[quadrantOf(a)]
        const qb = order[quadrantOf(b)]
        if (qa !== qb) return qa - qb
        return a.sortOrder - b.sortOrder
      },
    )
  }, [byQuadrant])

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <LabelTiny>Tasks</LabelTiny>
          <p className="font-lyric-italic text-[11px] text-earth-mid mt-0.5">
            {viewMode === "matrix"
              ? "Drag a task across quadrants to re-sort it."
              : "Tap a task to edit. Switch to matrix to drag-sort."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <Button onClick={() => setAddOpen(true)} size="sm">
            + Add
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="font-lyric-italic text-earth-mid py-4 text-center text-sm">
          Loading…
        </p>
      ) : viewMode === "matrix" ? (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDraggingId(null)}
        >
          <div className="grid grid-cols-2 gap-2">
            {TASK_QUADRANTS.map((q) => (
              <DroppableQuadrant
                key={q}
                quadrant={q}
                tasks={byQuadrant[q]}
                draggingId={draggingId}
                onEdit={(id) => setEditingId(id)}
                onMarkDone={markDone}
                onUndone={unDone}
              />
            ))}
          </div>

          <DragOverlay>
            {draggingTask ? (
              <div className="opacity-90 shadow-lg rotate-1">
                <TaskCard
                  task={draggingTask}
                  onEdit={() => {}}
                  onMarkDone={() => {}}
                  onUndone={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <ListView
          tasks={flatOpen}
          onEdit={(id) => setEditingId(id)}
          onMarkDone={markDone}
          onUndone={unDone}
        />
      )}

      {/* Completed-today section — hidden by default, toggled from a link.
          Shown only when there's something to show. */}
      {doneToday.length > 0 && (
        <div className="pt-1">
          <ButtonBare
            type="button"
            onClick={() => setDoneOpen((o) => !o)}
            className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-earth-deep transition-colors"
            aria-expanded={doneOpen}
          >
            {doneOpen ? "Hide completed" : `View completed (${doneToday.length})`}
          </ButtonBare>
          {doneOpen && (
            <div className="mt-2 space-y-1.5 rounded-md border border-gold/20 bg-ivory-deep/60 p-2">
              {doneToday.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onEdit={() => setEditingId(t.id)}
                  onMarkDone={(note) => markDone(t, note)}
                  onUndone={() => unDone(t)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {addOpen && (
        <TaskFormModal
          mode="add"
          onClose={() => setAddOpen(false)}
          onSubmit={async (input) => {
            await create.mutateAsync({
              goalId,
              milestoneId: milestoneId ?? null,
              ...input,
            })
          }}
          submitting={create.isPending}
        />
      )}

      {editing && (
        <TaskFormModal
          mode="edit"
          initial={editing}
          onClose={() => setEditingId(null)}
          onSubmit={async (input) => {
            await update.mutateAsync({
              id: editing.id,
              goalId,
              patch: input,
            })
          }}
          onDelete={async () => {
            await remove.mutateAsync({ id: editing.id, goalId })
          }}
          submitting={update.isPending || remove.isPending}
        />
      )}
    </section>
  )
}

// ─── Droppable quadrant ───────────────────────────────────────────────────

function DroppableQuadrant({
  quadrant,
  tasks,
  draggingId,
  onEdit,
  onMarkDone,
  onUndone,
}: {
  quadrant: TaskQuadrant
  tasks: Task[]
  draggingId: string | null
  onEdit: (id: string) => void
  onMarkDone: (t: Task, note: string | null) => void
  onUndone: (t: Task) => void
}) {
  const meta = TASK_QUADRANT_META[quadrant]
  const { isOver, setNodeRef } = useDroppable({ id: quadrant })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-md border p-2 space-y-1.5 min-h-30 transition-colors",
        QUADRANT_TONE[quadrant],
        isOver && "ring-2 ring-saffron/60 ring-offset-1 ring-offset-ivory",
      )}
    >
      <div className="px-1">
        <p
          className={cn(
            "font-pressure-caps text-[10px] tracking-wider",
            QUADRANT_LABEL_TONE[quadrant],
          )}
        >
          {meta.label}
        </p>
        <p className="font-lyric-italic text-[9px] text-earth-mid leading-tight">
          {meta.caption}
        </p>
      </div>
      <div className="space-y-1.5">
        {tasks.length === 0 ? (
          <p className="font-lyric-italic text-[10px] text-earth-mid/70 px-1 py-1">
            —
          </p>
        ) : (
          tasks.map((t) => (
            <DraggableTaskCard
              key={t.id}
              task={t}
              isDragging={draggingId === t.id}
              onEdit={() => onEdit(t.id)}
              onMarkDone={(note) => onMarkDone(t, note)}
              onUndone={() => onUndone(t)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Draggable wrapper around TaskCard ────────────────────────────────────

function DraggableTaskCard({
  task,
  isDragging,
  onEdit,
  onMarkDone,
  onUndone,
}: {
  task: Task
  isDragging: boolean
  onEdit: () => void
  onMarkDone: (note: string | null) => void
  onUndone: () => void
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    // Don't allow done tasks to be dragged — they live in the completed
    // strip, not the matrix.
    disabled: task.status === "done",
  })

  // touch-action MUST be set before the user touches the card, not after
  // the drag has already started. If it's only applied with the transform
  // (mid-drag), iOS/Android claim the initial touch for scrolling and
  // @dnd-kit's TouchSensor never sees the activation through. Setting it
  // unconditionally tells the browser "this element will not pan/zoom" so
  // the long-press activation (200ms) can land. The inner buttons still
  // get tap events because activation requires sustained touch.
  const style: React.CSSProperties = {
    touchAction: "none",
    ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      // Spread listeners on the wrapper so the drag activates from any
      // pointer-down on the card; the inner buttons (checkbox + edit-tap
      // surface) still handle clicks because @dnd-kit's activation
      // constraints (distance / press delay) discriminate drag vs click.
      {...attributes}
      {...listeners}
      className={cn(isDragging && "opacity-30")}
    >
      <TaskCard
        task={task}
        onEdit={onEdit}
        onMarkDone={onMarkDone}
        onUndone={onUndone}
      />
    </div>
  )
}

// ─── View-mode toggle (matrix ⇄ list) ─────────────────────────────────────

function ViewModeToggle({
  value,
  onChange,
}: {
  value: "matrix" | "list"
  onChange: (v: "matrix" | "list") => void
}) {
  return (
    <div
      className="inline-flex rounded-full border border-gold/40 bg-ivory p-0.5"
      role="group"
      aria-label="Task view mode"
    >
      {(["matrix", "list"] as const).map((mode) => {
        const active = value === mode
        return (
          <ButtonBare
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-2 py-0.5 text-[9px] font-pressure-caps tracking-wider transition-colors",
              active
                ? "bg-ink text-ivory"
                : "text-earth-deep hover:bg-ivory-deep",
            )}
          >
            {mode === "matrix" ? "Matrix" : "List"}
          </ButtonBare>
        )
      })}
    </div>
  )
}

// ─── List view (alternative to matrix when there are many tasks) ─────────

function ListView({
  tasks,
  onEdit,
  onMarkDone,
  onUndone,
}: {
  tasks: Task[]
  onEdit: (id: string) => void
  onMarkDone: (t: Task, note: string | null) => void
  onUndone: (t: Task) => void
}) {
  if (tasks.length === 0) {
    return (
      <p className="font-lyric-italic text-[12px] text-earth-mid py-4 text-center">
        No tasks yet. Tap + Add to get started.
      </p>
    )
  }
  return (
    <ul className="space-y-1.5">
      {tasks.map((t) => {
        const q = quadrantOf(t)
        return (
          <li key={t.id}>
            <div className="space-y-1">
              <TaskCard
                task={t}
                onEdit={() => onEdit(t.id)}
                onMarkDone={(note) => onMarkDone(t, note)}
                onUndone={() => onUndone(t)}
              />
              <span
                className={cn(
                  "ml-2 inline-flex items-center rounded-full border px-1.5 py-px font-pressure-caps tracking-wider text-[8px]",
                  QUADRANT_BADGE_TONE[q],
                )}
              >
                {TASK_QUADRANT_META[q].label}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

const QUADRANT_BADGE_TONE: Record<TaskQuadrant, string> = {
  do_now: "border-saffron/50 text-saffron",
  schedule: "border-earth-mid/50 text-earth-deep",
  when_you_can: "border-earth-mid/40 text-earth-mid",
  maybe_later: "border-earth-mid/30 text-earth-mid/70",
}

// ─── Quadrant tones ───────────────────────────────────────────────────────

const QUADRANT_TONE: Record<TaskQuadrant, string> = {
  do_now: "bg-saffron/5 border-saffron/50",
  schedule: "bg-ivory-deep border-gold/30",
  when_you_can: "bg-ivory-deep/60 border-gold/30",
  maybe_later: "bg-ivory-deep/40 border-earth-mid/30",
}

const QUADRANT_LABEL_TONE: Record<TaskQuadrant, string> = {
  do_now: "text-saffron",
  schedule: "text-earth-deep",
  when_you_can: "text-earth-deep",
  maybe_later: "text-earth-mid",
}

// ─── helpers ─────────────────────────────────────────────────────────────

function isQuadrant(s: string): s is TaskQuadrant {
  return (TASK_QUADRANTS as readonly string[]).includes(s)
}

function todayLocalYmd(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function completedOnLocalDay(iso: string, ymd: string): boolean {
  const d = new Date(iso)
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  return local === ymd
}
