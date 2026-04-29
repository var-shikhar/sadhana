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
} from "drizzle-orm/pg-core";

export const reflectionModeEnum = pgEnum("reflection_mode", ["quick", "deep"]);
export const nudgeTypeEnum = pgEnum("nudge_type", ["emoji", "preset"]);

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
