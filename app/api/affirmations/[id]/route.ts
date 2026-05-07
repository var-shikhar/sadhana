import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { affirmations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { Affirmation, AffirmationLanguage } from "@/types";

const VALID_LANGUAGES: AffirmationLanguage[] = [
  "en-US",
  "hi-IN",
  "hi-Latn-IN",
];

function dbToType(row: typeof affirmations.$inferSelect): Affirmation {
  return {
    id: row.id,
    userId: row.userId,
    text: row.text,
    language: (row.language as AffirmationLanguage) ?? "en-US",
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const body = (await request.json()) as Partial<{
    text: string;
    language: AffirmationLanguage;
    sortOrder: number;
    isActive: boolean;
  }>;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.text === "string") {
    const trimmed = body.text.trim().slice(0, 280);
    if (!trimmed) {
      return NextResponse.json({ error: "Text cannot be empty" }, { status: 400 });
    }
    updates.text = trimmed;
  }
  if (typeof body.language === "string") {
    if (!VALID_LANGUAGES.includes(body.language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }
    updates.language = body.language;
  }
  if (typeof body.sortOrder === "number") updates.sortOrder = body.sortOrder;
  if (typeof body.isActive === "boolean") updates.isActive = body.isActive;

  if (typeof updates.text === "string") {
    const proposed = normalize(updates.text as string);
    const peers = await db
      .select()
      .from(affirmations)
      .where(eq(affirmations.userId, auth.userId));

    const dup = peers.find(
      (p) => p.id !== id && normalize(p.text) === proposed
    );
    if (dup) {
      return NextResponse.json(
        { error: `"${dup.text}" is already in your library.` },
        { status: 409 }
      );
    }
  }

  const [row] = await db
    .update(affirmations)
    .set(updates)
    .where(and(eq(affirmations.id, id), eq(affirmations.userId, auth.userId)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(dbToType(row));
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const [row] = await db
    .delete(affirmations)
    .where(and(eq(affirmations.id, id), eq(affirmations.userId, auth.userId)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
