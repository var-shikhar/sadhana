-- ──────────────────────────────────────────────────────────────────────────
-- Drop legacy goal lifecycle columns
--
-- Migration 0007 added `start_date` / `end_date` and backfilled them from
-- the legacy `started_date` / `deadline_date` columns. Since then the app
-- has been writing to both pairs in lockstep. With the transition window
-- closed, the legacy columns are dead weight — drop them.
--
-- Idempotent. Safe to re-run.
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE goals DROP COLUMN IF EXISTS started_date;
ALTER TABLE goals DROP COLUMN IF EXISTS deadline_date;
