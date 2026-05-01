"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Text-to-speech via the browser's SpeechSynthesis API. Free, on-device.
 * Voice quality varies by OS — macOS / iOS have notably better voices than
 * Android. For premium narration, we'd swap to OpenAI TTS (`tts-1-hd`,
 * voices: nova / onyx / shimmer / etc.) but that's a paid call per response.
 */

interface UseSpeakOptions {
  /** Preferred voice name fragment (e.g. "Samantha", "Daniel", "Female"). */
  preferredVoiceName?: string;
  /** "en-US", "en-IN", "hi-IN", etc. */
  lang?: string;
  /** 0.5..1.5 — slower for sacred tone, default 0.95 */
  rate?: number;
}

interface UseSpeakResult {
  supported: boolean;
  isSpeaking: boolean;
  speak: (text: string) => void;
  stop: () => void;
  voices: SpeechSynthesisVoice[];
}

export function useSpeak(options: UseSpeakOptions = {}): UseSpeakResult {
  const { preferredVoiceName, lang = "en-US", rate = 0.95 } = options;

  const [supported, setSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSupported(false);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(true);

    function loadVoices() {
      setVoices(window.speechSynthesis.getVoices());
    }
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      // Cancel any ongoing speech first
      window.speechSynthesis.cancel();

      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = lang;
      utt.rate = rate;
      utt.pitch = 1;

      // Pick a voice — prefer named, else first matching lang
      const allVoices = window.speechSynthesis.getVoices();
      let chosen: SpeechSynthesisVoice | undefined;
      if (preferredVoiceName) {
        chosen = allVoices.find((v) =>
          v.name.toLowerCase().includes(preferredVoiceName.toLowerCase())
        );
      }
      if (!chosen) {
        chosen = allVoices.find((v) => v.lang === lang);
      }
      if (chosen) utt.voice = chosen;

      utt.onstart = () => setIsSpeaking(true);
      utt.onend = () => setIsSpeaking(false);
      utt.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utt;
      window.speechSynthesis.speak(utt);
    },
    [lang, preferredVoiceName, rate]
  );

  const stop = useCallback(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { supported, isSpeaking, speak, stop, voices };
}
