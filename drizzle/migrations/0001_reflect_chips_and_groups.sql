-- ──────────────────────────────────────────────────────────────────────────
-- Reflect tab — chip-bucket flow + act groups
--
-- Idempotent: safe to apply against either
--   (a) a fresh DB, or
--   (b) a DB where the older supabase/002_reflection_chips.sql already
--       created chip_category + reflection_chips + the reflections.*_chips
--       columns.
--
-- Two related schema changes:
--
-- 1. reflect_chips_and_buckets — chip library + day-bucket columns on
--    reflections.
-- 2. act_groups — orthogonal grouping for reflection chips. A group has a
--    name + active toggle; toggling cascades to its child acts (in the API
--    layer). Acts whose group_id is NULL belong to "All / Global".
-- ──────────────────────────────────────────────────────────────────────────


-- ── 1. Chip-bucket flow ──────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE chip_category AS ENUM ('good', 'bad', 'neutral');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE reflections
  ADD COLUMN IF NOT EXISTS good_chips        TEXT[],
  ADD COLUMN IF NOT EXISTS bad_chips         TEXT[],
  ADD COLUMN IF NOT EXISTS neutral_chips     TEXT[],
  ADD COLUMN IF NOT EXISTS chip_descriptions JSONB,
  ADD COLUMN IF NOT EXISTS day_summary       TEXT;

CREATE TABLE IF NOT EXISTS reflection_chips (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL,
  name          TEXT NOT NULL,
  category      chip_category NOT NULL,
  sort_order    INT  NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at  TIMESTAMPTZ,
  use_count     INT  NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT reflection_chips_user_name_unique UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS reflection_chips_user_active_idx
  ON reflection_chips (user_id, is_active);


-- ── 2. Act groups ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS act_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  name        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT act_groups_user_name_unique UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS act_groups_user_active_idx
  ON act_groups (user_id, is_active);

ALTER TABLE reflection_chips
  ADD COLUMN IF NOT EXISTS group_id UUID
    REFERENCES act_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS reflection_chips_group_idx
  ON reflection_chips (group_id);
