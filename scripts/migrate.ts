import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const MIGRATIONS_DIR = resolve(process.cwd(), "drizzle/migrations");

/**
 * Apply every SQL file in drizzle/migrations/ in alphabetical order.
 *
 * The migrations are written to be idempotent (DO blocks for type
 * additions, IF NOT EXISTS for tables/indexes/columns) so re-running
 * the full set is safe — it'll skip work that's already been done. This
 * keeps it simple: one command brings any environment up to date,
 * regardless of which migrations it's already seen.
 *
 * If `--only=0007` is passed, only that prefix is applied (handy when
 * a single migration needs a manual re-run).
 */
async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const only = onlyArg?.slice("--only=".length);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .filter((f) => (only ? f.startsWith(only) : true))
    .sort();

  if (files.length === 0) {
    console.error("No migrations found.");
    process.exit(1);
  }

  const sql = postgres(url!, { prepare: false, max: 1 });

  for (const f of files) {
    const path = join(MIGRATIONS_DIR, f);
    const text = readFileSync(path, "utf8");
    process.stdout.write(`→ ${f} ... `);
    try {
      await sql.unsafe(text);
      console.log("ok");
    } catch (err) {
      console.log("FAILED");
      console.error(err);
      await sql.end();
      process.exit(1);
    }
  }

  await sql.end();
  console.log(`\n✓ Applied ${files.length} migration${files.length === 1 ? "" : "s"}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
