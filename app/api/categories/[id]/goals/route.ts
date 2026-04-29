import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { goals, categories } from "@/lib/db/schema";
import { and, eq, max } from "drizzle-orm";
import { listGoalsByCategory } from "@/lib/goals/progress";
import type { GoalShape, GoalSource } from "@/types";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id: categoryId } = await context.params;

  const goalsList = await listGoalsByCategory(auth.userId, categoryId);
  return NextResponse.json(goalsList);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id: categoryId } = await context.params;

  const body = (await request.json()) as {
    title: string;
    description?: string | null;
    shape: GoalShape;
    weeklyTarget?: number | null;
    totalTarget?: number | null;
    deadlineDate?: string | null;
    source?: GoalSource;
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!["daily", "weekly", "by_date"].includes(body.shape)) {
    return NextResponse.json({ error: "Invalid goal shape" }, { status: 400 });
  }

  // Verify category belongs to user
  const [cat] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, auth.userId)))
    .limit(1);
  if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const today = new Date();
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [maxOrder] = await db
    .select({ m: max(goals.sortOrder) })
    .from(goals)
    .where(and(eq(goals.userId, auth.userId), eq(goals.categoryId, categoryId)));

  const [row] = await db
    .insert(goals)
    .values({
      userId: auth.userId,
      categoryId,
      title: body.title.trim().slice(0, 80),
      description: body.description?.trim().slice(0, 240) || null,
      shape: body.shape,
      weeklyTarget: body.shape === "weekly" ? body.weeklyTarget ?? 1 : null,
      totalTarget: body.shape === "by_date" ? body.totalTarget ?? null : null,
      deadlineDate: body.shape === "by_date" ? body.deadlineDate ?? null : null,
      source: body.source ?? "user",
      status: "active",
      startedDate: ymd,
      sortOrder: (maxOrder?.m ?? 0) + 1,
    })
    .returning();

  return NextResponse.json({
    id: row.id,
    userId: row.userId,
    categoryId: row.categoryId,
    title: row.title,
    description: row.description,
    shape: row.shape,
    weeklyTarget: row.weeklyTarget,
    totalTarget: row.totalTarget,
    deadlineDate: row.deadlineDate,
    source: row.source,
    status: row.status,
    startedDate: row.startedDate,
    completedDate: row.completedDate,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt?.toISOString(),
    updatedAt: row.updatedAt?.toISOString(),
  });
}
