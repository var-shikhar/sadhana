"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWebSpeechInput } from "./useWebSpeechInput";
import { useWhisperInput } from "./useWhisperInput";

/**
 * Public voice-input hook. Tries the browser-native Web Speech API first
 * (free, fast) and silently falls back to server-side Whisper when Web
 * Speech is unavailable or blocked.
 *
 * Why the fallback exists:
 *   - Brave strips Google's STT API keys → SpeechRecognition fires
 *     `error: "network"` on every start. Same shape in Brave PWAs.
 *   - Firefox doesn't ship SpeechRecognition at all.
 *   - Some Chromium forks similarly block Google services.
 *
 * Once we observe a fatal Web Speech error for a given mount, we latch onto
 * Whisper for the rest of the session — no point retrying a strategy the
 * browser has already told us doesn't work.
 */

interface UseVoiceInputOptions {
  /** Called every time a final phrase resolves. Append to your draft. */
  onFinalText?: (finalText: string) => void;
  /** Called with interim transcript while the user is mid-sentence.
   *  Whisper path has no streaming interim — this only fires under Web Speech. */
  onInterimText?: (interim: string) => void;
  /** Language tag — "en-US", "hi-IN", "en-IN", etc. */
  lang?: string;
}

interface UseVoiceInputResult {
  supported: boolean;
  isListening: boolean;
  /** True while the Whisper path is waiting on a transcription response.
   *  Always false on the Web Speech path. Use this to disable mic toggles
   *  while a request is in flight (otherwise the user can stack recordings
   *  whose results race). */
  isTranscribing: boolean;
  interim: string;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  error: string | null;
}

// Web Speech error codes that signal the strategy is unusable, not just
// that this particular utterance failed. We switch to Whisper on these.
const FATAL_WEB_SPEECH_ERRORS = new Set([
  "network",
  "service-not-allowed",
  "language-not-supported",
]);

export function useVoiceInput(
  options: UseVoiceInputOptions = {}
): UseVoiceInputResult {
  const webSpeech = useWebSpeechInput(options);
  const whisper = useWhisperInput(options);

  // Sticky once flipped: prevents oscillation if Web Speech briefly recovers.
  const [forceWhisper, setForceWhisper] = useState(false);

  // Remember whether the user was actively trying to listen when Web Speech
  // failed, so we can transparently restart on the Whisper side.
  const wantedListeningRef = useRef(false);

  // Latch onto Whisper when Web Speech reports a fatal error.
  useEffect(() => {
    if (forceWhisper) return;
    if (!webSpeech.error) return;
    if (FATAL_WEB_SPEECH_ERRORS.has(webSpeech.error)) {
      setForceWhisper(true);
      if (wantedListeningRef.current) {
        // Re-dispatch the user's "I want to be listening" through Whisper.
        whisper.start();
      }
    }
  }, [forceWhisper, webSpeech.error, whisper]);

  const useWhisper = forceWhisper || !webSpeech.supported;
  const active = useWhisper ? whisper : webSpeech;

  const start = useCallback(() => {
    wantedListeningRef.current = true;
    active.start();
  }, [active]);

  const stop = useCallback(() => {
    wantedListeningRef.current = false;
    active.stop();
  }, [active]);

  const toggle = useCallback(() => {
    if (active.isListening) stop();
    else start();
  }, [active.isListening, start, stop]);

  // Suppress the Web Speech "network" / "service-not-allowed" error from the
  // caller's view — it's transient noise during the fallback handover. Real
  // errors from the active strategy still surface.
  const visibleError = useWhisper
    ? whisper.error
    : webSpeech.error && FATAL_WEB_SPEECH_ERRORS.has(webSpeech.error)
      ? null
      : webSpeech.error;

  return {
    supported: webSpeech.supported || whisper.supported,
    isListening: active.isListening,
    isTranscribing: active.isTranscribing,
    interim: active.interim,
    error: visibleError,
    start,
    stop,
    toggle,
  };
}
