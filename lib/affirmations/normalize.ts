/**
 * Normalize an affirmation string for spoken-vs-written comparison.
 *
 * The Web Speech API returns text without punctuation and tends to
 * resolve contractions inconsistently ("I am" vs "I'm"). We strip
 * punctuation, lowercase, expand the common English contractions, and
 * collapse whitespace so the spoken transcript can be matched against
 * the written affirmation by simple string equality.
 *
 * Apply to BOTH sides — the affirmation text AND the heard transcript —
 * and compare with `===`.
 */

const CONTRACTIONS: Array<[RegExp, string]> = [
  // ── With apostrophes (standard) ──
  // Subject pronouns
  [/\bi'm\b/g, "i am"],
  [/\bi've\b/g, "i have"],
  [/\bi'll\b/g, "i will"],
  [/\bi'd\b/g, "i would"],
  [/\byou're\b/g, "you are"],
  [/\byou've\b/g, "you have"],
  [/\byou'll\b/g, "you will"],
  [/\byou'd\b/g, "you would"],
  [/\bwe're\b/g, "we are"],
  [/\bwe've\b/g, "we have"],
  [/\bwe'll\b/g, "we will"],
  [/\bwe'd\b/g, "we would"],
  [/\bthey're\b/g, "they are"],
  [/\bthey've\b/g, "they have"],
  [/\bthey'll\b/g, "they will"],
  [/\bthey'd\b/g, "they would"],
  [/\bhe's\b/g, "he is"],
  [/\bhe'll\b/g, "he will"],
  [/\bhe'd\b/g, "he would"],
  [/\bshe's\b/g, "she is"],
  [/\bshe'll\b/g, "she will"],
  [/\bshe'd\b/g, "she would"],
  [/\bit's\b/g, "it is"],
  [/\bit'll\b/g, "it will"],
  [/\bit'd\b/g, "it would"],
  // Negations
  [/\bisn't\b/g, "is not"],
  [/\baren't\b/g, "are not"],
  [/\bwasn't\b/g, "was not"],
  [/\bweren't\b/g, "were not"],
  [/\bhasn't\b/g, "has not"],
  [/\bhaven't\b/g, "have not"],
  [/\bhadn't\b/g, "had not"],
  [/\bdoesn't\b/g, "does not"],
  [/\bdon't\b/g, "do not"],
  [/\bdidn't\b/g, "did not"],
  [/\bwon't\b/g, "will not"],
  [/\bwouldn't\b/g, "would not"],
  [/\bcan't\b/g, "cannot"],
  [/\bcannot\b/g, "cannot"],
  [/\bcouldn't\b/g, "could not"],
  [/\bshouldn't\b/g, "should not"],
  [/\bmightn't\b/g, "might not"],
  [/\bmustn't\b/g, "must not"],
  // Misc
  [/\blet's\b/g, "let us"],
  [/\bthat's\b/g, "that is"],
  [/\bthere's\b/g, "there is"],
  [/\bhere's\b/g, "here is"],
  [/\bwhat's\b/g, "what is"],
  [/\bwhere's\b/g, "where is"],
  [/\bwho's\b/g, "who is"],

  // ── Bare forms (no apostrophe) — only those that aren't real English
  //    words on their own, to avoid false positives. We deliberately skip
  //    `its` (possessive), `were` (past tense), `ill` (adjective), `well`
  //    (also a noun/adv), `hes` (could be a name), `shes` (rare), etc.
  [/\bim\b/g, "i am"],
  [/\bive\b/g, "i have"],
  [/\bid\b/g, "i would"],
  [/\byoure\b/g, "you are"],
  [/\byouve\b/g, "you have"],
  [/\byoull\b/g, "you will"],
  [/\byoud\b/g, "you would"],
  [/\bwere\b(?=\s+(?:a|an|the|going|here|there|so|very|really|always|never|just|still))/gi, "we are"], // disambiguated guard for "were"
  [/\bweve\b/g, "we have"],
  [/\bwell\b(?=\s+(?:be|do|go|see|find|need|have|get))/gi, "we will"], // "we'll" — guarded
  [/\btheyre\b/g, "they are"],
  [/\btheyve\b/g, "they have"],
  [/\btheyll\b/g, "they will"],
  [/\btheyd\b/g, "they would"],
  [/\bdont\b/g, "do not"],
  [/\bdoesnt\b/g, "does not"],
  [/\bdidnt\b/g, "did not"],
  [/\bcant\b/g, "cannot"],
  [/\bwont\b/g, "will not"],
  [/\bisnt\b/g, "is not"],
  [/\barent\b/g, "are not"],
  [/\bwasnt\b/g, "was not"],
  [/\bwerent\b/g, "were not"],
  [/\bhasnt\b/g, "has not"],
  [/\bhavent\b/g, "have not"],
  [/\bhadnt\b/g, "had not"],
  [/\bcouldnt\b/g, "could not"],
  [/\bwouldnt\b/g, "would not"],
  [/\bshouldnt\b/g, "should not"],
  [/\bthats\b/g, "that is"],
  [/\bwhats\b/g, "what is"],
  [/\bwheres\b/g, "where is"],
  [/\bwhos\b/g, "who is"],
  [/\bheres\b/g, "here is"],
  [/\btheres\b/g, "there is"],
  [/\blets\b/g, "let us"],
];

/**
 * Normalize text for spoken-vs-written comparison. The English path expands
 * contractions (apostrophe + bare forms) and strips punctuation. The Hindi-
 * Devanagari path NFC-canonicalizes, drops dandas / common diacritic noise,
 * and is otherwise tolerant of whitespace. The Hindi-Latin path delegates
 * to the English path since the script is the same Latin alphabet.
 *
 * Language defaults to "en-US" for back-compat with existing callers.
 */
export function normalizeAffirmation(s: string, language?: string): string {
  if (language === "hi-IN") return normalizeDevanagari(s);
  // "en-US" and "hi-Latn-IN" both use the English Latin path.
  return normalizeLatin(s);
}

function normalizeLatin(s: string): string {
  let t = s.toLowerCase().trim();
  for (const [pattern, replacement] of CONTRACTIONS) {
    t = t.replace(pattern, replacement);
  }
  // Strip everything except letters, numbers, and spaces.
  t = t.replace(/[^a-z0-9\s]/g, " ");
  // Collapse whitespace.
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

function normalizeDevanagari(s: string): string {
  // NFC canonicalizes precomposed vs decomposed sequences so the same
  // visual string compares equal regardless of input method.
  let t = s.normalize("NFC").trim();
  // Strip dandas (Hindi sentence terminators) and Latin punctuation.
  t = t.replace(/[।॥.,!?;:'"\-—–]+/g, " ");
  // Strip nukta (often dropped/added inconsistently by typists & STT).
  t = t.replace(/़/g, "");
  // Collapse whitespace.
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

/** Fisher-Yates in-place. Returns the same array for chaining. */
export function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
