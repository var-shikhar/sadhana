-- ──────────────────────────────────────────────────────────────────────────
-- Affirmations
--
-- Personal affirmations the user curates. Flat list — no groups or
-- categories. is_active is the pause flag, mirroring reflection_chips.
--
-- Idempotent: safe to apply against either a fresh DB or one where the
-- table was created by hand earlier.
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS affirmations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  text        TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS affirmations_user_active_idx
  ON affirmations (user_id, is_active);
