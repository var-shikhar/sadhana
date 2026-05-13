import type { Goal, GoalShape, GoalStatus } from "@/types";

/**
 * Lifecycle helpers for the Goals model.
 *
 * The goal model gained an explicit start_date / end_date in migration 0007.
 * Together with `status`, these power:
 *   - the "scheduled" state (future start date),
 *   - the "in flight" filter on the Plan tab,
 *   - "due soon" / "overdue" nudges,
 *   - the live "Ends X" hint shown under the cadence picker.
 *
 * Pure functions only — no DB access, no React. Both server (auto-promotion
 * on read) and client (form previews, Plan tab) import from here.
 */

// ─── Date helpers (YYYY-MM-DD strings throughout) ───────────────────────

/** Today as a local YYYY-MM-DD string. */
export function todayYmd(): string {
  const d = new Date();
  return ymd(d);
}

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Add `n` days to a YYYY-MM-DD date and return a YYYY-MM-DD string. */
export function addDays(date: string, n: number): string {
  const d = parseYmd(date);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

/** Parse YYYY-MM-DD as a local-midnight Date — avoids the UTC drift trap. */
export function parseYmd(s: string): Date {
  return new Date(s + "T00:00:00");
}

/** Whole days from `from` to `to` (positive when to > from). */
export function daysBetween(from: string, to: string): number {
  const a = parseYmd(from).getTime();
  const b = parseYmd(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

// ─── Lifecycle classification ───────────────────────────────────────────

/**
 * Effective lifecycle phase for the UI. Distinct from `goal.status` because:
 *   - 'in_flight' isn't a stored status, it's "active AND today is within
 *     [startDate, endDate]".
 *   - 'overdue' folds in goals whose endDate has passed but were never
 *     marked completed.
 *   - 'due_soon' is purely time-derived; no DB column.
 */
export type LifecyclePhase =
  | "scheduled"   // start in future
  | "in_flight"  // active and today within window
  | "due_soon"   // active and ends within DUE_SOON_WINDOW_DAYS
  | "overdue"    // active and end < today
  | "paused"
  | "completed"
  | "abandoned";

export const DUE_SOON_WINDOW_DAYS = 7;

export function lifecyclePhaseOf(
  goal: Pick<Goal, "status" | "startDate" | "endDate">,
  today: string = todayYmd(),
): LifecyclePhase {
  if (goal.status === "abandoned") return "abandoned";
  if (goal.status === "completed") return "completed";
  if (goal.status === "paused") return "paused";
  if (goal.status === "scheduled") return "scheduled";

  // status === 'active'
  if (goal.startDate > today) return "scheduled"; // not yet promoted
  if (goal.endDate && goal.endDate < today) return "overdue";
  if (goal.endDate && daysBetween(today, goal.endDate) <= DUE_SOON_WINDOW_DAYS) {
    return "due_soon";
  }
  return "in_flight";
}

/** True iff this goal should appear in Today's Practice / Plan today. */
export function isInFlight(
  goal: Pick<Goal, "status" | "startDate" | "endDate">,
  today: string = todayYmd(),
): boolean {
  if (goal.status !== "active") return false;
  if (goal.startDate > today) return false;
  if (goal.endDate && goal.endDate < today) return false;
  return true;
}

// ─── Derived end date (live preview in the goal form) ───────────────────

/**
 * Given a cadence + start date, suggest a sensible default end date when
 * the user hasn't picked one. Used for the "Ends …" hint under the cadence
 * picker so the user can see the resulting window before committing.
 *
 * Rules:
 *   - daily       → start + 30 days
 *   - weekly      → start + 12 weeks (84 days)
 *   - monthly     → start + 6 months
 *   - by_date     → no suggestion (user picks endDate explicitly)
 */
export function suggestedEndDate(
  shape: GoalShape,
  startDate: string,
): string | null {
  if (shape === "by_date") return null;
  if (shape === "daily") return addDays(startDate, 30);
  if (shape === "weekly") return addDays(startDate, 84);
  // monthly → +6 months, calendar-aware
  const d = parseYmd(startDate);
  d.setMonth(d.getMonth() + 6);
  return ymd(d);
}

// ─── Sub-goal constraints ───────────────────────────────────────────────

/**
 * The cadences a sub-goal may take, given its parent's cadence + window.
 * A sub-goal can never outlast its parent. e.g. a daily parent can only
 * spawn daily children; a weekly parent allows daily/weekly children; etc.
 */
export function allowedSubShapesFor(parentShape: GoalShape): GoalShape[] {
  if (parentShape === "daily") return ["daily"];
  if (parentShape === "weekly") return ["daily", "weekly"];
  if (parentShape === "monthly") return ["daily", "weekly", "monthly"];
  // by_date parents: any cadence is fine, but the end date is clamped to
  // the parent's end date (validated separately in `clampEndToParent`).
  return ["daily", "weekly", "monthly", "by_date"];
}

/**
 * The latest endDate a sub-goal may have, given its parent's lifecycle
 * window. Returns null when the parent has no end date — sub-goal is then
 * unconstrained on the time axis.
 */
export function maxEndDateForSub(
  parent: Pick<Goal, "endDate">,
): string | null {
  return parent.endDate ?? null;
}

/**
 * Earliest startDate a sub-goal may have, given its parent. A sub-goal
 * can't start before the parent does — the parent isn't even tracking yet.
 */
export function minStartDateForSub(
  parent: Pick<Goal, "startDate">,
): string {
  return parent.startDate;
}

// ─── Format helpers (for the form preview) ──────────────────────────────

export function formatHumanDate(ymdStr: string): string {
  const d = parseYmd(ymdStr);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeFromToday(ymdStr: string): string {
  const diff = daysBetween(todayYmd(), ymdStr);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff > 0) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

// ─── Status display helpers ─────────────────────────────────────────────

/** True when the status counts as "alive" — visible by default in lists. */
export function isLiveStatus(status: GoalStatus): boolean {
  return status === "active" || status === "scheduled";
}

// ─── Quest activation conflict ──────────────────────────────────────────

/**
 * Returned by the goals API when an attempted activation would exceed the
 * user's `maxActiveQuests`. The client catches this code and shows a modal
 * letting the user pick one of `currentActiveQuestIds` to pause first.
 */
export const QUEST_ACTIVATION_CONFLICT = "quest_activation_conflict" as const;

export interface QuestActivationConflict {
  error: typeof QUEST_ACTIVATION_CONFLICT;
  max: number;
  currentActiveQuestIds: string[];
}

/**
 * Thrown by `useUpdateGoalV2` when an activation attempt hits the
 * maxActiveQuests cap. UI catches this specifically and renders the
 * "which quest will you pause?" modal.
 */
export class QuestActivationConflictError extends Error {
  readonly max: number;
  readonly currentActiveQuestIds: string[];
  constructor(detail: { max: number; currentActiveQuestIds: string[] }) {
    super(
      `Already at ${detail.max} active quest${detail.max === 1 ? "" : "s"}.`,
    );
    this.name = "QuestActivationConflictError";
    this.max = detail.max;
    this.currentActiveQuestIds = detail.currentActiveQuestIds;
  }
}
