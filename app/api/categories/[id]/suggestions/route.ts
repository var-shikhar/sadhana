import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { GOAL_SUGGESTIONS } from "@/types";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id: categoryId } = await context.params;

  const [cat] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, auth.userId)))
    .limit(1);

  if (!cat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const key = cat.title.toLowerCase().trim();
  const suggestions = GOAL_SUGGESTIONS[key] ?? [];

  return NextResponse.json(suggestions);
}
