-- ──────────────────────────────────────────────────────────────────────────
-- Goals lifecycle — start_date, end_date (unified), scheduled status
--
-- Goals get an explicit lifecycle window: start_date (when tracking begins)
-- and end_date (the finish line, if any). end_date applies to ALL cadences
-- — daily/weekly/monthly can now be bounded too, not just by_date. The old
-- by_date-only deadline_date is folded into end_date here; the column stays
-- in place (no app code reads it after this migration) so we can drop it
-- in a follow-up after we've verified the new fields in production.
--
-- The 'scheduled' status models a goal whose start_date is in the future:
-- it doesn't show in Plan / Today's Practice and doesn't count toward
-- streaks. Auto-promoted to 'active' lazily on read by the goals API
-- once start_date <= today.
--
-- Idempotent.
-- ──────────────────────────────────────────────────────────────────────────


-- ── 1. Add start_date / end_date columns ─────────────────────────────────
-- start_date defaults to today on insert at the DB level so existing rows
-- retain their started_date semantics; new rows take it explicitly from the
-- application.
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date   DATE;


-- ── 2. Backfill from existing data ───────────────────────────────────────
-- start_date carries forward from started_date (which has always been
-- mandatory). end_date carries forward from deadline_date for by_date
-- goals; recurring cadences had no end before, so end_date stays NULL.
UPDATE goals SET start_date = started_date WHERE start_date IS NULL;
UPDATE goals SET end_date   = deadline_date WHERE end_date IS NULL AND deadline_date IS NOT NULL;


-- ── 3. Make start_date NOT NULL with a sane default ──────────────────────
-- After backfill, every row has a start_date. Lock it in.
ALTER TABLE goals ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE goals ALTER COLUMN start_date SET DEFAULT CURRENT_DATE;


-- ── 4. Add 'scheduled' to goal_status enum ───────────────────────────────
ALTER TYPE goal_status ADD VALUE IF NOT EXISTS 'scheduled';


-- ── 5. Index for the lazy-promotion query ────────────────────────────────
-- The auto-promote pass on each goals read filters by (user_id, status,
-- start_date). A composite index keeps it cheap as the goal library grows.
CREATE INDEX IF NOT EXISTS goals_user_status_start_idx
  ON goals (user_id, status, start_date);
