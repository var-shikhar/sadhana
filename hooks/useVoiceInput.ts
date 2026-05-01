"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Voice-to-text via the Web Speech API. Free, on-device, no API call.
 * Supported on Chrome / Edge / Safari (incl. mobile). Falls back gracefully
 * on Firefox (where the API isn't implemented) — `supported` will be false.
 *
 * For higher accuracy or non-supported browsers, we'd swap this for OpenAI
 * Whisper (~$0.006/min). Hook signature stays the same.
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

interface UseVoiceInputOptions {
  /** Called every time a final phrase resolves. Append to your draft. */
  onFinalText?: (finalText: string) => void;
  /** Called with interim transcript while the user is mid-sentence. */
  onInterimText?: (interim: string) => void;
  /** Language tag — "en-US", "hi-IN", "en-IN", etc. */
  lang?: string;
}

interface UseVoiceInputResult {
  supported: boolean;
  isListening: boolean;
  interim: string;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  error: string | null;
}

export function useVoiceInput(
  options: UseVoiceInputOptions = {}
): UseVoiceInputResult {
  const { onFinalText, onInterimText, lang = "en-US" } = options;

  const [supported, setSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

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
        onInterimText?.(interimText);
      }
      if (finalText) {
        setInterim("");
        onFinalText?.(finalText.trim());
      }
    };
    r.onerror = (e) => {
      // 'no-speech', 'aborted', 'not-allowed', 'audio-capture'…
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
  }, [lang, onFinalText, onInterimText]);

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
