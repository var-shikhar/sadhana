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
