import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { goals, categories } from "@/lib/db/schema";
import { and, eq, isNull, max } from "drizzle-orm";
import {
  dbGoalToType,
  listTopLevelGoals,
  type GoalListFilters,
} from "@/lib/goals/progress";
import { recordGoalCreated } from "@/lib/goals/history";
import {
  isHorizonAllowedUnder,
  type GoalHorizon,
  type GoalShape,
  type GoalSource,
  type GoalStatus,
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
    weeklyTarget?: number | null;
    totalTarget?: number | null;
    deadlineDate?: string | null;
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

  const today = new Date();
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const sortScope = body.parentId
    ? and(eq(goals.userId, auth.userId), eq(goals.parentId, body.parentId))
    : and(eq(goals.userId, auth.userId), isNull(goals.parentId));
  const [maxOrder] = await db
    .select({ m: max(goals.sortOrder) })
    .from(goals)
    .where(sortScope);

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
      weeklyTarget:
        body.shape === "weekly" || body.shape === "monthly"
          ? body.weeklyTarget ?? 1
          : null,
      totalTarget: body.shape === "by_date" ? body.totalTarget ?? null : null,
      deadlineDate: body.shape === "by_date" ? body.deadlineDate ?? null : null,
      source: body.source ?? "user",
      status: "active",
      startedDate: ymd,
      sortOrder: (maxOrder?.m ?? 0) + 1,
    })
    .returning();

  const goal = dbGoalToType(row);
  await recordGoalCreated({ userId: auth.userId, goal });

  return NextResponse.json(goal);
}
