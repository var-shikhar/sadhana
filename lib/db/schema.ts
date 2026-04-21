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

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
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
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const circleMembers = pgTable(
  "circle_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    circleId: uuid("circle_id").references(() => circles.id, { onDelete: "cascade" }),
    userId: uuid("user_id"),
    partnerId: uuid("partner_id"),
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
  createdBy: uuid("created_by"),
  isActive: boolean("is_active").default(true),
});

export const userHabits = pgTable(
  "user_habits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
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
    userId: uuid("user_id").notNull(),
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
    userId: uuid("user_id").notNull(),
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
    userId: uuid("user_id").notNull(),
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
  senderId: uuid("sender_id").notNull(),
  receiverId: uuid("receiver_id").notNull(),
  type: nudgeTypeEnum("type"),
  message: text("message").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
});
