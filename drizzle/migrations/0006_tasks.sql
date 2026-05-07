-- ──────────────────────────────────────────────────────────────────────────
-- Tasks — Eisenhower-classified action items under a goal or sub-goal
--
-- A task is a discrete one-and-done item. Lighter than sub-goals (no logs,
-- no history, no cadence). `important` × `urgent` derive the Eisenhower
-- quadrant. Cascade delete from parent. v1 status: open | done.
--
-- Idempotent.
-- ──────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('open', 'done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  goal_id         UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  important       BOOLEAN NOT NULL DEFAULT FALSE,
  urgent          BOOLEAN NOT NULL DEFAULT FALSE,
  status          task_status NOT NULL DEFAULT 'open',
  completion_note TEXT,
  completed_at    TIMESTAMPTZ,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tasks_goal_status_idx
  ON tasks (goal_id, status);

CREATE INDEX IF NOT EXISTS tasks_user_quadrant_idx
  ON tasks (user_id, important, urgent);
