import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { goals, tasks } from "@/lib/db/schema";
import { and, asc, desc, eq, max } from "drizzle-orm";
import type { Task, TaskStatus } from "@/types";

function dbToType(row: typeof tasks.$inferSelect): Task {
  return {
    id: row.id,
    userId: row.userId,
    goalId: row.goalId,
    title: row.title,
    description: row.description,
    important: row.important,
    urgent: row.urgent,
    status: row.status,
    completionNote: row.completionNote,
    completedAt: row.completedAt?.toISOString() ?? null,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

/** GET /api/goals/[id]/tasks — list tasks for this goal/sub-goal. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id: goalId } = await context.params;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status") as TaskStatus | null;

  const conds = [eq(tasks.userId, auth.userId), eq(tasks.goalId, goalId)];
  if (statusParam === "open" || statusParam === "done") {
    conds.push(eq(tasks.status, statusParam));
  }

  // Order: open tasks first, then important DESC, urgent DESC, sortOrder ASC,
  // recency last as a tiebreaker. Done tasks fall to the bottom.
  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conds))
    .orderBy(
      asc(tasks.status),
      desc(tasks.important),
      desc(tasks.urgent),
      asc(tasks.sortOrder),
      desc(tasks.createdAt),
    );

  return NextResponse.json(rows.map(dbToType));
}

/** POST /api/goals/[id]/tasks — create a task under this goal/sub-goal. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id: goalId } = await context.params;

  // Verify the goal/sub-goal exists and belongs to the caller.
  const [parent] = await db
    .select({ id: goals.id })
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, auth.userId)))
    .limit(1);
  if (!parent) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    title: string;
    description?: string | null;
    important?: boolean;
    urgent?: boolean;
  };

  const title = body.title?.trim().slice(0, 120);
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const [maxOrder] = await db
    .select({ m: max(tasks.sortOrder) })
    .from(tasks)
    .where(and(eq(tasks.userId, auth.userId), eq(tasks.goalId, goalId)));

  const [row] = await db
    .insert(tasks)
    .values({
      userId: auth.userId,
      goalId,
      title,
      description: body.description?.trim().slice(0, 600) || null,
      important: body.important ?? false,
      urgent: body.urgent ?? false,
      status: "open",
      sortOrder: (maxOrder?.m ?? 0) + 1,
    })
    .returning();

  return NextResponse.json(dbToType(row));
}
