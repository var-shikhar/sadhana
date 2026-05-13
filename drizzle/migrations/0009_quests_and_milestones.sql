-- ──────────────────────────────────────────────────────────────────────────
-- Quests, disciplines, and milestones
--
-- The goal model splits in two:
--
--   • Quest      — sequential, achievement-oriented. ONE active at a time
--                  by default (settable up to 3). Replaces sub-goals with
--                  ordered milestones. Each milestone has its own tasks.
--                  The lifecycle (start/end/scheduled) gates when it can
--                  be in flight.
--
--   • Discipline — recurring practice. Runs in parallel, always. No
--                  milestones — just cadence + streak + optional tasks
--                  directly on the goal.
--
-- Auto-classification on this migration: any goal with shape='by_date'
-- becomes a 'quest'; everything else (daily/weekly/monthly) becomes a
-- 'discipline'. Existing sub-goals are NOT auto-converted to milestones —
-- they stay where they are; the new UI surfaces handle the transition.
-- This avoids fragile name-based remapping during a one-shot migration.
--
-- Idempotent.
-- ──────────────────────────────────────────────────────────────────────────


-- ── 1. goal_type enum + column ───────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE goal_type AS ENUM ('quest', 'discipline');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS goal_type goal_type NOT NULL DEFAULT 'discipline';

-- Auto-classify existing rows. Idempotent because new rows already default
-- to 'discipline'; this UPDATE just flips by_date goals to 'quest'.
UPDATE goals SET goal_type = 'quest' WHERE shape = 'by_date' AND goal_type <> 'quest';

CREATE INDEX IF NOT EXISTS goals_user_type_status_idx
  ON goals (user_id, goal_type, status);


-- ── 2. milestones table ──────────────────────────────────────────────────
-- Each milestone belongs to one quest goal. Ordered checkpoints along the
-- journey. `target_value` is optional — many milestones are binary (first
-- sale, draft complete) rather than quantitative.
CREATE TABLE IF NOT EXISTS milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id       UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  target_value  INTEGER,
  order_index   INTEGER NOT NULL DEFAULT 0,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS milestones_goal_order_idx
  ON milestones (goal_id, order_index);


-- ── 3. tasks.milestone_id ────────────────────────────────────────────────
-- Tasks can optionally be anchored to a milestone (quest tasks) instead of
-- just the goal (discipline tasks). Nullable + ON DELETE SET NULL so a
-- deleted milestone doesn't cascade-delete its tasks — they fall back to
-- the goal level and the user can reassign them.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS milestone_id UUID
    REFERENCES milestones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_milestone_idx ON tasks (milestone_id);


-- ── 4. profiles.max_active_quests ────────────────────────────────────────
-- User-facing setting (1, 2, or 3) controlling how many quests can be
-- 'active' at the same time. Default is 1 — the focused mode that gives
-- the model its meaning. Setting > 1 trades focus for parallel pursuit.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS max_active_quests INTEGER NOT NULL DEFAULT 1;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_max_active_quests_range
    CHECK (max_active_quests BETWEEN 1 AND 3);
