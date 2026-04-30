/**
 * Rule-based pattern observer. Reads the user's recent goal-log + reflection
 * + category data, returns 0..N gentle nudges. The voice is restrained:
 * notice, point, suggest — never shame, never gamify.
 *
 * This is the *pre-AI* substrate. When the Acharya layer ships, the AI
 * Acharya will read the same signals + nudges and respond with scripture.
 */

import { db } from "@/lib/db";
import {
  goals,
  goalLogs,
  categories,
  reflections,
} from "@/lib/db/schema";
import { and, eq, gte, lte, desc } from "drizzle-orm";
import type { GoalShape } from "@/types";

export type NudgeSeverity = "gentle" | "important" | "celebration";

export interface Nudge {
  id: string; // stable per-day id (used for dismissal)
  severity: NudgeSeverity;
  title: string;
  body: string;
  /** Optional CTA */
  action?: { label: string; href: string };
  /** Optional scope — render only on a category page */
  categoryId?: string;
  /** Plain-English tag describing what fired this rule */
  tag: string;
}

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
function isoWeekStart(date: string): string {
  const d = new Date(date + "T00:00:00");
  const day = d.getDay() || 7;
  if (day !== 1) d.setDate(d.getDate() - (day - 1));
  return ymd(d);
}
function isoWeekday(date: string): number {
  // 1 = Mon ... 7 = Sun
  const d = new Date(date + "T00:00:00");
  return d.getDay() || 7;
}

interface ObserverContext {
  today: string;
  hour: number;
  weekStart: string;
  isMonday: boolean;
  daysIntoWeek: number; // 1..7
}

export async function observeNudges(userId: string): Promise<Nudge[]> {
  const now = new Date();
  const today = ymd(now);
  const ctx: ObserverContext = {
    today,
    hour: now.getHours(),
    weekStart: isoWeekStart(today),
    isMonday: isoWeekday(today) === 1,
    daysIntoWeek: isoWeekday(today),
  };

  const fourteenAgo = addDays(today, -13);

  // ── Pull data ──
  const [activeGoals, recentLogs, todayReflection, recentCats] = await Promise.all([
    db
      .select({
        id: goals.id,
        categoryId: goals.categoryId,
        title: goals.title,
        shape: goals.shape,
        weeklyTarget: goals.weeklyTarget,
        totalTarget: goals.totalTarget,
        deadlineDate: goals.deadlineDate,
        startedDate: goals.startedDate,
      })
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.status, "active"))),
    db
      .select({ goalId: goalLogs.goalId, date: goalLogs.date, value: goalLogs.value })
      .from(goalLogs)
      .where(
        and(
          eq(goalLogs.userId, userId),
          gte(goalLogs.date, fourteenAgo),
          lte(goalLogs.date, today)
        )
      ),
    db
      .select()
      .from(reflections)
      .where(and(eq(reflections.userId, userId), eq(reflections.date, today)))
      .limit(1),
    db
      .select({ id: categories.id, title: categories.title })
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.isActive, true)))
      .orderBy(desc(categories.createdAt))
      .limit(20),
  ]);

  const nudges: Nudge[] = [];

  // Group logs by goal
  const logsByGoal = new Map<string, Array<{ date: string; value: number }>>();
  for (const l of recentLogs) {
    if (!logsByGoal.has(l.goalId)) logsByGoal.set(l.goalId, []);
    logsByGoal.get(l.goalId)!.push({ date: l.date, value: l.value });
  }
  // Latest log date across all goals
  const latestLogDate = recentLogs.reduce(
    (max, l) => (l.date > max ? l.date : max),
    ""
  );

  // ── RULE: First time — no categories at all ──
  if (recentCats.length === 0) {
    nudges.push({
      id: dailyId("welcome-no-categories", today),
      severity: "gentle",
      title: "Begin where you are.",
      body: "You haven't named any focus areas yet. Start with one — Health, Work, Inner Practice. Just one is enough.",
      action: { label: "Open Plan", href: "/categories" },
      tag: "no-categories",
    });
    return nudges; // no point in other rules without categories
  }

  // ── RULE: Have categories but no goals ──
  if (activeGoals.length === 0) {
    nudges.push({
      id: dailyId("welcome-no-goals", today),
      severity: "gentle",
      title: "Categories without goals are rooms without furniture.",
      body: "Open one of your categories and add a goal. Even one daily practice is enough to begin.",
      action: { label: "Open Plan", href: "/categories" },
      tag: "no-goals",
    });
    return nudges;
  }

  // ── RULE: Long quiet — no logs in 3+ days ──
  const daysSinceLatestLog = latestLogDate
    ? daysBetween(latestLogDate, today)
    : 999;
  if (daysSinceLatestLog >= 3) {
    nudges.push({
      id: dailyId("quiet-spell", today),
      severity: "important",
      title: "It has been quiet.",
      body:
        daysSinceLatestLog >= 7
          ? `Seven days without a logged goal. The path is still here. Begin gently — log one small thing.`
          : `${daysSinceLatestLog} days since you last logged a goal. Begin gently — log one small thing today.`,
      action: { label: "Open today", href: "/" },
      tag: "quiet-3d",
    });
  }

  // ── RULE: Too many daily goals (overload) ──
  const dailyGoals = activeGoals.filter((g) => g.shape === "daily");
  if (dailyGoals.length > 5) {
    nudges.push({
      id: dailyId("daily-overload", today),
      severity: "gentle",
      title: "Two or three sustain. Five do not.",
      body: `You have ${dailyGoals.length} daily goals active. Most practitioners hold two or three at a time. Consider pausing one until the others are firm.`,
      action: { label: "Open Plan", href: "/categories" },
      tag: "daily-overload",
    });
  }

  // ── RULE: Weekly behind, late in the week ──
  // For each weekly goal: if Wed+ and progress < target * (daysIntoWeek/7), surface a nudge.
  if (ctx.daysIntoWeek >= 4) {
    for (const g of activeGoals) {
      if (g.shape !== "weekly" || !g.weeklyTarget) continue;
      const inWeek = (logsByGoal.get(g.id) ?? []).filter(
        (l) => l.date >= ctx.weekStart && l.date <= today
      );
      const total = inWeek.reduce((s, l) => s + (l.value || 0), 0);
      const expected = (g.weeklyTarget * ctx.daysIntoWeek) / 7;
      if (total < expected - 0.5 && total < g.weeklyTarget) {
        const remaining = g.weeklyTarget - total;
        const daysLeft = 7 - ctx.daysIntoWeek + 1;
        nudges.push({
          id: dailyId(`weekly-behind-${g.id}`, today),
          severity: "gentle",
          title: `${g.title} — ${total} of ${g.weeklyTarget} this week.`,
          body: `${remaining} more to keep this week. ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left.`,
          action: { label: "Log one", href: `/categories/${g.categoryId}` },
          categoryId: g.categoryId,
          tag: "weekly-behind",
        });
      }
    }
  }

  // ── RULE: Streak milestones (3, 7, 21, 40, 108) ──
  for (const g of activeGoals) {
    if (g.shape !== "daily") continue;
    const datesSet = new Set(
      (logsByGoal.get(g.id) ?? []).filter((l) => l.value > 0).map((l) => l.date)
    );
    if (!datesSet.has(today)) continue;
    let streak = 0;
    let cursor = today;
    while (datesSet.has(cursor)) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }
    const milestones = [3, 7, 21, 40, 108];
    if (milestones.includes(streak)) {
      nudges.push({
        id: dailyId(`streak-${g.id}-${streak}`, today),
        severity: "celebration",
        title: `${g.title} — ${streak} days kept.`,
        body:
          streak === 3
            ? "A small flame. Tend it."
            : streak === 7
            ? "A saptaha. The first vow length is met."
            : streak === 21
            ? "Twenty-one days. The habit takes root."
            : streak === 40
            ? "A mandala kept. Quiet pride."
            : "One hundred and eight. The mala has filled.",
        tag: `streak-${streak}`,
      });
    }
  }

  // ── RULE: Monday — week intention ──
  if (ctx.isMonday && ctx.hour < 14) {
    nudges.push({
      id: dailyId("monday-intention", today),
      severity: "gentle",
      title: "A new week begins.",
      body: "What is your intention? Look at the week's offerings; let it set itself.",
      action: { label: "See the week", href: "/week" },
      tag: "monday-intention",
    });
  }

  // ── RULE: Evening — reflect prompt if no reflection yet ──
  if (ctx.hour >= 19 && todayReflection.length === 0) {
    nudges.push({
      id: dailyId("evening-reflect", today),
      severity: "gentle",
      title: "Sit with the day before sleep.",
      body: "Quick or deep — even three minutes of svadhyaya keeps the practice whole.",
      action: { label: "Reflect", href: "/reflect" },
      tag: "evening-reflect",
    });
  }

  // ── RULE: By-date deadline approaching ──
  for (const g of activeGoals) {
    if (g.shape !== "by_date" || !g.deadlineDate || !g.totalTarget) continue;
    const daysLeft = daysBetween(today, g.deadlineDate);
    if (daysLeft < 0) continue; // already past
    const total = (logsByGoal.get(g.id) ?? []).reduce(
      (s, l) => s + (l.value || 0),
      0
    );
    // Note: this only counts the last 14 days from logsByGoal — a full
    // total would require pulling all logs. For deadline-pressure detection,
    // recent-window is sufficient (we surface only when the gap is large).
    const ratioLeft = (g.totalTarget - total) / g.totalTarget;
    if (daysLeft <= 30 && ratioLeft > 0.5) {
      nudges.push({
        id: dailyId(`bydate-pressure-${g.id}`, today),
        severity: "important",
        title: `${g.title} — ${daysLeft} ${daysLeft === 1 ? "day" : "days"} remain.`,
        body: `More than half is still ahead. Pick a daily rhythm to keep, or push the deadline.`,
        action: { label: "Open goal", href: `/categories/${g.categoryId}` },
        categoryId: g.categoryId,
        tag: "bydate-pressure",
      });
    }
  }

  return nudges;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + "T00:00:00").getTime();
  const b = new Date(to + "T00:00:00").getTime();
  return Math.round((b - a) / 86_400_000);
}

function dailyId(seed: string, date: string): string {
  return `${date}::${seed}`;
}

// Keep eslint happy on the unused helper used to make Promise.all type-safe
export type _Internal = GoalShape;
