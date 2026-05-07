-- ──────────────────────────────────────────────────────────────────────────
-- affirmations.language
--
-- Each affirmation now carries the language it's spoken in, so the practice
-- page can hand the right BCP-47 tag to the STT engine (Web Speech today,
-- Deepgram later). Defaults to en-US for back-compat with existing rows.
--
-- Allowed values (today): "en-US", "hi-IN", "hi-Latn-IN".
--
-- Idempotent — safe on a fresh DB or after manual edits.
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE affirmations
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en-US';
