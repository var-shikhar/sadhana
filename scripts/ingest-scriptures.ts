import "dotenv/config";
import dotenv from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, sql as dsql } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { FIXTURE_VERSES, type FixtureVerse } from "../lib/scripture/fixture";
import { embedTexts } from "../lib/scripture/embed";

dotenv.config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const client = postgres(url, { prepare: false });
const db = drizzle(client, { schema });

function vectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

async function ensureIndexes() {
  // Create hnsw index on embedding for fast cosine similarity. Idempotent.
  console.log("Ensuring hnsw index on verse_translations.embedding…");
  await client.unsafe(`
    CREATE INDEX IF NOT EXISTS verse_translations_embedding_hnsw
    ON verse_translations
    USING hnsw (embedding vector_cosine_ops)
  `);
  console.log("✓ hnsw index ready");
}

async function upsertVerses(): Promise<Map<string, string>> { 
  // Returns externalId → uuid map
  const idMap = new Map<string, string>();

  for (const v of FIXTURE_VERSES) {
    const existing = await db
      .select({ id: schema.verses.id })
      .from(schema.verses)
      .where(eq(schema.verses.externalId, v.externalId))
      .limit(1);

    if (existing.length > 0) {
      idMap.set(v.externalId, existing[0].id);
      continue;
    }

    const [row] = await db
      .insert(schema.verses)
      .values({
        externalId: v.externalId,
        book: v.book,
        chapter: v.chapter,
        verse: v.verse,
        subVerse: v.subVerse ?? null,
        ordinalIndex: v.ordinalIndex,
        sanskritDevanagari: v.sanskritDevanagari ?? null,
        sanskritIast: v.sanskritIast ?? null,
      })
      .returning({ id: schema.verses.id });

    idMap.set(v.externalId, row.id);
  }
  console.log(`✓ ${idMap.size} verses upserted`);
  return idMap;
}

async function upsertTranslations(idMap: Map<string, string>) {
  // Collect translations that need embedding
  const pending: Array<{
    verseId: string;
    translator: FixtureVerse["translations"][number]["translator"];
    editionYear: number | null;
    englishText: string;
  }> = [];

  for (const v of FIXTURE_VERSES) {
    const verseId = idMap.get(v.externalId);
    if (!verseId) continue;
    for (const t of v.translations) {
      const existing = await db
        .select({ id: schema.verseTranslations.id })
        .from(schema.verseTranslations)
        .where(
          and(
            eq(schema.verseTranslations.verseId, verseId),
            eq(schema.verseTranslations.translator, t.translator)
          )
        )
        .limit(1);
      if (existing.length > 0) continue;
      pending.push({
        verseId,
        translator: t.translator,
        editionYear: t.editionYear ?? null,
        englishText: t.englishText,
      });
    }
  }

  if (pending.length === 0) {
    console.log("✓ no new translations to embed");
    return;
  }

  console.log(`Embedding ${pending.length} translations via OpenAI…`);
  const embeddings = await embedTexts(pending.map((p) => p.englishText));
  console.log(`✓ embeddings received`);

  for (let i = 0; i < pending.length; i++) {
    const p = pending[i];
    const emb = embeddings[i];
    await client.unsafe(
      `
      INSERT INTO verse_translations (verse_id, translator, edition_year, english_text, embedding)
      VALUES ($1, $2, $3, $4, $5::vector)
    `,
      [p.verseId, p.translator, p.editionYear, p.englishText, vectorLiteral(emb)]
    );
  }
  console.log(`✓ ${pending.length} translations inserted with embeddings`);
}

async function upsertTags(idMap: Map<string, string>) {
  let count = 0;
  for (const v of FIXTURE_VERSES) {
    const verseId = idMap.get(v.externalId);
    if (!verseId) continue;
    for (const tag of v.tags) {
      try {
        await db
          .insert(schema.verseTags)
          .values({ verseId, tag })
          .onConflictDoNothing();
        count++;
      } catch {
        // ignore — uniqueness violations are expected on re-run
      }
    }
  }
  console.log(`✓ ${count} tag rows upserted`);
}

async function buildSequentialEdges(idMap: Map<string, string>) {
  // Sort by ordinalIndex and create sequential edges within the same book.
  const sorted = [...FIXTURE_VERSES].sort(
    (a, b) => a.ordinalIndex - b.ordinalIndex
  );
  let count = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (a.book !== b.book) continue; // sequential only within same book
    const fromId = idMap.get(a.externalId);
    const toId = idMap.get(b.externalId);
    if (!fromId || !toId) continue;
    try {
      await db
        .insert(schema.verseRelationships)
        .values({
          fromVerseId: fromId,
          toVerseId: toId,
          relType: "sequential",
        })
        .onConflictDoNothing();
      // reverse edge
      await db
        .insert(schema.verseRelationships)
        .values({
          fromVerseId: toId,
          toVerseId: fromId,
          relType: "sequential",
        })
        .onConflictDoNothing();
      count += 2;
    } catch {
      // ignore
    }
  }
  console.log(`✓ ${count} sequential edges upserted`);
}

async function buildCrossReferences(idMap: Map<string, string>) {
  let count = 0;
  for (const v of FIXTURE_VERSES) {
    if (!v.crossReferences) continue;
    const fromId = idMap.get(v.externalId);
    if (!fromId) continue;
    for (const xref of v.crossReferences) {
      const toId = idMap.get(xref.to);
      if (!toId) continue;
      try {
        await db
          .insert(schema.verseRelationships)
          .values({
            fromVerseId: fromId,
            toVerseId: toId,
            relType: "cross_reference",
            notes: xref.notes ?? null,
          })
          .onConflictDoNothing();
        count++;
      } catch {
        // ignore
      }
    }
  }
  console.log(`✓ ${count} cross-reference edges upserted`);
}

async function reportStats() {
  const [{ vc }] = await client.unsafe(
    `SELECT count(*)::int AS vc FROM verses`
  );
  const [{ tc }] = await client.unsafe(
    `SELECT count(*)::int AS tc FROM verse_translations`
  );
  const [{ rc }] = await client.unsafe(
    `SELECT count(*)::int AS rc FROM verse_relationships`
  );
  const [{ tg }] = await client.unsafe(
    `SELECT count(*)::int AS tg FROM verse_tags`
  );
  console.log("");
  console.log("─".repeat(40));
  console.log(`verses:                ${vc}`);
  console.log(`verse_translations:    ${tc}`);
  console.log(`verse_relationships:   ${rc}`);
  console.log(`verse_tags:            ${tg}`);
  console.log("─".repeat(40));
}

async function main() {
  console.log(`Ingesting ${FIXTURE_VERSES.length} fixture verses…\n`);
  await ensureIndexes();
  const idMap = await upsertVerses();
  await upsertTranslations(idMap);
  await upsertTags(idMap);
  await buildSequentialEdges(idMap);
  await buildCrossReferences(idMap);
  await reportStats();
  await client.end();
  console.log("\n✓ Ingestion complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
