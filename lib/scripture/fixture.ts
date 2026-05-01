/**
 * Hand-curated starter corpus — 30 verses chosen for the user-states the
 * un-motivated practitioner most often arrives in.
 *
 * Each verse is committed with one or more public-domain English
 * translations. Sanskrit Devanagari + IAST will be populated in a later
 * pass from authoritative open sources (sanskritdocuments.org, IIT Kanpur
 * Gita Supersite). For now we ingest English so retrieval works on day one.
 *
 * Tags are the user-state semantic anchors that boost retrieval at query
 * time. They are intentionally short, concrete, and grouped around the
 * states named in Yoga Sutra 1.30 (the nine obstacles: vyadhi, styana,
 * samshaya, pramada, alasya, avirati, bhrantidarshana, alabdhabhumikatva,
 * anavasthitatva).
 */

export type FixtureBook =
  | "bhagavad_gita"
  | "yoga_sutras"
  | "isha_upanishad"
  | "kena_upanishad"
  | "katha_upanishad"
  | "mundaka_upanishad"
  | "mandukya_upanishad";

export type FixtureTranslator =
  | "besant"
  | "arnold"
  | "vivekananda"
  | "paramananda"
  | "muller"
  | "johnston";

export interface FixtureVerse {
  externalId: string;
  book: FixtureBook;
  chapter: number;
  verse: number;
  subVerse?: number;
  ordinalIndex: number;
  sanskritDevanagari?: string;
  sanskritIast?: string;
  translations: Array<{
    translator: FixtureTranslator;
    editionYear?: number;
    englishText: string;
  }>;
  tags: string[];
  /** Hand-curated cross-references to other verses, by externalId. */
  crossReferences?: Array<{ to: string; notes?: string }>;
}

export const FIXTURE_VERSES: FixtureVerse[] = [
  // ── Bhagavad Gita: the karma-yoga teaching that addresses the un-motivated ──
  {
    externalId: "BG_2.47",
    book: "bhagavad_gita",
    chapter: 2,
    verse: 47,
    ordinalIndex: 100247,
    translations: [
      {
        translator: "besant",
        editionYear: 1895,
        englishText:
          "Thy business is with the action only, never with its fruits; so let not the fruit of action be thy motive, nor be thou to inaction attached.",
      },
      {
        translator: "arnold",
        editionYear: 1885,
        englishText:
          "Let right deeds be thy motive, not the fruit which comes from them. And live in action! Labour! Make thine acts thy piety, casting all self aside, contemning gain and merit; equable in good or evil: equability is Yog, is piety!",
      },
    ],
    tags: ["attachment-to-fruit", "anxiety-about-outcomes", "starting-and-quitting", "performance-anxiety"],
  },
  {
    externalId: "BG_2.48",
    book: "bhagavad_gita",
    chapter: 2,
    verse: 48,
    ordinalIndex: 100248,
    translations: [
      {
        translator: "besant",
        editionYear: 1895,
        englishText:
          "Perform action, O Dhananjaya, dwelling in union with the divine, renouncing attachments, and balanced evenly in success and failure: equilibrium is called Yoga.",
      },
    ],
    tags: ["equanimity", "success-and-failure", "attachment-to-fruit"],
  },
  {
    externalId: "BG_2.62",
    book: "bhagavad_gita",
    chapter: 2,
    verse: 62,
    ordinalIndex: 100262,
    translations: [
      {
        translator: "besant",
        editionYear: 1895,
        englishText:
          "Man, musing on the objects of sense, conceiveth an attachment to these; from attachment ariseth desire; from desire anger cometh forth.",
      },
    ],
    tags: ["anger", "craving", "avirati", "chain-of-distraction"],
  },
  {
    externalId: "BG_2.63",
    book: "bhagavad_gita",
    chapter: 2,
    verse: 63,
    ordinalIndex: 100263,
    translations: [
      {
        translator: "besant",
        editionYear: 1895,
        englishText:
          "From anger proceedeth delusion; from delusion confused memory; from confused memory the destruction of reason; from destruction of reason he perishes.",
      },
    ],
    tags: ["anger", "delusion", "loss-of-clarity", "self-destruction"],
  },
  {
    externalId: "BG_6.5",
    book: "bhagavad_gita",
    chapter: 6,
    verse: 5,
    ordinalIndex: 100605,
    translations: [
      {
        translator: "besant",
        editionYear: 1895,
        englishText:
          "Let him raise the self by the Self, and not let the self become depressed; for verily is the Self the friend of the self, and also the Self the self's enemy.",
      },
    ],
    tags: ["self-motivation", "depression", "agency", "the-un-motivated"],
  },
  {
    externalId: "BG_6.6",
    book: "bhagavad_gita",
    chapter: 6,
    verse: 6,
    ordinalIndex: 100606,
    translations: [
      {
        translator: "besant",
        editionYear: 1895,
        englishText:
          "The Self is the friend of the self of him in whom the self by the Self is conquered; but to the unconquered self the Self is verily hostile, as if an enemy.",
      },
    ],
    tags: ["self-motivation", "agency", "self-as-enemy"],
  },
  {
    externalId: "BG_6.34",
    book: "bhagavad_gita",
    chapter: 6,
    verse: 34,
    ordinalIndex: 100634,
    translations: [
      {
        translator: "besant",
        editionYear: 1895,
        englishText:
          "For the mind is verily restless, O Krishna; it is impetuous, strong and difficult to bend; I deem it as hard to curb as the wind.",
      },
    ],
    tags: ["restlessness", "scattered-mind", "anavasthitatva", "doubt"],
  },
  {
    externalId: "BG_6.35",
    book: "bhagavad_gita",
    chapter: 6,
    verse: 35,
    ordinalIndex: 100635,
    translations: [
      {
        translator: "besant",
        editionYear: 1895,
        englishText:
          "Without doubt, O mighty-armed, the mind is hard to curb and restless; but it may be curbed by constant practice and by dispassion.",
      },
    ],
    tags: ["restlessness", "abhyasa", "vairagya", "discipline-as-antidote"],
    crossReferences: [{ to: "YS_1.12", notes: "Patanjali's same prescription: practice + non-attachment" }],
  },
  {
    externalId: "BG_6.40",
    book: "bhagavad_gita",
    chapter: 6,
    verse: 40,
    ordinalIndex: 100640,
    translations: [
      {
        translator: "besant",
        editionYear: 1895,
        englishText:
          "O son of Pritha, neither in this world nor in the life to come is there destruction for him; never doth any who worketh righteousness, O beloved, tread the path of woe.",
      },
    ],
    tags: ["fall-from-practice", "abandonment", "the-30-day-cliff", "no-progress-lost"],
  },
  {
    externalId: "BG_6.41",
    book: "bhagavad_gita",
    chapter: 6,
    verse: 41,
    ordinalIndex: 100641,
    translations: [
      {
        translator: "besant",
        editionYear: 1895,
        englishText:
          "Having attained to the worlds of the pure-doing, and having dwelt there for eternal years, he who fell from yoga is reborn in a pure and blessed house.",
      },
    ],
    tags: ["fall-from-practice", "carrying-forward", "no-progress-lost"],
  },
  {
    externalId: "BG_6.43",
    book: "bhagavad_gita",
    chapter: 6,
    verse: 43,
    ordinalIndex: 100643,
    translations: [
      {
        translator: "besant",
        editionYear: 1895,
        englishText:
          "There he recovereth the characteristics belonging to his former body, and with these he laboureth again for perfection, O joy of the Kurus.",
      },
    ],
    tags: ["carrying-forward", "no-progress-lost", "returning-to-practice"],
  },
  {
    externalId: "BG_18.66",
    book: "bhagavad_gita",
    chapter: 18,
    verse: 66,
    ordinalIndex: 101866,
    translations: [
      {
        translator: "besant",
        editionYear: 1895,
        englishText:
          "Abandoning all duties, come unto Me alone for shelter; sorrow not, I will liberate thee from all sins.",
      },
    ],
    tags: ["surrender", "overwhelm", "letting-go", "trust"],
  },

  // ── Yoga Sutras of Patanjali — the diagnostic + treatment system ──
  {
    externalId: "YS_1.12",
    book: "yoga_sutras",
    chapter: 1,
    verse: 12,
    ordinalIndex: 200112,
    translations: [
      {
        translator: "vivekananda",
        editionYear: 1896,
        englishText:
          "Their control is by practice and non-attachment.",
      },
      {
        translator: "johnston",
        editionYear: 1912,
        englishText:
          "The control of these psychic states comes through right practice and dispassion.",
      },
    ],
    tags: ["abhyasa", "vairagya", "discipline-as-antidote", "two-wings-of-practice"],
  },
  {
    externalId: "YS_1.13",
    book: "yoga_sutras",
    chapter: 1,
    verse: 13,
    ordinalIndex: 200113,
    translations: [
      {
        translator: "vivekananda",
        editionYear: 1896,
        englishText:
          "Continuous struggle to keep them perfectly restrained is practice.",
      },
    ],
    tags: ["abhyasa", "sustained-effort"],
  },
  {
    externalId: "YS_1.14",
    book: "yoga_sutras",
    chapter: 1,
    verse: 14,
    ordinalIndex: 200114,
    translations: [
      {
        translator: "vivekananda",
        editionYear: 1896,
        englishText:
          "Its ground becomes firm by long, constant efforts with great love for the end to be attained.",
      },
    ],
    tags: ["sustained-effort", "long-time", "reverence", "the-30-day-cliff"],
  },
  {
    externalId: "YS_1.30",
    book: "yoga_sutras",
    chapter: 1,
    verse: 30,
    ordinalIndex: 200130,
    translations: [
      {
        translator: "vivekananda",
        editionYear: 1896,
        englishText:
          "Disease, mental laziness, doubt, lack of enthusiasm, lethargy, clinging to sense-enjoyments, false perception, non-attaining concentration, and falling away from the state when obtained, are the obstructing distractions.",
      },
      {
        translator: "johnston",
        editionYear: 1912,
        englishText:
          "Sickness, inertia, doubt, lightmindedness, laziness, intemperance, false notions, inability to reach firm ground, instability — these distractions of the psychic nature are the obstacles.",
      },
    ],
    tags: ["the-nine-obstacles", "vyadhi", "styana", "samshaya", "pramada", "alasya", "avirati", "diagnosis"],
  },
  {
    externalId: "YS_1.32",
    book: "yoga_sutras",
    chapter: 1,
    verse: 32,
    ordinalIndex: 200132,
    translations: [
      {
        translator: "vivekananda",
        editionYear: 1896,
        englishText:
          "To remedy this, the practice of one subject (should be made).",
      },
      {
        translator: "johnston",
        editionYear: 1912,
        englishText:
          "Steady application to one principle is the way to check these obstacles.",
      },
    ],
    tags: ["single-pointed-practice", "remedy-for-obstacles", "starting-and-quitting"],
    crossReferences: [{ to: "YS_1.30", notes: "antidote to the nine obstacles" }],
  },
  {
    externalId: "YS_1.33",
    book: "yoga_sutras",
    chapter: 1,
    verse: 33,
    ordinalIndex: 200133,
    translations: [
      {
        translator: "vivekananda",
        editionYear: 1896,
        englishText:
          "Friendship, mercy, gladness, indifference, being thought of in regard to subjects, happy, unhappy, good, and evil respectively, pacify the chitta.",
      },
      {
        translator: "johnston",
        editionYear: 1912,
        englishText:
          "By cultivating friendship for the happy, compassion for the unhappy, joy for the virtuous, and indifference for the wicked, peace of mind is gained.",
      },
    ],
    tags: ["four-attitudes", "compassion", "equanimity", "pacifying-the-mind"],
  },
  {
    externalId: "YS_2.1",
    book: "yoga_sutras",
    chapter: 2,
    verse: 1,
    ordinalIndex: 200201,
    translations: [
      {
        translator: "vivekananda",
        editionYear: 1896,
        englishText:
          "Mortification, study, and surrendering fruits of work to God are called Kriya-yoga.",
      },
      {
        translator: "johnston",
        editionYear: 1912,
        englishText:
          "The practical means of attaining union are: fervour, spiritual reading, and complete obedience to the Master.",
      },
    ],
    tags: ["tapas", "svadhyaya", "ishvara-pranidhana", "three-pillars"],
  },
  {
    externalId: "YS_2.16",
    book: "yoga_sutras",
    chapter: 2,
    verse: 16,
    ordinalIndex: 200216,
    translations: [
      {
        translator: "vivekananda",
        editionYear: 1896,
        englishText:
          "The misery which is not yet come is to be avoided.",
      },
    ],
    tags: ["foresight", "preventive-practice", "future-suffering"],
  },
  {
    externalId: "YS_2.33",
    book: "yoga_sutras",
    chapter: 2,
    verse: 33,
    ordinalIndex: 200233,
    translations: [
      {
        translator: "vivekananda",
        editionYear: 1896,
        englishText:
          "To obstruct thoughts which are inimical to Yoga, contrary thoughts will be brought.",
      },
      {
        translator: "johnston",
        editionYear: 1912,
        englishText:
          "When forbidden thoughts arise, the cultivation of their opposite is the remedy.",
      },
    ],
    tags: ["pratipaksha-bhavana", "negative-thoughts", "cognitive-reframing", "anger"],
  },

  // ── Upanishads — the deeper context ──
  {
    externalId: "KU_1.3.14",
    book: "katha_upanishad",
    chapter: 3,
    verse: 14,
    ordinalIndex: 300314,
    translations: [
      {
        translator: "paramananda",
        editionYear: 1919,
        englishText:
          "Arise! Awake! Approach the great and learn. Like the sharp edge of a razor is that path, so the wise say — hard to tread and difficult to cross.",
      },
      {
        translator: "muller",
        editionYear: 1879,
        englishText:
          "Rise, awake! having obtained your boons, understand them! The edge of a razor is sharp and hard to cross; thus the wise say the path (to the Self) is difficult.",
      },
    ],
    tags: ["arise-awake", "the-call", "difficulty-of-the-path", "starting"],
  },
  {
    externalId: "KU_2.3.10",
    book: "katha_upanishad",
    chapter: 2,
    verse: 10,
    subVerse: 3,
    ordinalIndex: 300310,
    translations: [
      {
        translator: "paramananda",
        editionYear: 1919,
        englishText:
          "When the five senses, together with the mind, remain still, and when the intellect does not stir — that, they say, is the highest state.",
      },
    ],
    tags: ["stillness", "samadhi", "single-pointed-practice"],
  },
  {
    externalId: "IsaUp_1",
    book: "isha_upanishad",
    chapter: 1,
    verse: 1,
    ordinalIndex: 400001,
    translations: [
      {
        translator: "paramananda",
        editionYear: 1919,
        englishText:
          "All this — whatever moves in this moving world — is enveloped by the Lord. Therefore find your enjoyment in renunciation; do not covet what belongs to others.",
      },
    ],
    tags: ["renunciation", "non-coveting", "presence", "everything-as-given"],
  },
  {
    externalId: "MundakaUp_3.1.5",
    book: "mundaka_upanishad",
    chapter: 3,
    verse: 5,
    subVerse: 1,
    ordinalIndex: 500305,
    translations: [
      {
        translator: "paramananda",
        editionYear: 1919,
        englishText:
          "By truthfulness, by austerity, by right knowledge, and by continence, this Self is to be attained — pure, of a clear light, which the ascetics behold within the body.",
      },
    ],
    tags: ["truthfulness", "tapas", "discipline", "the-self"],
  },
  {
    externalId: "MundakaUp_3.1.6",
    book: "mundaka_upanishad",
    chapter: 3,
    verse: 6,
    subVerse: 1,
    ordinalIndex: 500306,
    translations: [
      {
        translator: "paramananda",
        editionYear: 1919,
        englishText:
          "Truth alone triumphs, not falsehood. By truth the divine path is laid open, by which the seers, whose desires are fulfilled, ascend to the highest abode of Truth.",
      },
    ],
    tags: ["truthfulness", "honesty", "the-path"],
  },
  {
    externalId: "KenaUp_1.4",
    book: "kena_upanishad",
    chapter: 1,
    verse: 4,
    ordinalIndex: 600104,
    translations: [
      {
        translator: "paramananda",
        editionYear: 1919,
        englishText:
          "That which speech does not illumine, but which illumines speech: know that alone to be Brahman, not what people here adore.",
      },
    ],
    tags: ["the-witness", "subject-not-object", "the-self"],
  },
  {
    externalId: "MandukyaUp_7",
    book: "mandukya_upanishad",
    chapter: 1,
    verse: 7,
    ordinalIndex: 700107,
    translations: [
      {
        translator: "paramananda",
        editionYear: 1919,
        englishText:
          "Not inwardly cognitive, not outwardly cognitive, not cognitive of both, not a mass of cognition, neither cognitive nor non-cognitive, unseen, beyond empirical dealings, beyond the grasp, uninferable, unthinkable, indescribable; whose essence is the consciousness of the one Self; in whom all phenomena cease — peaceful, blissful, non-dual: such, they think, is the Fourth. He is the Self; He is to be known.",
      },
    ],
    tags: ["the-self", "turiya", "non-dual", "witness-consciousness"],
  },
];

/** Quick lookup helpers used at ingestion time */
export function fixtureByExternalId(id: string): FixtureVerse | undefined {
  return FIXTURE_VERSES.find((v) => v.externalId === id);
}
