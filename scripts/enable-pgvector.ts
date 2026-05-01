import "dotenv/config";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false });

async function main() {
  console.log("Enabling pgvector extension on Neon...");
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  console.log("✓ pgvector extension enabled (or was already)");

  const [row] = await sql`
    SELECT extversion FROM pg_extension WHERE extname = 'vector'
  `;
  console.log(`pgvector version: ${row?.extversion ?? "(not found)"}`);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
