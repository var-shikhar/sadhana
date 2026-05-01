import { db } from "@/lib/db";
import {
  goals,
  goalLogs,
  categories,
  reflections,
  vratas,
  vrataSlips,
  growthScores,
} from "@/lib/db/schema";
import { and, eq, gte, desc, sql } from "drizzle-orm";

/**
 * The Acharya's window into the practitioner's life. Pulls the last N days
 * of activity and shapes it into a compact, deterministic block that the
 * LLM can lean on when answering. No extra LLM call — just structured text
 * the synthesis prompt embeds verbatim.
 *
 * What goes in:
 *   - Active goals + today's status
 *   - Last 5 reflections (truncated)
 *   - Active vratas + recent slips
 *   - 14-day growth-score trend (one number)
 *
 * What stays out:
 *   - Anything older than the window
 *   - Full CBT entries are truncated to ~240 chars per reflection
 *   - PII beyond what the user already typed into reflections
 */

const WINDOW_DAYS = 14;
const REFLECTION_PREVIEW_CHARS = 240;
const MAX_REFLECTIONS = 5;

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
}

function truncate(s: string | null | undefined, max: number): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1).trimEnd() + "…";
}

export interface PractitionerSnapshot {
  windowDays: number;
  today: string;
  goalsToday: Array<{
    title: string;
    category: string;
    shape: string;
    isMet: boolean;
    detail: string;
  }>;
  recentReflections: Array<{
    date: string;
    mode: "quick" | "deep";
    quickTags: string[];
    quickNote: string | null;
    cbtEvent: string | null;
    cbtThought: string | null;
    cbtFeeling: string | null;
    cbtReframe: string | null;
  }>;
  activeVratas: Array<{
    sankalpa: string | null;
    lengthName: string;
    daysIn: number;
    targetDays: number;
    recentSlips: number;
  }>;
  growthTrend: {
    avgScore: number | null;
    daysLogged: number;
  };
  derivedTags: string[];
}

/**
 * Build a snapshot of the practitioner's recent state. Runs the queries in
 * parallel so total latency stays close to the slowest one.
 */
export async function buildPractitionerSnapshot(
  userId: string
): Promise<PractitionerSnapshot> {
  const today = ymd(new Date());
  const windowStart = daysAgo(WINDOW_DAYS - 1);

  const [goalRows, reflectionRows, vrataRows, slipRows, scoreRows] =
    await Promise.all([
      db
        .select({
          id: goals.id,
          title: goals.title,
          shape: goals.shape,
          weeklyTarget: goals.weeklyTarget,
          totalTarget: goals.totalTarget,
          deadlineDate: goals.deadlineDate,
          categoryTitle: categories.title,
          categoryPriority: categories.priority,
        })
        .from(goals)
        .innerJoin(categories, eq(categories.id, goals.categoryId))
        .where(
          and(
            eq(goals.userId, userId),
            eq(goals.status, "active"),
            eq(categories.isActive, true)
          )
        )
        .orderBy(categories.priority, goals.sortOrder),
      db
        .select()
        .from(reflections)
        .where(
          and(
            eq(reflections.userId, userId),
            gte(reflections.date, windowStart)
          )
        )
        .orderBy(desc(reflections.date))
        .limit(MAX_REFLECTIONS),
      db
        .select()
        .from(vratas)
        .where(and(eq(vratas.userId, userId), eq(vratas.status, "active"))),
      db
        .select({ vrataId: vrataSlips.vrataId, date: vrataSlips.date })
        .from(vrataSlips)
        .where(
          and(
            eq(vrataSlips.userId, userId),
            gte(vrataSlips.date, windowStart)
          )
        ),
      db
        .select({
          date: growthScores.date,
          dailyScore: growthScores.dailyScore,
        })
        .from(growthScores)
        .where(
          and(
            eq(growthScores.userId, userId),
            gte(growthScores.date, windowStart)
          )
        ),
    ]);

  // Today's goal status — pull logs for active goals in one query.
  const activeGoalIds = goalRows.map((g) => g.id);
  const todayLogsByGoal = new Map<string, number>();
  const totalByGoal = new Map<string, number>();
  const weekStartDate = (() => {
    const d = new Date(today + "T00:00:00");
    const day = d.getDay() || 7;
    if (day !== 1) d.setDate(d.getDate() - (day - 1));
    return ymd(d);
  })();
  const weekTotalByGoal = new Map<string, number>();

  if (activeGoalIds.length > 0) {
    const logs = await db
      .select({
        goalId: goalLogs.goalId,
        date: goalLogs.date,
        value: goalLogs.value,
      })
      .from(goalLogs)
      .where(
        and(
          eq(goalLogs.userId, userId),
          gte(goalLogs.date, windowStart)
        )
      );
    for (const l of logs) {
      if (l.date === today) {
        todayLogsByGoal.set(l.goalId, (todayLogsByGoal.get(l.goalId) ?? 0) + l.value);
      }
      if (l.date >= weekStartDate) {
        weekTotalByGoal.set(l.goalId, (weekTotalByGoal.get(l.goalId) ?? 0) + l.value);
      }
    }
    const totals = await db
      .select({
        goalId: goalLogs.goalId,
        total: sql<number>`coalesce(sum(${goalLogs.value}), 0)`.as("total"),
      })
      .from(goalLogs)
      .where(eq(goalLogs.userId, userId))
      .groupBy(goalLogs.goalId);
    for (const t of totals) totalByGoal.set(t.goalId, Number(t.total));
  }

  const goalsToday = goalRows.map((g) => {
    if (g.shape === "daily") {
      const done = (todayLogsByGoal.get(g.id) ?? 0) > 0;
      return {
        title: g.title,
        category: g.categoryTitle,
        shape: g.shape,
        isMet: done,
        detail: done ? "done today" : "open today",
      };
    }
    if (g.shape === "weekly") {
      const wt = weekTotalByGoal.get(g.id) ?? 0;
      const tg = g.weeklyTarget ?? 1;
      return {
        title: g.title,
        category: g.categoryTitle,
        shape: g.shape,
        isMet: wt >= tg,
        detail: `${wt}/${tg} this week`,
      };
    }
    const so = totalByGoal.get(g.id) ?? 0;
    const tg = g.totalTarget ?? 1;
    return {
      title: g.title,
      category: g.categoryTitle,
      shape: g.shape,
      isMet: so >= tg,
      detail: `${so}/${tg} total`,
    };
  });

  // Vrata slip counts per active vrata
  const slipsByVrata = new Map<string, number>();
  for (const s of slipRows) {
    slipsByVrata.set(s.vrataId, (slipsByVrata.get(s.vrataId) ?? 0) + 1);
  }
  const activeVratas = vrataRows.map((v) => {
    const start = new Date(v.startedDate + "T00:00:00").getTime();
    const now = new Date(today + "T00:00:00").getTime();
    const daysIn = Math.max(
      0,
      Math.round((now - start) / 86_400_000) + 1
    );
    return {
      sankalpa: truncate(v.sankalpa, 120),
      lengthName: v.lengthName,
      daysIn,
      targetDays: v.baseDays + (v.extensionDays ?? 0),
      recentSlips: slipsByVrata.get(v.id) ?? 0,
    };
  });

  // Growth trend
  const numericScores = scoreRows
    .map((s) => Number(s.dailyScore))
    .filter((n) => !Number.isNaN(n));
  const avgScore =
    numericScores.length > 0
      ? Math.round(
          (numericScores.reduce((a, b) => a + b, 0) / numericScores.length) * 10
        ) / 10
      : null;

  const recentReflections = reflectionRows.map((r) => ({
    date: r.date,
    mode: r.mode,
    quickTags: r.quickTags ?? [],
    quickNote: truncate(r.quickNote, REFLECTION_PREVIEW_CHARS),
    cbtEvent: truncate(r.cbtEvent, REFLECTION_PREVIEW_CHARS),
    cbtThought: truncate(r.cbtThought, REFLECTION_PREVIEW_CHARS),
    cbtFeeling: truncate(r.cbtFeeling, REFLECTION_PREVIEW_CHARS),
    cbtReframe: truncate(r.cbtReframe, REFLECTION_PREVIEW_CHARS),
  }));

  const derivedTags = deriveTags({
    goalsToday,
    recentReflections,
    activeVratas,
    avgScore,
    daysLogged: numericScores.length,
  });

  return {
    windowDays: WINDOW_DAYS,
    today,
    goalsToday,
    recentReflections,
    activeVratas,
    growthTrend: { avgScore, daysLogged: numericScores.length },
    derivedTags,
  };
}

/**
 * Heuristic mapping from user state → scripture verse-tags. These tags are
 * passed to retrieval as a `boostTags` array — verses carrying any of them
 * get a similarity bonus, surfacing more contextually relevant counsel.
 *
 * The mapping is intentionally simple. Hand-curated tags on verses
 * (added during the research pass) are what give this leverage; this
 * function just decides which ones the practitioner needs *today*.
 */
function deriveTags(input: {
  goalsToday: PractitionerSnapshot["goalsToday"];
  recentReflections: PractitionerSnapshot["recentReflections"];
  activeVratas: PractitionerSnapshot["activeVratas"];
  avgScore: number | null;
  daysLogged: number;
}): string[] {
  const tags = new Set<string>();

  const totalGoals = input.goalsToday.length;
  const metCount = input.goalsToday.filter((g) => g.isMet).length;
  if (totalGoals > 0) {
    const ratio = metCount / totalGoals;
    if (ratio < 0.3) tags.add("doubting-path");
    if (ratio >= 0.8) tags.add("abhyasa");
  }

  const totalSlips = input.activeVratas.reduce(
    (a, v) => a + v.recentSlips,
    0
  );
  if (totalSlips >= 2) {
    tags.add("starting-and-quitting");
    tags.add("restless-mind");
  }

  if (input.avgScore !== null && input.daysLogged >= 5) {
    if (input.avgScore < 30) tags.add("overwhelm");
    if (input.avgScore >= 70) tags.add("steadiness");
  }

  // Pull quickTags from the most recent reflection — those are the user's
  // own labels for what they are wrestling with.
  const latest = input.recentReflections[0];
  if (latest?.quickTags) {
    for (const t of latest.quickTags) {
      const norm = t.toLowerCase().replace(/\s+/g, "-");
      if (norm) tags.add(norm);
    }
  }

  return Array.from(tags);
}

/**
 * Render the snapshot into a compact text block the LLM can read. Keep this
 * deterministic and short — every token costs.
 */
export function formatSnapshotForPrompt(snap: PractitionerSnapshot): string {
  const parts: string[] = [];
  parts.push(`PRACTITIONER STATE (today: ${snap.today}, last ${snap.windowDays} days):`);

  if (snap.goalsToday.length === 0) {
    parts.push("- No active goals defined.");
  } else {
    parts.push("Active goals:");
    for (const g of snap.goalsToday) {
      const mark = g.isMet ? "✓" : "·";
      parts.push(`  ${mark} [${g.category}] ${g.title} — ${g.detail}`);
    }
  }

  if (snap.activeVratas.length > 0) {
    parts.push("Active vratas (vows):");
    for (const v of snap.activeVratas) {
      const sk = v.sankalpa ? ` "${v.sankalpa}"` : "";
      const slip = v.recentSlips > 0 ? `, ${v.recentSlips} slip(s) recent` : "";
      parts.push(
        `  · ${v.lengthName} day ${v.daysIn}/${v.targetDays}${sk}${slip}`
      );
    }
  }

  if (snap.growthTrend.avgScore !== null) {
    parts.push(
      `Growth trend: ${snap.growthTrend.avgScore} avg over ${snap.growthTrend.daysLogged} of ${snap.windowDays} days.`
    );
  }

  if (snap.recentReflections.length > 0) {
    parts.push("Recent reflections (most recent first):");
    for (const r of snap.recentReflections) {
      const tagStr = r.quickTags.length > 0 ? ` [${r.quickTags.join(", ")}]` : "";
      parts.push(`  ${r.date} (${r.mode})${tagStr}`);
      if (r.quickNote) parts.push(`    note: ${r.quickNote}`);
      if (r.cbtEvent) parts.push(`    event: ${r.cbtEvent}`);
      if (r.cbtThought) parts.push(`    thought: ${r.cbtThought}`);
      if (r.cbtFeeling) parts.push(`    feeling: ${r.cbtFeeling}`);
      if (r.cbtReframe) parts.push(`    reframe: ${r.cbtReframe}`);
    }
  }

  if (snap.derivedTags.length > 0) {
    parts.push(`Inferred state-tags: ${snap.derivedTags.join(", ")}`);
  }

  return parts.join("\n");
}
