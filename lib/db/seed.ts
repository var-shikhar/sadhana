import { db } from "./index";
import { habits } from "./schema";
import { PRESET_HABITS, AVOID_HABITS } from "@/types";

async function seed() {
  console.log("Seeding preset habits...");

  for (const habit of PRESET_HABITS) {
    await db
      .insert(habits)
      .values({
        name: habit.name,
        category: habit.category,
        permaPillar: habit.permaPillar,
        icon: habit.icon,
        isAvoid: false,
        isPreset: true,
        createdBy: null,
      })
      .onConflictDoNothing();
  }

  for (const habit of AVOID_HABITS) {
    await db
      .insert(habits)
      .values({
        name: habit.name,
        category: "Avoid",
        permaPillar: null,
        icon: habit.icon,
        isAvoid: true,
        isPreset: true,
        createdBy: null,
      })
      .onConflictDoNothing();
  }

  console.log(`Seeded ${PRESET_HABITS.length} PERMA habits and ${AVOID_HABITS.length} avoid habits.`);
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
