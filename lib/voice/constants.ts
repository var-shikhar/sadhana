// Tune-knobs for the voice-Counsel cost gating. Pulled into their own file
// (no DB imports) so client code (CallScreen) can import them without the
// Postgres driver getting bundled for the browser.

export const MAX_CALL_SECONDS = 600; // 10 minutes per call
export const MAX_DAILY_SECONDS = 1200; // 20 minutes per user per day
