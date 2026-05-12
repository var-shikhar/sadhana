-- ──────────────────────────────────────────────────────────────────────────
-- Voice Counsel — per-call usage tracking
--
-- One row per voice call. Used by the daily-minute cap query in
-- /api/counsel/voice/session and by the per-call finalize in
-- /api/counsel/voice/end. The transcript itself is NOT stored here;
-- transcripts live client-side in localStorage via useCounselStore,
-- mirroring the existing text-Counsel privacy posture.
--
-- Idempotent.
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS voice_session_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id         TEXT NOT NULL UNIQUE,
  user_id         TEXT NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  duration_sec    INTEGER NOT NULL DEFAULT 0,
  persona_id      TEXT NOT NULL,
  language        TEXT NOT NULL,
  broke_character BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS voice_session_usage_user_started_idx
  ON voice_session_usage (user_id, started_at);
