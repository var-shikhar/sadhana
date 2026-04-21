import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { habits } from "@/lib/db/schema";
import { eq, or, and } from "drizzle-orm";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db
    .select()
    .from(habits)
    .where(
      and(
        eq(habits.isActive, true),
        or(eq(habits.isPreset, true), eq(habits.createdBy, user.id))
      )
    );

  return NextResponse.json(result);
}
