import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { habits } from "@/lib/db/schema";
import { eq, or, and } from "drizzle-orm";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const result = await db
    .select()
    .from(habits)
    .where(
      and(
        eq(habits.isActive, true),
        or(eq(habits.isPreset, true), eq(habits.createdBy, auth.userId))
      )
    );

  return NextResponse.json(result);
}
