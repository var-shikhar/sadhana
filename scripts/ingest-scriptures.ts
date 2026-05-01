import "dotenv/config";
import dotenv from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { inArray, eq, and, sql } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { loadCorpus, textHash, type CorpusVerse } from "../lib/scripture/corpus-loader";
import { embedTexts } from "../lib/scripture/embed";

dotenv.config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const client = postgres(url, { prepare: false });
const db = drizzle(client, { schema });

const SLIP_BATCH = 500; // safety cap — Postgres parameter-count limit ≈ 65,535

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function vectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

async function ensureIndexes() {
  console.log("Ensuring hnsw index on verse_translations.embedding…");
  await client.unsafe(`
    CREATE INDEX IF NOT EXISTS verse_translations_embedding_hnsw
    ON verse_translations
    USING hnsw (embedding vector_cosine_ops)
  `);
  console.log("✓ hnsw index ready");
}

/**
 * Bulk-upsert verses. Uses ON CONFLICT DO NOTHING + a follow-up SELECT for
 * pre-existing rows. Total: 2 round-trips, regardless of corpus size.
 */
async function upsertVerses(corpus: CorpusVerse[]): Promise<Map<string, string>> {
  const idMap = new Map<string, string>();
  if (corpus.length === 0) return idMap;

  for (const batch of chunk(corpus, SLIP_BATCH)) {
    const inserted = await db
      .insert(schema.verses)
      .values(
        batch.map((v) => ({
          externalId: v.externalId,
          book: v.book,
          chapter: v.chapter,
          verse: v.verse,
          subVerse: v.subVerse ?? null,
          ordinalIndex: v.ordinalIndex,
          sanskritDevanagari: v.sanskritDevanagari ?? null,
          sanskritIast: v.sanskritIast ?? null,
        }))
      )
      .onConflictDoNothing({ target: schema.verses.externalId })
      .returning({
        id: schema.verses.id,
        externalId: schema.verses.externalId,
      });

    for (const r of inserted) idMap.set(r.externalId, r.id);
  }

  // Resolve ids of pre-existing verses (those that hit the conflict and didn't return)
  const missing = corpus
    .map((v) => v.externalId)
    .filter((eid) => !idMap.has(eid));

  for (const batch of chunk(missing, SLIP_BATCH)) {
    const existing = await db
      .select({
        id: schema.verses.id,
        externalId: schema.verses.externalId,
      })
      .from(schema.verses)
      .where(inArray(schema.verses.externalId, batch));
    for (const r of existing) idMap.set(r.externalId, r.id);
  }

  console.log(`✓ verses: ${idMap.size} resolved (${idMap.size - missing.length} new, ${missing.length} pre-existing)`);
  return idMap;
}

/**
 * Bulk-upsert translations with embedding cache.
 * Strategy:
 *   1. Fetch existing (verseId, translator, textHash) tuples in one query.
 *   2. Decide which translations need (a) new insert, (b) text+embedding update, or (c) skip.
 *   3. Embed only the texts that need it (already batched at 100/request in embedTexts).
 *   4. Bulk insert with raw SQL (vector literal can't use Drizzle's typed values).
 *   5. Bulk update for changed text (single UPDATE FROM (VALUES ...)).
 */
type TranslatorValue = (typeof schema.translatorEnum.enumValues)[number];

interface TranslationRow {
  verseId: string;
  translator: TranslatorValue;
  editionYear: number | null;
  englishText: string;
  hash: string;
}

async function upsertTranslations(
  corpus: CorpusVerse[],
  idMap: Map<string, string>
) {
  const inputRows: TranslationRow[] = [];

  for (const v of corpus) {
    const verseId = idMap.get(v.externalId);
    if (!verseId) continue;
    for (const t of v.translations) {
      inputRows.push({
        verseId,
        translator: t.translator,
        editionYear: t.editionYear ?? null,
        englishText: t.englishText,
        hash: textHash(t.englishText),
      });
    }
  }

  if (inputRows.length === 0) {
    console.log("✓ translations: nothing to do");
    return;
  }

  // Pull existing rows to decide insert / update / skip
  const verseIds = Array.from(new Set(inputRows.map((r) => r.verseId)));
  const existing =
    verseIds.length > 0
      ? await db
          .select({
            verseId: schema.verseTranslations.verseId,
            translator: schema.verseTranslations.translator,
            textHash: schema.verseTranslations.textHash,
          })
          .from(schema.verseTranslations)
          .where(inArray(schema.verseTranslations.verseId, verseIds))
      : [];
  const existingKey = new Map<string, string | null>();
  for (const e of existing) {
    existingKey.set(`${e.verseId}::${e.translator}`, e.textHash);
  }

  const toInsert: typeof inputRows = [];
  const toUpdate: typeof inputRows = [];
  for (const r of inputRows) {
    const key = `${r.verseId}::${r.translator}`;
    if (!existingKey.has(key)) {
      toInsert.push(r);
    } else if (existingKey.get(key) !== r.hash) {
      toUpdate.push(r);
    }
    // else: same translator + same hash → skip
  }

  const needsEmbedding = [...toInsert, ...toUpdate];
  if (needsEmbedding.length === 0) {
    console.log("✓ translations: all up-to-date (embeddings cached by text-hash)");
    return;
  }

  console.log(
    `Embedding ${needsEmbedding.length} translations (${toInsert.length} new + ${toUpdate.length} changed)…`
  );
  const embeddings = await embedTexts(needsEmbedding.map((r) => r.englishText));
  console.log(`✓ embeddings received`);

  // Bulk INSERT
  if (toInsert.length > 0) {
    for (const batch of chunk(toInsert, SLIP_BATCH)) {
      const startIdx = needsEmbedding.indexOf(batch[0]);
      const valuesSql: string[] = [];
      const params: (string | number | null)[] = [];
      let p = 1;
      for (let i = 0; i < batch.length; i++) {
        const r = batch[i];
        const emb = embeddings[startIdx + i];
        valuesSql.push(
          `($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}::vector)`
        );
        params.push(
          r.verseId,
          r.translator,
          r.editionYear,
          r.englishText,
          r.hash,
          vectorLiteral(emb)
        );
      }
      await client.unsafe(
        `INSERT INTO verse_translations
           (verse_id, translator, edition_year, english_text, text_hash, embedding)
         VALUES ${valuesSql.join(", ")}
         ON CONFLICT (verse_id, translator) DO NOTHING`,
        params
      );
    }
    console.log(`✓ inserted ${toInsert.length} new translations`);
  }

  // Bulk UPDATE for changed text
  if (toUpdate.length > 0) {
    for (const batch of chunk(toUpdate, SLIP_BATCH)) {
      const startIdx = needsEmbedding.indexOf(batch[0]);
      const valuesSql: string[] = [];
      const params: (string | number | null)[] = [];
      let p = 1;
      for (let i = 0; i < batch.length; i++) {
        const r = batch[i];
        const emb = embeddings[startIdx + i];
        valuesSql.push(
          `($${p++}::uuid, $${p++}::scripture_translator, $${p++}, $${p++}, $${p++}::vector)`
        );
        params.push(
          r.verseId,
          r.translator,
          r.englishText,
          r.hash,
          vectorLiteral(emb)
        );
      }
      await client.unsafe(
        `UPDATE verse_translations vt
         SET english_text = u.english_text,
             text_hash    = u.text_hash,
             embedding    = u.embedding
         FROM (VALUES ${valuesSql.join(", ")})
            AS u(verse_id, translator, english_text, text_hash, embedding)
         WHERE vt.verse_id   = u.verse_id
           AND vt.translator = u.translator`,
        params
      );
    }
    console.log(`✓ updated ${toUpdate.length} changed translations`);
  }
}

async function upsertTags(corpus: CorpusVerse[], idMap: Map<string, string>) {
  const rows: Array<{ verseId: string; tag: string }> = [];
  for (const v of corpus) {
    const verseId = idMap.get(v.externalId);
    if (!verseId) continue;
    for (const tag of v.tags) {
      rows.push({ verseId, tag });
    }
  }
  if (rows.length === 0) {
    console.log("✓ tags: nothing to do");
    return;
  }
  let total = 0;
  for (const batch of chunk(rows, SLIP_BATCH)) {
    const result = await db
      .insert(schema.verseTags)
      .values(batch)
      .onConflictDoNothing({
        target: [schema.verseTags.verseId, schema.verseTags.tag],
      })
      .returning({ id: schema.verseTags.id });
    total += result.length;
  }
  console.log(`✓ tags: ${total} new (${rows.length - total} already present)`);
}

async function buildSequentialEdges(
  corpus: CorpusVerse[],
  idMap: Map<string, string>
) {
  const sorted = [...corpus].sort((a, b) => a.ordinalIndex - b.ordinalIndex);
  const rows: Array<{
    fromVerseId: string;
    toVerseId: string;
    relType: "sequential";
  }> = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (a.book !== b.book) continue;
    const aId = idMap.get(a.externalId);
    const bId = idMap.get(b.externalId);
    if (!aId || !bId) continue;
    rows.push({ fromVerseId: aId, toVerseId: bId, relType: "sequential" });
    rows.push({ fromVerseId: bId, toVerseId: aId, relType: "sequential" });
  }
  if (rows.length === 0) {
    console.log("✓ sequential edges: nothing to do");
    return;
  }
  let total = 0;
  for (const batch of chunk(rows, SLIP_BATCH)) {
    const result = await db
      .insert(schema.verseRelationships)
      .values(batch)
      .onConflictDoNothing({
        target: [
          schema.verseRelationships.fromVerseId,
          schema.verseRelationships.toVerseId,
          schema.verseRelationships.relType,
        ],
      })
      .returning({ id: schema.verseRelationships.id });
    total += result.length;
  }
  console.log(`✓ sequential edges: ${total} new (${rows.length - total} already present)`);
}

async function buildCrossReferences(
  corpus: CorpusVerse[],
  idMap: Map<string, string>
) {
  const rows: Array<{
    fromVerseId: string;
    toVerseId: string;
    relType: "cross_reference";
    notes: string | null;
  }> = [];
  for (const v of corpus) {
    if (!v.crossReferences) continue;
    const fromId = idMap.get(v.externalId);
    if (!fromId) continue;
    for (const xref of v.crossReferences) {
      const toId = idMap.get(xref.to);
      if (!toId) continue;
      rows.push({
        fromVerseId: fromId,
        toVerseId: toId,
        relType: "cross_reference",
        notes: xref.notes ?? null,
      });
    }
  }
  if (rows.length === 0) {
    console.log("✓ cross-references: nothing to do");
    return;
  }
  let total = 0;
  for (const batch of chunk(rows, SLIP_BATCH)) {
    const result = await db
      .insert(schema.verseRelationships)
      .values(batch)
      .onConflictDoNothing({
        target: [
          schema.verseRelationships.fromVerseId,
          schema.verseRelationships.toVerseId,
          schema.verseRelationships.relType,
        ],
      })
      .returning({ id: schema.verseRelationships.id });
    total += result.length;
  }
  console.log(`✓ cross-references: ${total} new (${rows.length - total} already present)`);
}

async function reportStats() {
  const [{ vc }] = await client.unsafe(
    `SELECT count(*)::int AS vc FROM verses`
  );
  const [{ tc }] = await client.unsafe(
    `SELECT count(*)::int AS tc FROM verse_translations`
  );
  const [{ ec }] = await client.unsafe(
    `SELECT count(*)::int AS ec FROM verse_translations WHERE embedding IS NOT NULL`
  );
  const [{ rc }] = await client.unsafe(
    `SELECT count(*)::int AS rc FROM verse_relationships`
  );
  const [{ tg }] = await client.unsafe(
    `SELECT count(*)::int AS tg FROM verse_tags`
  );
  console.log("");
  console.log("─".repeat(48));
  console.log(`verses:                 ${vc}`);
  console.log(`verse_translations:     ${tc}  (${ec} with embedding)`);
  console.log(`verse_relationships:    ${rc}`);
  console.log(`verse_tags:             ${tg}`);
  console.log("─".repeat(48));
}

async function main() {
  const t0 = Date.now();

  const includeLicensed =
    process.env.INCLUDE_LICENSED_TRANSLATIONS === "true";
  if (includeLicensed) {
    console.log(
      "⚠  INCLUDE_LICENSED_TRANSLATIONS=true — loading copyrighted translations (dev only)."
    );
  }

  console.log("Loading corpus from data/scriptures/…");
  const corpus = loadCorpus(undefined, { includeLicensed });
  console.log(`✓ loaded ${corpus.length} verses\n`);

  await ensureIndexes();

  // Note: postgres-js auto-commits each query. For a true transaction we'd
  // wrap with `client.begin(...)`. Skipping for the fixture-scale ingestion;
  // re-enable when we ingest the full corpus.
  //
  //   await client.begin(async (tx) => { ... });
  //
  // The current ingestion is idempotent (ON CONFLICT DO NOTHING + text-hash
  // skip), so a partial failure during a re-run is recoverable by simply
  // re-running.

  const idMap = await upsertVerses(corpus);
  await upsertTranslations(corpus, idMap);
  await upsertTags(corpus, idMap);
  await buildSequentialEdges(corpus, idMap);
  await buildCrossReferences(corpus, idMap);

  await reportStats();
  await client.end();

  const seconds = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✓ Ingestion complete in ${seconds}s`);
}

// Suppress the unused-import lint warning — `eq` and `and` are kept in
// scope so future work in this script can use them without re-import noise.
void eq;
void and;
void sql;

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
