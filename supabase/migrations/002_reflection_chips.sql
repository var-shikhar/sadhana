-- ──────────────────────────────────────────────────────────────────────────
-- Reflection chips + bucket-flow columns
--
-- The reflect tab moves from a binary Quick/Deep CBT flow to a single
-- ledger-style flow where the day is tallied across three buckets:
--   good  ·  neutral  ·  bad
-- The user maintains a persistent chip library (reflection_chips); each
-- day's reflection records which chips fell into which bucket, optional
-- per-chip descriptions, and a closing one-line day summary.
--
-- The legacy cbt_* / quick_tags / quick_note columns are PRESERVED so the
-- archive can still render older reflections. New entries leave them null.
-- ──────────────────────────────────────────────────────────────────────────

CREATE TYPE chip_category AS ENUM ('good', 'bad', 'neutral');

ALTER TABLE reflections
  ADD COLUMN good_chips        TEXT[],
  ADD COLUMN bad_chips         TEXT[],
  ADD COLUMN neutral_chips     TEXT[],
  ADD COLUMN chip_descriptions JSONB,
  ADD COLUMN day_summary       TEXT;

CREATE TABLE reflection_chips (
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

CREATE INDEX reflection_chips_user_active_idx
  ON reflection_chips (user_id, is_active);

ALTER TABLE reflection_chips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own reflection_chips"
  ON reflection_chips FOR SELECT  USING (user_id = auth.uid()::text);
CREATE POLICY "Users can insert own reflection_chips"
  ON reflection_chips FOR INSERT  WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users can update own reflection_chips"
  ON reflection_chips FOR UPDATE  USING (user_id = auth.uid()::text);
CREATE POLICY "Users can delete own reflection_chips"
  ON reflection_chips FOR DELETE  USING (user_id = auth.uid()::text);
