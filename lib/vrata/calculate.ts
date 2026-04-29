import { db } from "@/lib/db";
import { vratas, vrataSlips, dailyLogs } from "@/lib/db/schema";
import { and, eq, gte, lte, inArray, desc, sql } from "drizzle-orm";
import type {
  Vrata,
  VrataSlip,
  VrataState,
  MalaState,
  TapasState,
} from "@/types";

const SLIP_EXTENSION = 2; // strict: each slip extends the vrata by 2 days

/**
 * Format a Date as YYYY-MM-DD in the *user's calendar day*.
 * Postgres `date` columns store calendar dates; we keep the same convention here.
 */
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + n);
  return ymd(d);
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + "T00:00:00").getTime();
  const b = new Date(to + "T00:00:00").getTime();
  return Math.round((b - a) / 86_400_000);
}

function dbVrataToType(row: typeof vratas.$inferSelect): Vrata {
  return {
    id: row.id,
    userId: row.userId,
    lengthName: row.lengthName,
    baseDays: row.baseDays,
    extensionDays: row.extensionDays,
    boundHabitIds: row.boundHabitIds,
    sankalpa: row.sankalpa,
    startedDate: row.startedDate,
    completedDate: row.completedDate,
    abandonedDate: row.abandonedDate,
    status: row.status,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

function dbSlipToType(row: typeof vrataSlips.$inferSelect): VrataSlip {
  return {
    id: row.id,
    vrataId: row.vrataId,
    userId: row.userId,
    date: row.date,
    reason: row.reason,
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

/**
 * For a given vrata, compute:
 *  - daysCompleted (where ALL bound user_habits were marked done on that date)
 *  - missed days that should be recorded as slips (and aren't yet)
 *
 * Strict policy: each slip adds 2 days to the vrata's target end.
 *
 * Returns the updated state and any newly-detected slips (which the caller
 * is expected to persist via `recordSlips`).
 */
async function computeVrataProgress(
  vrata: Vrata,
  today: string
): Promise<{
  daysCompleted: number;
  daysTarget: number;
  newSlipDates: string[];
  existingSlips: VrataSlip[];
}> {
  const start = vrata.startedDate;
  const end = today < addDays(start, vrata.baseDays + vrata.extensionDays - 1)
    ? today
    : addDays(start, vrata.baseDays + vrata.extensionDays - 1);

  // Pull all logs for bound habits in the vrata window
  const logs = await db
    .select({
      date: dailyLogs.date,
      userHabitId: dailyLogs.userHabitId,
      completed: dailyLogs.completed,
    })
    .from(dailyLogs)
    .where(
      and(
        eq(dailyLogs.userId, vrata.userId),
        gte(dailyLogs.date, start),
        lte(dailyLogs.date, end),
        inArray(dailyLogs.userHabitId, vrata.boundHabitIds)
      )
    );

  // Group by date → set of completed bound habits
  const completedByDate = new Map<string, Set<string>>();
  for (const l of logs) {
    if (!l.completed) continue;
    if (!completedByDate.has(l.date)) completedByDate.set(l.date, new Set());
    completedByDate.get(l.date)!.add(l.userHabitId);
  }

  // For each calendar day in window, determine: kept | slip | (future, skip)
  const daysInWindow = daysBetween(start, end) + 1;
  let kept = 0;
  const slipDates: string[] = [];
  for (let i = 0; i < daysInWindow; i++) {
    const date = addDays(start, i);
    if (date > today) break;
    if (date === today) {
      // today is in-progress — don't count it as a slip even if not yet kept
      const set = completedByDate.get(date);
      if (set && set.size === vrata.boundHabitIds.length) kept += 1;
      continue;
    }
    const set = completedByDate.get(date);
    if (set && set.size === vrata.boundHabitIds.length) {
      kept += 1;
    } else {
      slipDates.push(date);
    }
  }

  // Filter to slip dates we haven't yet recorded
  const existingSlipsRows = await db
    .select()
    .from(vrataSlips)
    .where(eq(vrataSlips.vrataId, vrata.id));
  const existingSlips = existingSlipsRows.map(dbSlipToType);
  const recordedSlipDates = new Set(existingSlips.map((s) => s.date));
  const newSlipDates = slipDates.filter((d) => !recordedSlipDates.has(d));

  // Target = base + extension. After persisting newSlipDates, extension grows.
  const daysTarget =
    vrata.baseDays + vrata.extensionDays + newSlipDates.length * SLIP_EXTENSION;

  return { daysCompleted: kept, daysTarget, newSlipDates, existingSlips };
}

/**
 * Persist newly-detected slips and grow the vrata's extensionDays.
 * Returns the updated slips list.
 */
async function recordSlips(
  vrata: Vrata,
  newSlipDates: string[]
): Promise<VrataSlip[]> {
  if (newSlipDates.length === 0) return [];

  const inserted = await db
    .insert(vrataSlips)
    .values(
      newSlipDates.map((date) => ({
        vrataId: vrata.id,
        userId: vrata.userId,
        date,
      }))
    )
    .returning();

  await db
    .update(vratas)
    .set({
      extensionDays: vrata.extensionDays + newSlipDates.length * SLIP_EXTENSION,
    })
    .where(eq(vratas.id, vrata.id));

  return inserted.map(dbSlipToType);
}

/**
 * Mark a vrata complete if conditions are met.
 * Completion = daysCompleted >= baseDays + extensionDays.
 */
async function maybeComplete(
  vrata: Vrata,
  daysCompleted: number,
  daysTarget: number,
  today: string
): Promise<Vrata> {
  if (daysCompleted >= daysTarget && vrata.status === "active") {
    await db
      .update(vratas)
      .set({ status: "completed", completedDate: today })
      .where(eq(vratas.id, vrata.id));
    return { ...vrata, status: "completed", completedDate: today };
  }
  return vrata;
}

/**
 * The main entry: get the user's full vrata state, side-effecting any
 * slip detection / completion that has accrued since last visit.
 */
export async function getVrataState(userId: string): Promise<VrataState> {
  const today = ymd(new Date());

  const activeRow = await db
    .select()
    .from(vratas)
    .where(and(eq(vratas.userId, userId), eq(vratas.status, "active")))
    .limit(1);

  const historyRows = await db
    .select()
    .from(vratas)
    .where(and(eq(vratas.userId, userId), inArray(vratas.status, ["completed", "abandoned"])))
    .orderBy(desc(vratas.startedDate))
    .limit(10);

  const history = historyRows.map(dbVrataToType);

  if (activeRow.length === 0) {
    return {
      active: null,
      daysCompleted: 0,
      daysTarget: 0,
      slips: [],
      history,
      unacknowledgedSlips: [],
    };
  }

  let active = dbVrataToType(activeRow[0]);

  const { daysCompleted, daysTarget, newSlipDates, existingSlips } =
    await computeVrataProgress(active, today);

  let allSlips = existingSlips;
  if (newSlipDates.length > 0) {
    const newlyRecorded = await recordSlips(active, newSlipDates);
    allSlips = [...existingSlips, ...newlyRecorded];
    // Refresh vrata extension
    active = {
      ...active,
      extensionDays: active.extensionDays + newSlipDates.length * SLIP_EXTENSION,
    };
  }

  // Final completion check (after extensions applied)
  const finalTarget = active.baseDays + active.extensionDays;
  active = await maybeComplete(active, daysCompleted, finalTarget, today);

  const unacknowledgedSlips = allSlips.filter((s) => !s.acknowledgedAt);

  return {
    active: active.status === "active" ? active : null,
    daysCompleted,
    daysTarget: finalTarget,
    slips: allSlips,
    history:
      active.status === "completed"
        ? [active, ...history]
        : history,
    unacknowledgedSlips,
  };
}

/**
 * "Days walked" = distinct dates where the user logged at least one habit
 * as completed. Used by the mala (lifetime cumulative).
 */
export async function getMalaState(userId: string): Promise<MalaState> {
  // Distinct days walked (lifetime)
  const distinctDaysRow = await db
    .select({ d: sql<string>`distinct ${dailyLogs.date}` })
    .from(dailyLogs)
    .where(and(eq(dailyLogs.userId, userId), eq(dailyLogs.completed, true)));
  const allDates = distinctDaysRow.map((r) => r.d).sort();
  const totalDaysWalked = allDates.length;
  const currentMalaBeads = totalDaysWalked % 108;

  // Last 27 days density
  const today = ymd(new Date());
  const start = addDays(today, -26);
  const walkedSet = new Set(allDates.filter((d) => d >= start));

  const recent27: Array<"filled" | "slip" | "future"> = [];
  for (let i = 0; i < 27; i++) {
    const date = addDays(start, i);
    if (date > today) recent27.push("future");
    else if (walkedSet.has(date)) recent27.push("filled");
    else recent27.push("slip");
  }

  return { totalDaysWalked, recent27, currentMalaBeads };
}

/**
 * Tapas brightness (0..1) — derived from the last 7 days. Each day's
 * contribution = (completed bound habits / total bound habits), or, if no
 * vrata is active, (completed habits / total user habits) for that day.
 *
 * The brightness is the weighted mean, with recent days weighted more:
 *   weight[i] = (i+1) for i in 0..6, where i=6 is today
 */
export async function getTapasState(userId: string): Promise<TapasState> {
  const today = ymd(new Date());
  const start = addDays(today, -6);

  // Pull all user habits + logs in window
  const [logs] = await Promise.all([
    db
      .select({
        date: dailyLogs.date,
        userHabitId: dailyLogs.userHabitId,
        completed: dailyLogs.completed,
      })
      .from(dailyLogs)
      .where(
        and(
          eq(dailyLogs.userId, userId),
          gte(dailyLogs.date, start),
          lte(dailyLogs.date, today)
        )
      ),
  ]);

  // For each day, take a single representative ratio: completed / unique-habits-logged-that-day.
  // If the user logged nothing on a day, ratio = 0.
  const recent7: number[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    const dayLogs = logs.filter((l) => l.date === date);
    if (dayLogs.length === 0) {
      recent7.push(0);
      continue;
    }
    const done = dayLogs.filter((l) => l.completed).length;
    recent7.push(done / dayLogs.length);
  }

  let weighted = 0;
  let weightTotal = 0;
  for (let i = 0; i < 7; i++) {
    const w = i + 1;
    weighted += recent7[i] * w;
    weightTotal += w;
  }
  const brightness = weightTotal > 0 ? weighted / weightTotal : 0;

  return { brightness, recent7 };
}

/**
 * Declare a new vrata. Fails if one is already active.
 */
export async function declareVrata(input: {
  userId: string;
  lengthName: Vrata["lengthName"];
  baseDays: number;
  boundHabitIds: string[];
  sankalpa: string | null;
}): Promise<Vrata> {
  const existing = await db
    .select()
    .from(vratas)
    .where(and(eq(vratas.userId, input.userId), eq(vratas.status, "active")))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("An active vrata already exists. Complete or abandon it first.");
  }

  const today = ymd(new Date());
  const [row] = await db
    .insert(vratas)
    .values({
      userId: input.userId,
      lengthName: input.lengthName,
      baseDays: input.baseDays,
      extensionDays: 0,
      boundHabitIds: input.boundHabitIds,
      sankalpa: input.sankalpa,
      startedDate: today,
      status: "active",
    })
    .returning();

  return dbVrataToType(row);
}

export async function abandonActiveVrata(userId: string): Promise<void> {
  const today = ymd(new Date());
  await db
    .update(vratas)
    .set({ status: "abandoned", abandonedDate: today })
    .where(and(eq(vratas.userId, userId), eq(vratas.status, "active")));
}

export async function acknowledgeSlips(
  userId: string,
  slipIds: string[]
): Promise<void> {
  if (slipIds.length === 0) return;
  await db
    .update(vrataSlips)
    .set({ acknowledgedAt: new Date() })
    .where(
      and(eq(vrataSlips.userId, userId), inArray(vrataSlips.id, slipIds))
    );
}
