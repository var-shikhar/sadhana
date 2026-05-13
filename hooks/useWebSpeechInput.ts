"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Voice-to-text via the browser's Web Speech API.
 *
 * Note: in Chromium browsers this is NOT on-device — the audio is streamed to
 * Google's STT servers. That's why it fails with an `error: "network"` event
 * in Brave (which strips Google's API keys) and in some hardened Chromium
 * forks. Use the dispatcher in [[useVoiceInput]] if you want automatic
 * fallback to Whisper.
 *
 * Supported on Chrome / Edge / Safari (incl. mobile). Firefox doesn't ship
 * SpeechRecognition at all — `supported` will be false there.
 */

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEventLike extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface UseWebSpeechInputOptions {
  onFinalText?: (finalText: string) => void;
  onInterimText?: (interim: string) => void;
  lang?: string;
}

interface UseWebSpeechInputResult {
  supported: boolean;
  isListening: boolean;
  interim: string;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  error: string | null;
}

export function useWebSpeechInput(
  options: UseWebSpeechInputOptions = {}
): UseWebSpeechInputResult {
  const { onFinalText, onInterimText, lang = "en-US" } = options;

  const [supported, setSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Latest callbacks live in refs so the recognition instance is built ONCE,
  // not rebuilt on every parent render. Rebuilding mid-utterance dropped
  // words and broke the affirmation-matching loop.
  const onFinalRef = useRef(onFinalText);
  const onInterimRef = useRef(onInterimText);
  useEffect(() => {
    onFinalRef.current = onFinalText;
    onInterimRef.current = onInterimText;
  }, [onFinalText, onInterimText]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const Ctor =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor })
        .webkitSpeechRecognition;
    if (!Ctor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSupported(false);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(true);
    const r = new Ctor();
    r.continuous = false;
    r.interimResults = true;
    r.lang = lang;

    r.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0]?.transcript ?? "";
        if (res.isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (interimText) {
        setInterim(interimText);
        onInterimRef.current?.(interimText);
      }
      if (finalText) {
        setInterim("");
        onFinalRef.current?.(finalText.trim());
      }
    };
    r.onerror = (e) => {
      // 'no-speech', 'aborted', 'not-allowed', 'audio-capture',
      // 'network' (Brave), 'service-not-allowed'…
      if (e.error !== "aborted") {
        setError(e.error);
      }
      setIsListening(false);
    };
    r.onend = () => {
      setIsListening(false);
      setInterim("");
    };
    r.onstart = () => {
      setError(null);
      setIsListening(true);
    };

    recognitionRef.current = r;

    return () => {
      try {
        r.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
    // Build once per mount. `lang` is applied in-place by the effect below
    // so we don't tear down recognition just to switch languages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply language changes in-place; takes effect on the next start().
  useEffect(() => {
    const r = recognitionRef.current;
    if (r) r.lang = lang;
  }, [lang]);

  const start = useCallback(() => {
    const r = recognitionRef.current;
    if (!r) return;
    try {
      r.start();
    } catch {
      // already started — ignore
    }
  }, []);

  const stop = useCallback(() => {
    const r = recognitionRef.current;
    if (!r) return;
    try {
      r.stop();
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  return { supported, isListening, interim, start, stop, toggle, error };
}
