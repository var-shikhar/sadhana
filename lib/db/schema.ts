import {
  pgTable,
  uuid,
  text,
  boolean,
  date,
  timestamp,
  numeric,
  integer,
  time,
  pgEnum,
  unique,
  customType,
  index,
} from "drizzle-orm/pg-core";

// pgvector custom type for Drizzle. Stored as text in transit; pgvector
// handles the conversion to its native vector format on the column side.
export const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  toDriver(value) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value) {
    if (typeof value === "string") {
      return value
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((n) => Number(n));
    }
    return value as unknown as number[];
  },
});

export const reflectionModeEnum = pgEnum("reflection_mode", ["quick", "deep"]);
export const nudgeTypeEnum = pgEnum("nudge_type", ["emoji", "preset"]);
export const vrataLengthEnum = pgEnum("vrata_length", [
  "saptaha",         // 7 days
  "trayivimshati",   // 21 days
  "mandala",         // 40 days
  "ashtottarashata", // 108 days
]);
export const vrataStatusEnum = pgEnum("vrata_status", [
  "active",
  "completed",
  "abandoned",
]);
export const categoryColorEnum = pgEnum("category_color", [
  "saffron",
  "sage",
  "indigo",
  "earth",
  "gold",
]);
export const goalShapeEnum = pgEnum("goal_shape", [
  "daily",
  "weekly",
  "by_date",
]);
export const goalStatusEnum = pgEnum("goal_status", [
  "active",
  "paused",
  "completed",
  "abandoned",
]);
export const goalSourceEnum = pgEnum("goal_source", [
  "user",
  "suggestion",
]);

// ── Scripture / RAG ──
export const scriptureBookEnum = pgEnum("scripture_book", [
  "bhagavad_gita",
  "yoga_sutras",
  "isha_upanishad",
  "kena_upanishad",
  "katha_upanishad",
  "mundaka_upanishad",
  "mandukya_upanishad",
  "prashna_upanishad",
  "taittiriya_upanishad",
  "aitareya_upanishad",
  "chandogya_upanishad",
  "brihadaranyaka_upanishad",
  "svetasvatara_upanishad",
  "hatha_yoga_pradipika",
  "vivekachudamani",
]);

export const translatorEnum = pgEnum("scripture_translator", [
  "besant",         // Annie Besant (Gita) — public domain
  "arnold",         // Edwin Arnold "Song Celestial" (Gita) — public domain
  "telang",         // K.T. Telang (Gita) — public domain
  "vivekananda",    // Swami Vivekananda (YS, Upanishads) — public domain
  "paramananda",    // Swami Paramananda (Upanishads) — public domain
  "muller",         // F. Max Müller (Upanishads) — public domain
  "prabhupada",     // A.C. Bhaktivedanta Swami Prabhupada — copyrighted (BBT)
  "easwaran",       // Eknath Easwaran — copyrighted
  "iyengar",        // B.K.S. Iyengar (YS) — copyrighted
  "aurobindo",      // Sri Aurobindo (Gita) — public domain
  "johnston",       // Charles Johnston (YS) — public domain
]);

export const verseRelationTypeEnum = pgEnum("verse_relation_type", [
  "sequential",      // verse N → verse N+1 (auto-generated)
  "cross_reference", // hand-curated: this verse echoes/cites another
  "commentary_on",   // a commentary verse on a sutra
  "paraphrase_of",   // restatement
  "antithesis_of",   // tension / counter-position
]);

// ---------- Better-Auth tables ----------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ---------- App tables ----------

export const profiles = pgTable("profiles", {
  id: text("id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  morningReminderTime: time("morning_reminder_time").default("07:00"),
  eveningReminderTime: time("evening_reminder_time").default("21:00"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const circles = pgTable("circles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").unique().notNull(),
  maxMembers: integer("max_members").notNull().default(20),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const circleMembers = pgTable(
  "circle_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    circleId: uuid("circle_id").references(() => circles.id, { onDelete: "cascade" }),
    userId: text("user_id"),
    partnerId: text("partner_id"),
    shareScore: boolean("share_score").default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [unique().on(table.circleId, table.userId)]
);

export const habits = pgTable("habits", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  permaPillar: text("perma_pillar"),
  icon: text("icon"),
  isAvoid: boolean("is_avoid").default(false),
  isPreset: boolean("is_preset").default(true),
  createdBy: text("created_by"),
  isActive: boolean("is_active").default(true),
});

export const userHabits = pgTable(
  "user_habits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    habitId: uuid("habit_id").references(() => habits.id).notNull(),
    sankalpa: text("sankalpa"),
    targetDays: text("target_days").array().default(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [unique().on(table.userId, table.habitId)]
);

export const dailyLogs = pgTable(
  "daily_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    date: date("date").notNull(),
    userHabitId: uuid("user_habit_id").references(() => userHabits.id).notNull(),
    completed: boolean("completed").default(false),
    note: text("note"),
    loggedAt: timestamp("logged_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [unique().on(table.userId, table.date, table.userHabitId)]
);

export const reflections = pgTable(
  "reflections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    date: date("date").notNull(),
    mode: reflectionModeEnum("mode").notNull(),
    quickTags: text("quick_tags").array(),
    quickNote: text("quick_note"),
    cbtEvent: text("cbt_event"),
    cbtThought: text("cbt_thought"),
    cbtFeeling: text("cbt_feeling"),
    cbtReframe: text("cbt_reframe"),
    aiResponse: text("ai_response"),
    aiQuestion: text("ai_question"),
    userFollowup: text("user_followup"),
    aiFollowup: text("ai_followup"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [unique().on(table.userId, table.date)]
);

export const growthScores = pgTable(
  "growth_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    date: date("date").notNull(),
    completionPts: numeric("completion_pts", { precision: 5, scale: 2 }).default("0"),
    reflectionPts: numeric("reflection_pts", { precision: 5, scale: 2 }).default("0"),
    consistencyPts: numeric("consistency_pts", { precision: 5, scale: 2 }).default("0"),
    dailyScore: numeric("daily_score", { precision: 5, scale: 2 }).default("0"),
    indexValue: numeric("index_value", { precision: 10, scale: 4 }).default("100"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [unique().on(table.userId, table.date)]
);

export const nudges = pgTable("nudges", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: text("sender_id").notNull(),
  receiverId: text("receiver_id").notNull(),
  type: nudgeTypeEnum("type"),
  message: text("message").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

export const vratas = pgTable("vratas", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  lengthName: vrataLengthEnum("length_name").notNull(),
  baseDays: integer("base_days").notNull(),
  extensionDays: integer("extension_days").notNull().default(0),
  boundHabitIds: uuid("bound_habit_ids").array().notNull().default([]),
  sankalpa: text("sankalpa"),
  startedDate: date("started_date").notNull(),
  completedDate: date("completed_date"),
  abandonedDate: date("abandoned_date"),
  status: vrataStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Scripture corpus tables ──

/**
 * One row per verse across all books. Sanskrit + structural fields.
 * The `external_id` is the stable human-readable id we use in citations,
 * e.g. "BG_2.47", "YS_1.30", "KU_1.3.14".
 */
export const verses = pgTable(
  "verses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    externalId: text("external_id").notNull(),
    book: scriptureBookEnum("book").notNull(),
    chapter: integer("chapter").notNull(),
    verse: integer("verse").notNull(),
    subVerse: integer("sub_verse"), // for verses split into sub-parts
    ordinalIndex: integer("ordinal_index").notNull(), // global linear position for sequential traversal
    sanskritDevanagari: text("sanskrit_devanagari"),
    sanskritIast: text("sanskrit_iast"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("verses_external_id_unique").on(table.externalId),
    index("verses_book_chapter_verse_idx").on(table.book, table.chapter, table.verse),
    index("verses_ordinal_idx").on(table.ordinalIndex),
  ]
);

/**
 * Per-translation row. Each verse can have N translations from different
 * translators. Embedding stored alongside English text (not Sanskrit) —
 * embedding models handle English far better than Sanskrit, and the
 * Sanskrit is preserved on the verses row for display.
 *
 * Embedding dimension: 1536 — works with `text-embedding-3-large` configured
 * to 1536 dims (and matches `text-embedding-3-small` default for fallback).
 * 1536 stays within pgvector's hnsw/ivfflat indexable limit.
 */
export const verseTranslations = pgTable(
  "verse_translations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    verseId: uuid("verse_id")
      .notNull()
      .references(() => verses.id, { onDelete: "cascade" }),
    translator: translatorEnum("translator").notNull(),
    editionYear: integer("edition_year"),
    englishText: text("english_text").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("vt_verse_translator_unique").on(table.verseId, table.translator),
    index("vt_verse_idx").on(table.verseId),
    // pgvector hnsw index on the embedding for fast cosine similarity:
    // we'll create this manually in the migration since drizzle's index DSL
    // doesn't yet express hnsw operator classes.
  ]
);

/**
 * Verse-to-verse edges. The graph layer that captures discourse structure
 * (sequential), cross-references, commentary, etc. Sequential edges are
 * auto-generated at ingestion; the rest are hand-curated during research.
 */
export const verseRelationships = pgTable(
  "verse_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromVerseId: uuid("from_verse_id")
      .notNull()
      .references(() => verses.id, { onDelete: "cascade" }),
    toVerseId: uuid("to_verse_id")
      .notNull()
      .references(() => verses.id, { onDelete: "cascade" }),
    relType: verseRelationTypeEnum("rel_type").notNull(),
    weight: numeric("weight", { precision: 4, scale: 3 }).notNull().default("1.000"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("vr_from_to_type_unique").on(table.fromVerseId, table.toVerseId, table.relType),
    index("vr_from_idx").on(table.fromVerseId, table.relType),
  ]
);

/**
 * Hand-curated semantic anchors. During research I tag each verse with
 * user-state labels ("overwhelm", "starting-and-quitting", "doubting-path",
 * "attachment-to-fruit"...). At query time, if any tag matches a state
 * extracted from the user's question or recent history, the tagged verses
 * receive a similarity boost on top of pure vector ranking.
 */
export const verseTags = pgTable(
  "verse_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    verseId: uuid("verse_id")
      .notNull()
      .references(() => verses.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
    weight: numeric("weight", { precision: 4, scale: 3 }).notNull().default("1.000"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("vtag_verse_tag_unique").on(table.verseId, table.tag),
    index("vtag_tag_idx").on(table.tag),
  ]
);

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  categoryId: uuid("category_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  shape: goalShapeEnum("shape").notNull(),
  // shape-specific
  weeklyTarget: integer("weekly_target"),
  totalTarget: integer("total_target"),
  deadlineDate: date("deadline_date"),
  // common
  source: goalSourceEnum("source").notNull().default("user"),
  status: goalStatusEnum("status").notNull().default("active"),
  startedDate: date("started_date").notNull(),
  completedDate: date("completed_date"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const goalLogs = pgTable("goal_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalId: uuid("goal_id").notNull(),
  userId: text("user_id").notNull(),
  date: date("date").notNull(),
  value: integer("value").notNull().default(1),
  note: text("note"),
  loggedAt: timestamp("logged_at", { withTimezone: true }).defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon").notNull().default("circle"), // emoji or lucide name
  color: categoryColorEnum("color").notNull().default("saffron"),
  priority: integer("priority").notNull().default(3), // 1=highest, 5=lowest
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const vrataSlips = pgTable(
  "vrata_slips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vrataId: uuid("vrata_id")
      .references(() => vratas.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id").notNull(),
    date: date("date").notNull(),
    reason: text("reason"),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [unique().on(table.vrataId, table.date)]
);
