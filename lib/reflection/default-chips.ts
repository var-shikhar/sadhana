import { db } from "@/lib/db";
import { reflectionChips } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ChipCategory } from "@/types";

/**
 * Curated starter library for new users — small enough not to overwhelm,
 * varied enough to bootstrap a meaningful first reflection. Users can
 * remove any of these from settings.
 */
export const DEFAULT_CHIPS: ReadonlyArray<{
  name: string;
  category: ChipCategory;
}> = [
  // Things worth doing
  { name: "deep work", category: "good" },
  { name: "walked outside", category: "good" },
  { name: "read", category: "good" },
  { name: "meditated", category: "good" },
  { name: "slept well", category: "good" },
  // Neutral observations
  { name: "social media", category: "neutral" },
  { name: "errands", category: "neutral" },
  // Things to notice and reduce
  { name: "doom-scrolled", category: "bad" },
  { name: "stayed up late", category: "bad" },
  { name: "skipped exercise", category: "bad" },
];

/**
 * Insert the default chip set for a user. No-op when the user already has
 * any chips (active or paused) — running this twice is safe.
 */
export async function seedDefaultChipsIfEmpty(userId: string): Promise<number> {
  const existing = await db
    .select({ id: reflectionChips.id })
    .from(reflectionChips)
    .where(eq(reflectionChips.userId, userId))
    .limit(1);

  if (existing.length > 0) return 0;

  const rows = DEFAULT_CHIPS.map((chip, i) => ({
    userId,
    name: chip.name,
    category: chip.category,
    sortOrder: i + 1,
    isActive: true,
  }));

  const inserted = await db
    .insert(reflectionChips)
    .values(rows)
    .onConflictDoNothing()
    .returning({ id: reflectionChips.id });

  return inserted.length;
}
