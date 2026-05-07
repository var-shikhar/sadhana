-- ──────────────────────────────────────────────────────────────────────────
-- Goals — horizon, monthly cadence, sub-goals, audit history
--
-- Goals become top-level. Category is now an optional label (nullable FK).
-- New `goal_horizon` enum drives short/medium/long-term grouping.
-- `parent_id` carries one-level-deep sub-goals with cascade delete.
-- `goal_history` is the lifecycle audit trail.
--
-- Idempotent: safe to apply against either a fresh DB or one already
-- partially modified.
-- ──────────────────────────────────────────────────────────────────────────


-- ── 1. Make category optional (label, not parent) ────────────────────────
ALTER TABLE goals ALTER COLUMN category_id DROP NOT NULL;


-- ── 2. Add 'monthly' to existing goal_shape enum ─────────────────────────
ALTER TYPE goal_shape ADD VALUE IF NOT EXISTS 'monthly';


-- ── 3. New horizon enum ──────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE goal_horizon AS ENUM ('short_term', 'medium_term', 'long_term');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS horizon goal_horizon NOT NULL DEFAULT 'medium_term';


-- ── 4. Sub-goals via self-FK ─────────────────────────────────────────────
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS parent_id UUID
    REFERENCES goals(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS goals_parent_idx ON goals (parent_id);
CREATE INDEX IF NOT EXISTS goals_horizon_idx ON goals (user_id, horizon);


-- ── 5. Lifecycle audit trail ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goal_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id     UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  change_type TEXT NOT NULL,
  from_value  TEXT,
  to_value    TEXT,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS goal_history_goal_idx
  ON goal_history (goal_id, created_at DESC);
