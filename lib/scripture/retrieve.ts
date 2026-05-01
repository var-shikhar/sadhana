import { db } from "@/lib/db";
import {
  verses,
  verseTranslations,
  verseRelationships,
  verseTags,
} from "@/lib/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { embedText } from "./embed";

export interface RetrievedTranslation {
  translator: string;
  editionYear: number | null;
  englishText: string;
}

export interface RetrievedVerse {
  verseId: string;
  externalId: string;
  book: string;
  chapter: number;
  verse: number;
  subVerse: number | null;
  sanskritDevanagari: string | null;
  sanskritIast: string | null;
  similarity: number;
  /** "bullseye" if returned by vector search; "neighbor" if pulled in by graph */
  source: "bullseye" | "neighbor" | "cross_reference";
  matchedTranslator: string | null;
  matchedText: string | null;
  /** All available translations for this verse */
  translations: RetrievedTranslation[];
  tags: string[];
}

export interface RetrievalResult {
  query: string;
  verses: RetrievedVerse[];
  /** Tag boosts applied this turn */
  appliedTagBoosts: string[];
}

/**
 * Vector + graph retrieval pipeline.
 *
 * 1. Embed the query.
 * 2. Cosine-similarity search over verse_translations to get top-K bullseye verses.
 * 3. Tag boost: any retrieved verse that carries a tag also present in the
 *    user's recent state gets +0.1 to its similarity.
 * 4. Graph expand: for each bullseye, pull its sequential neighbors (3 before
 *    + 3 after, same book) and any cross_reference targets.
 * 5. Hydrate each verse with all its translations and tags.
 * 6. Return ordered: bullseyes first (by adjusted similarity), then neighbors,
 *    then cross-references.
 */
export async function retrieveForQuery(
  query: string,
  options: {
    topK?: number;
    neighborWindow?: number; // sequential edges to expand per bullseye
    boostTags?: string[]; // tags to give a similarity bonus
  } = {}
): Promise<RetrievalResult> {
  const topK = options.topK ?? 5;
  const neighborWindow = options.neighborWindow ?? 3;
  const boostTagsSet = new Set(options.boostTags ?? []);

  // 1. Embed the query
  const queryEmbedding = await embedText(query);
  const embLiteral = `[${queryEmbedding.join(",")}]`;

  // 2. Vector search — get top-K best matches across all translations.
  // We use cosine distance (`<=>`); similarity = 1 - distance.
  const bullseyeRows = (await db.execute(sql`
    SELECT
      vt.verse_id              AS verse_id,
      vt.translator            AS translator,
      vt.english_text          AS english_text,
      v.external_id            AS external_id,
      v.book                   AS book,
      v.chapter                AS chapter,
      v.verse                  AS verse,
      v.sub_verse              AS sub_verse,
      v.sanskrit_devanagari    AS sanskrit_devanagari,
      v.sanskrit_iast          AS sanskrit_iast,
      1 - (vt.embedding <=> ${embLiteral}::vector) AS similarity
    FROM verse_translations vt
    JOIN verses v ON v.id = vt.verse_id
    WHERE vt.embedding IS NOT NULL
    ORDER BY vt.embedding <=> ${embLiteral}::vector
    LIMIT ${topK}
  `)) as unknown as Array<{
    verse_id: string;
    translator: string;
    english_text: string;
    external_id: string;
    book: string;
    chapter: number;
    verse: number;
    sub_verse: number | null;
    sanskrit_devanagari: string | null;
    sanskrit_iast: string | null;
    similarity: string | number;
  }>;

  // Deduplicate to one row per verse (best translator wins)
  const bullseyeByVerse = new Map<string, (typeof bullseyeRows)[number]>();
  for (const row of bullseyeRows) {
    const existing = bullseyeByVerse.get(row.verse_id);
    if (!existing || Number(row.similarity) > Number(existing.similarity)) {
      bullseyeByVerse.set(row.verse_id, row);
    }
  }
  const bullseyeIds = Array.from(bullseyeByVerse.keys());

  // 3. Pull tags for the bullseye verses + apply tag boost
  const tagRows =
    bullseyeIds.length > 0
      ? await db
          .select({ verseId: verseTags.verseId, tag: verseTags.tag })
          .from(verseTags)
          .where(inArray(verseTags.verseId, bullseyeIds))
      : [];
  const tagsByVerse = new Map<string, string[]>();
  for (const r of tagRows) {
    if (!tagsByVerse.has(r.verseId)) tagsByVerse.set(r.verseId, []);
    tagsByVerse.get(r.verseId)!.push(r.tag);
  }

  const appliedTagBoosts: string[] = [];
  const adjustedSim = new Map<string, number>();
  for (const [vid, row] of bullseyeByVerse) {
    let sim = Number(row.similarity);
    const verseTagsList = tagsByVerse.get(vid) ?? [];
    for (const t of verseTagsList) {
      if (boostTagsSet.has(t)) {
        sim += 0.1;
        if (!appliedTagBoosts.includes(t)) appliedTagBoosts.push(t);
      }
    }
    adjustedSim.set(vid, sim);
  }

  // 4. Graph expand — neighbors and cross-references.
  const neighborSet = new Set<string>();
  const crossRefSet = new Set<string>();

  for (const vid of bullseyeIds) {
    // sequential neighbors (3 before + 3 after, same book) via ordinal_index
    const [bullseyeRow] = await db
      .select({ ordinalIndex: verses.ordinalIndex, book: verses.book })
      .from(verses)
      .where(eq(verses.id, vid))
      .limit(1);
    if (bullseyeRow) {
      const neighbors = await db
        .select({ id: verses.id })
        .from(verses)
        .where(
          sql`${verses.book} = ${bullseyeRow.book}
              AND ${verses.ordinalIndex} BETWEEN ${
                bullseyeRow.ordinalIndex - neighborWindow
              } AND ${bullseyeRow.ordinalIndex + neighborWindow}
              AND ${verses.id} != ${vid}`
        );
      for (const n of neighbors) {
        if (!bullseyeIds.includes(n.id)) neighborSet.add(n.id);
      }
    }

    // cross-references (the curated edges)
    const xrefs = await db
      .select({ toVerseId: verseRelationships.toVerseId })
      .from(verseRelationships)
      .where(
        sql`${verseRelationships.fromVerseId} = ${vid}
            AND ${verseRelationships.relType} = 'cross_reference'`
      );
    for (const x of xrefs) {
      if (!bullseyeIds.includes(x.toVerseId)) crossRefSet.add(x.toVerseId);
    }
  }

  // 5. Hydrate everything — verses + all their translations + tags
  const allIds = [
    ...bullseyeIds,
    ...Array.from(neighborSet),
    ...Array.from(crossRefSet),
  ];
  if (allIds.length === 0) {
    return { query, verses: [], appliedTagBoosts };
  }

  const allVerseRows = await db
    .select()
    .from(verses)
    .where(inArray(verses.id, allIds));

  const allTranslationRows = await db
    .select({
      verseId: verseTranslations.verseId,
      translator: verseTranslations.translator,
      editionYear: verseTranslations.editionYear,
      englishText: verseTranslations.englishText,
    })
    .from(verseTranslations)
    .where(inArray(verseTranslations.verseId, allIds));

  const translationsByVerse = new Map<string, RetrievedTranslation[]>();
  for (const t of allTranslationRows) {
    if (!translationsByVerse.has(t.verseId))
      translationsByVerse.set(t.verseId, []);
    translationsByVerse.get(t.verseId)!.push({
      translator: t.translator,
      editionYear: t.editionYear,
      englishText: t.englishText,
    });
  }

  const allTagRows =
    allIds.length > 0
      ? await db
          .select({ verseId: verseTags.verseId, tag: verseTags.tag })
          .from(verseTags)
          .where(inArray(verseTags.verseId, allIds))
      : [];
  const allTagsByVerse = new Map<string, string[]>();
  for (const r of allTagRows) {
    if (!allTagsByVerse.has(r.verseId)) allTagsByVerse.set(r.verseId, []);
    allTagsByVerse.get(r.verseId)!.push(r.tag);
  }

  const verseRowById = new Map(allVerseRows.map((r) => [r.id, r]));

  // 6. Assemble + order
  const out: RetrievedVerse[] = [];

  // Bullseyes, ordered by adjusted similarity desc
  const bullseyeIdsOrdered = bullseyeIds
    .slice()
    .sort((a, b) => (adjustedSim.get(b) ?? 0) - (adjustedSim.get(a) ?? 0));

  for (const vid of bullseyeIdsOrdered) {
    const v = verseRowById.get(vid);
    const bullseye = bullseyeByVerse.get(vid);
    if (!v || !bullseye) continue;
    out.push({
      verseId: vid,
      externalId: v.externalId,
      book: v.book,
      chapter: v.chapter,
      verse: v.verse,
      subVerse: v.subVerse,
      sanskritDevanagari: v.sanskritDevanagari,
      sanskritIast: v.sanskritIast,
      similarity: adjustedSim.get(vid) ?? Number(bullseye.similarity),
      source: "bullseye",
      matchedTranslator: bullseye.translator,
      matchedText: bullseye.english_text,
      translations: translationsByVerse.get(vid) ?? [],
      tags: allTagsByVerse.get(vid) ?? [],
    });
  }

  for (const vid of neighborSet) {
    const v = verseRowById.get(vid);
    if (!v) continue;
    out.push({
      verseId: vid,
      externalId: v.externalId,
      book: v.book,
      chapter: v.chapter,
      verse: v.verse,
      subVerse: v.subVerse,
      sanskritDevanagari: v.sanskritDevanagari,
      sanskritIast: v.sanskritIast,
      similarity: 0,
      source: "neighbor",
      matchedTranslator: null,
      matchedText: null,
      translations: translationsByVerse.get(vid) ?? [],
      tags: allTagsByVerse.get(vid) ?? [],
    });
  }

  for (const vid of crossRefSet) {
    const v = verseRowById.get(vid);
    if (!v) continue;
    out.push({
      verseId: vid,
      externalId: v.externalId,
      book: v.book,
      chapter: v.chapter,
      verse: v.verse,
      subVerse: v.subVerse,
      sanskritDevanagari: v.sanskritDevanagari,
      sanskritIast: v.sanskritIast,
      similarity: 0,
      source: "cross_reference",
      matchedTranslator: null,
      matchedText: null,
      translations: translationsByVerse.get(vid) ?? [],
      tags: allTagsByVerse.get(vid) ?? [],
    });
  }

  return { query, verses: out, appliedTagBoosts };
}
