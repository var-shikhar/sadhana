import fs from "fs";
import path from "path";
import type {
  scriptureBookEnum,
  translatorEnum,
} from "@/lib/db/schema";

type ScriptureBook = (typeof scriptureBookEnum.enumValues)[number];
type Translator = (typeof translatorEnum.enumValues)[number];

export interface CorpusVerse {
  externalId: string;
  book: ScriptureBook;
  chapter: number;
  verse: number;
  subVerse?: number;
  ordinalIndex: number;
  sanskritDevanagari?: string;
  sanskritIast?: string;
  translations: Array<{
    translator: Translator;
    editionYear?: number;
    englishText: string;
  }>;
  tags: string[];
  crossReferences?: Array<{ to: string; notes?: string }>;
}

interface CorpusFile {
  $schema?: string;
  title?: string;
  notes?: string;
  /** When set, every verse with no `book` of its own inherits this book. */
  book?: ScriptureBook;
  verses: CorpusVerse[];
}

interface LoadCorpusOptions {
  /** When true, also load files under `_licensed/` (BBT, Easwaran, Iyengar,
   *  etc. — copyrighted translations kept out of git via .gitignore). Set
   *  via `INCLUDE_LICENSED_TRANSLATIONS=true` in `.env.local`. */
  includeLicensed?: boolean;
}

/**
 * Load every JSON corpus file in `data/scriptures/` (recursively) and
 * merge their verses into a single deduplicated array.
 *
 * Verses are de-duplicated by `externalId` — later files cannot override
 * earlier ones; we throw if a duplicate is detected so collisions surface.
 *
 * **Licensed translations** (`_licensed/` subdirectory) are skipped unless
 * `includeLicensed: true` is passed. This keeps copyrighted text isolated
 * for dev use only — production deploys must run with the flag off until
 * proper licensing is in place.
 */
export function loadCorpus(
  rootDir = "data/scriptures",
  options: LoadCorpusOptions = {}
): CorpusVerse[] {
  const absRoot = path.resolve(rootDir);
  if (!fs.existsSync(absRoot)) {
    throw new Error(`Corpus directory not found: ${absRoot}`);
  }

  const allFiles = walkJsonFiles(absRoot);
  const files = options.includeLicensed
    ? allFiles
    : allFiles.filter((f) => !f.includes(path.sep + "_licensed" + path.sep));

  const skipped = allFiles.length - files.length;
  if (skipped > 0 && !options.includeLicensed) {
    console.log(
      `(skipping ${skipped} licensed corpus file${skipped === 1 ? "" : "s"} — set INCLUDE_LICENSED_TRANSLATIONS=true to include)`
    );
  }

  // externalId → merged verse. Multiple files (e.g. _starter.json defining
  // BG_2.47 with Besant + Arnold, then _licensed/…json adding Prabhupada)
  // accumulate translations + tags + xrefs onto the same verse.
  const byId = new Map<string, CorpusVerse>();
  const sourceFiles = new Map<string, string>(); // externalId → first-defining file

  for (const file of files) {
    const raw = fs.readFileSync(file, "utf-8");
    let parsed: CorpusFile;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new Error(
        `Invalid JSON in ${file}: ${e instanceof Error ? e.message : "parse error"}`
      );
    }
    if (!Array.isArray(parsed.verses)) {
      throw new Error(`${file}: missing 'verses' array`);
    }
    for (const v of parsed.verses) {
      if (!v.externalId || !v.book || typeof v.ordinalIndex !== "number") {
        throw new Error(
          `${file}: verse missing externalId/book/ordinalIndex: ${JSON.stringify(
            v
          ).slice(0, 80)}…`
        );
      }

      const existing = byId.get(v.externalId);
      if (!existing) {
        // First time we've seen this verse — clone arrays so future merges
        // don't mutate the source object.
        byId.set(v.externalId, {
          ...v,
          translations: [...(v.translations ?? [])],
          tags: [...(v.tags ?? [])],
          crossReferences: v.crossReferences ? [...v.crossReferences] : undefined,
        });
        sourceFiles.set(v.externalId, file);
        continue;
      }

      // Structural fields must match exactly across files
      if (
        existing.book !== v.book ||
        existing.chapter !== v.chapter ||
        existing.verse !== v.verse ||
        existing.ordinalIndex !== v.ordinalIndex
      ) {
        throw new Error(
          `Verse "${v.externalId}" has conflicting structure between ` +
            `${sourceFiles.get(v.externalId)} and ${file} ` +
            `(check chapter/verse/book/ordinalIndex)`
        );
      }

      // Merge: accumulate translations (deduped by translator), tags, xrefs
      const existingTranslators = new Set(existing.translations.map((t) => t.translator));
      for (const t of v.translations ?? []) {
        if (!existingTranslators.has(t.translator)) {
          existing.translations.push(t);
          existingTranslators.add(t.translator);
        }
      }
      const existingTagSet = new Set(existing.tags);
      for (const tag of v.tags ?? []) {
        if (!existingTagSet.has(tag)) {
          existing.tags.push(tag);
          existingTagSet.add(tag);
        }
      }
      if (v.crossReferences && v.crossReferences.length > 0) {
        existing.crossReferences = [
          ...(existing.crossReferences ?? []),
          ...v.crossReferences,
        ];
      }
      if (!existing.sanskritDevanagari && v.sanskritDevanagari) {
        existing.sanskritDevanagari = v.sanskritDevanagari;
      }
      if (!existing.sanskritIast && v.sanskritIast) {
        existing.sanskritIast = v.sanskritIast;
      }
    }
  }

  return Array.from(byId.values());
}

function walkJsonFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkJsonFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      out.push(full);
    }
  }
  return out;
}

/** Deterministic 16-char hex hash of a string — used for embedding cache. */
export function textHash(text: string): string {
  // Two-pass FNV-1a, 32-bit each. Concatenated to give 16 hex chars without
  // needing BigInt (keeps tsconfig target unchanged). Sufficient for cache
  // keys at our scale (~10k translations); collisions vanishingly unlikely.
  let h1 = 0x811c9dc5;
  let h2 = 0x12345678;
  const FNV1 = 0x01000193;
  const FNV2 = 0x01ad97f3;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, FNV1);
    h2 = Math.imul(h2 ^ c, FNV2);
  }
  const a = (h1 >>> 0).toString(16).padStart(8, "0");
  const b = (h2 >>> 0).toString(16).padStart(8, "0");
  return a + b;
}
