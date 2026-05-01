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

/**
 * Load every JSON corpus file in `data/scriptures/` (recursively) and
 * merge their verses into a single deduplicated array.
 *
 * Verses are de-duplicated by `externalId` — later files cannot override
 * earlier ones (we throw if a duplicate is detected so collisions surface).
 */
export function loadCorpus(rootDir = "data/scriptures"): CorpusVerse[] {
  const absRoot = path.resolve(rootDir);
  if (!fs.existsSync(absRoot)) {
    throw new Error(`Corpus directory not found: ${absRoot}`);
  }

  const files = walkJsonFiles(absRoot);
  const seen = new Map<string, string>(); // externalId → file
  const merged: CorpusVerse[] = [];

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
      const prev = seen.get(v.externalId);
      if (prev) {
        throw new Error(
          `Duplicate verse externalId "${v.externalId}" — found in ${prev} and ${file}`
        );
      }
      seen.set(v.externalId, file);
      merged.push(v);
    }
  }

  return merged;
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
