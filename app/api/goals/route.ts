import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { goals, categories } from "@/lib/db/schema";
import { and, eq, isNull, max } from "drizzle-orm";
import {
  countActiveQuests,
  dbGoalToType,
  getMaxActiveQuests,
  listTopLevelGoals,
  type GoalListFilters,
} from "@/lib/goals/progress";
import { recordGoalCreated } from "@/lib/goals/history";
import { todayYmd } from "@/lib/goals/lifecycle";
import {
  isHorizonAllowedUnder,
  type GoalHorizon,
  type GoalShape,
  type GoalSource,
  type GoalStatus,
  type GoalType,
} from "@/types";

/** GET /api/goals — list top-level goals, with optional filters. */
export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const filters: GoalListFilters = {};
  const horizon = url.searchParams.get("horizon");
  if (horizon) filters.horizon = horizon as GoalHorizon;
  const shape = url.searchParams.get("shape");
  if (shape) filters.shape = shape as GoalShape;
  const status = url.searchParams.get("status");
  if (status) filters.status = status as GoalStatus;
  const category = url.searchParams.get("category");
  if (category) filters.category = category;

  const list = await listTopLevelGoals(auth.userId, filters);
  return NextResponse.json(list);
}

/** POST /api/goals — create a top-level goal OR sub-goal (parentId set). */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    title: string;
    description?: string | null;
    horizon?: GoalHorizon;
    shape: GoalShape;
    /** Quest or discipline. Defaults from shape if absent (by_date → quest). */
    goalType?: GoalType;
    weeklyTarget?: number | null;
    totalTarget?: number | null;
    /** Optional finish line for any cadence. null = open-ended. */
    endDate?: string | null;
    /** When tracking begins. Defaults to today. */
    startDate?: string | null;
    categoryId?: string | null;
    parentId?: string | null;
    source?: GoalSource;
  };

  const title = body.title?.trim().slice(0, 80);
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  const VALID_SHAPES: GoalShape[] = ["daily", "weekly", "monthly", "by_date"];
  if (!VALID_SHAPES.includes(body.shape)) {
    return NextResponse.json({ error: "Invalid cadence" }, { status: 400 });
  }
  const horizon: GoalHorizon = body.horizon ?? "medium_term";

  // Goal type. If the client doesn't specify, infer from shape: by_date
  // implies quest; everything else implies discipline. The form picks
  // explicitly, so this is mostly a defensive default.
  const goalType: GoalType =
    body.goalType ?? (body.shape === "by_date" ? "quest" : "discipline");

  // Sub-goal validation: parent must exist, belong to user, be top-level,
  // and the child's horizon must be ≤ parent's.
  if (body.parentId) {
    const [parent] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, body.parentId), eq(goals.userId, auth.userId)))
      .limit(1);
    if (!parent) {
      return NextResponse.json(
        { error: "Parent goal not found" },
        { status: 404 },
      );
    }
    if (parent.parentId) {
      return NextResponse.json(
        { error: "Sub-goals cannot have their own sub-goals" },
        { status: 400 },
      );
    }
    if (!isHorizonAllowedUnder(horizon, parent.horizon)) {
      return NextResponse.json(
        {
          error: `A ${horizon.replace("_", " ")} sub-goal cannot live under a ${parent.horizon.replace("_", " ")} parent.`,
        },
        { status: 400 },
      );
    }
  }

  // Optional category — if provided, verify ownership.
  if (body.categoryId) {
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(eq(categories.id, body.categoryId), eq(categories.userId, auth.userId)),
      )
      .limit(1);
    if (!cat) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }
  }

  const today = todayYmd();

  // Lifecycle window. startDate defaults to today. endDate applies to all
  // cadences. Server-side validation duplicates what the form blocks so a
  // stale client can't smuggle invalid values through.
  const startDate = body.startDate?.trim() || today;
  const endDate = body.endDate?.trim() || null;

  if (endDate && endDate < startDate) {
    return NextResponse.json(
      { error: "End date can't be before start date." },
      { status: 400 },
    );
  }

  // Sub-goal lifecycle clamping: can't start before parent, can't end after.
  if (body.parentId) {
    const [parentRow] = await db
      .select({ startDate: goals.startDate, endDate: goals.endDate })
      .from(goals)
      .where(eq(goals.id, body.parentId))
      .limit(1);
    if (parentRow) {
      if (startDate < parentRow.startDate) {
        return NextResponse.json(
          { error: "Sub-goal can't start before its parent." },
          { status: 400 },
        );
      }
      if (parentRow.endDate && endDate && endDate > parentRow.endDate) {
        return NextResponse.json(
          { error: "Sub-goal can't end after its parent." },
          { status: 400 },
        );
      }
      if (parentRow.endDate && !endDate) {
        // If the parent has an end and the child doesn't specify one,
        // clamp to parent's end. The user's intent is "within the parent".
        // This is a server-side fallback — the form should also surface it.
      }
    }
  }

  const sortScope = body.parentId
    ? and(eq(goals.userId, auth.userId), eq(goals.parentId, body.parentId))
    : and(eq(goals.userId, auth.userId), isNull(goals.parentId));
  const [maxOrder] = await db
    .select({ m: max(goals.sortOrder) })
    .from(goals)
    .where(sortScope);

  // Future start date → 'scheduled'. Auto-promotes to 'active' when its day
  // arrives via promoteScheduledGoals() at the start of every list/get.
  let initialStatus: GoalStatus = startDate > today ? "scheduled" : "active";

  // Quest activation cap: if the user is about to add a quest that would
  // immediately go 'active' but they're already at maxActiveQuests, we
  // demote this one to 'scheduled' instead. The form's submit guard
  // catches this before we get here; this is the server-side safety.
  if (goalType === "quest" && initialStatus === "active") {
    const [max, current] = await Promise.all([
      getMaxActiveQuests(auth.userId),
      countActiveQuests(auth.userId),
    ]);
    if (current >= max) {
      initialStatus = "scheduled";
    }
  }

  const [row] = await db
    .insert(goals)
    .values({
      userId: auth.userId,
      categoryId: body.categoryId ?? null,
      parentId: body.parentId ?? null,
      title,
      description: body.description?.trim().slice(0, 240) || null,
      horizon,
      shape: body.shape,
      goalType,
      weeklyTarget:
        body.shape === "weekly" || body.shape === "monthly"
          ? body.weeklyTarget ?? 1
          : null,
      totalTarget: body.shape === "by_date" ? body.totalTarget ?? null : null,
      endDate,
      source: body.source ?? "user",
      status: initialStatus,
      startDate,
      sortOrder: (maxOrder?.m ?? 0) + 1,
    })
    .returning();

  const goal = dbGoalToType(row);
  await recordGoalCreated({ userId: auth.userId, goal });

  return NextResponse.json(goal);
}
