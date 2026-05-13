"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Voice-to-text via OpenAI Whisper (server-side). Works in any browser that
 * supports MediaRecorder + getUserMedia — including Brave, Firefox, and the
 * Android-Chrome PWA where Web Speech is broken or absent.
 *
 * Flow:
 *   1. start()  → request mic, begin recording, watch volume for end-of-speech
 *   2. silence ≥ SILENCE_MS after some speech → auto-stop
 *   3. blob   → POST /api/transcribe → onFinalText(text)
 *
 * No interim transcript (Whisper isn't streaming); the parent should treat
 * `isListening` as "currently capturing or transcribing".
 */

interface UseWhisperInputOptions {
  onFinalText?: (finalText: string) => void;
  onInterimText?: (interim: string) => void;
  lang?: string;
}

interface UseWhisperInputResult {
  supported: boolean;
  isListening: boolean;
  interim: string;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  error: string | null;
}

// Audio level below this (in dBFS) is treated as silence.
const SILENCE_DB_THRESHOLD = -45;
// Auto-stop after this much continuous silence following detected speech.
const SILENCE_MS = 1500;
// Hard cap so a stuck mic doesn't bill us forever.
const MAX_UTTERANCE_MS = 20_000;

export function useWhisperInput(
  options: UseWhisperInputOptions = {}
): UseWhisperInputResult {
  const { onFinalText, onInterimText, lang = "en-US" } = options;

  // Latest callbacks in refs (same pattern as useWebSpeechInput) so a parent
  // re-render doesn't invalidate our running recording.
  const onFinalRef = useRef(onFinalText);
  const onInterimRef = useRef(onInterimText);
  useEffect(() => {
    onFinalRef.current = onFinalText;
    onInterimRef.current = onInterimText;
  }, [onFinalText, onInterimText]);

  const langRef = useRef(lang);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  const [supported, setSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const monitorIdRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const lastSpeechAtRef = useRef(0);
  const hasSpokenRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof window.MediaRecorder !== "undefined";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(ok);
  }, []);

  const teardown = useCallback(() => {
    if (monitorIdRef.current !== null) {
      window.clearInterval(monitorIdRef.current);
      monitorIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const transcribe = useCallback(async (blob: Blob) => {
    setInterim("transcribing…");
    onInterimRef.current?.("transcribing…");
    try {
      const fd = new FormData();
      fd.append("audio", blob, "audio.webm");
      fd.append("lang", langRef.current);
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `transcribe_failed_${res.status}`);
      }
      const { text } = (await res.json()) as { text: string };
      const trimmed = (text ?? "").trim();
      setInterim("");
      if (trimmed) onFinalRef.current?.(trimmed);
    } catch (e) {
      setInterim("");
      setError(e instanceof Error ? e.message : "transcribe_failed");
    } finally {
      setIsListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    const mr = recorderRef.current;
    if (mr && mr.state !== "inactive") {
      try {
        mr.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  const start = useCallback(async () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") return;
    setError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const code =
        e instanceof Error && e.name === "NotAllowedError"
          ? "not-allowed"
          : "audio-capture";
      setError(code);
      setIsListening(false);
      return;
    }
    streamRef.current = stream;

    // Pick the best mime the browser actually supports.
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    const mime =
      candidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";

    let mr: MediaRecorder;
    try {
      mr = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
    } catch (e) {
      teardown();
      setError(e instanceof Error ? e.message : "recorder_init_failed");
      return;
    }
    recorderRef.current = mr;
    chunksRef.current = [];

    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const type = mr.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      const spoke = hasSpokenRef.current;
      teardown();
      recorderRef.current = null;
      chunksRef.current = [];
      hasSpokenRef.current = false;
      if (blob.size > 0 && spoke) {
        void transcribe(blob);
      } else {
        setInterim("");
        setIsListening(false);
      }
    };
    mr.onerror = () => {
      setError("recorder_error");
      setIsListening(false);
    };

    // Set up the analyser for silence detection.
    const AudioCtxCtor: typeof AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtxCtor();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);
    analyserRef.current = analyser;
    const buf = new Float32Array(analyser.fftSize);

    startedAtRef.current = performance.now();
    lastSpeechAtRef.current = startedAtRef.current;
    hasSpokenRef.current = false;

    monitorIdRef.current = window.setInterval(() => {
      const an = analyserRef.current;
      const rec = recorderRef.current;
      if (!an || !rec || rec.state === "inactive") return;

      an.getFloatTimeDomainData(buf);
      let sumSq = 0;
      for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
      const rms = Math.sqrt(sumSq / buf.length);
      const db = 20 * Math.log10(rms || 1e-9);

      const now = performance.now();
      if (db > SILENCE_DB_THRESHOLD) {
        hasSpokenRef.current = true;
        lastSpeechAtRef.current = now;
      }
      const elapsed = now - startedAtRef.current;
      const silenceFor = now - lastSpeechAtRef.current;

      if (
        (hasSpokenRef.current && silenceFor > SILENCE_MS) ||
        elapsed > MAX_UTTERANCE_MS
      ) {
        stop();
      }
    }, 60);

    try {
      mr.start(250);
      setIsListening(true);
      setInterim("");
    } catch (e) {
      teardown();
      recorderRef.current = null;
      setError(e instanceof Error ? e.message : "recorder_start_failed");
      setIsListening(false);
    }
  }, [stop, teardown, transcribe]);

  const startSync = useCallback(() => {
    void start();
  }, [start]);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else void start();
  }, [isListening, start, stop]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      const mr = recorderRef.current;
      if (mr && mr.state !== "inactive") {
        try {
          mr.stop();
        } catch {
          // ignore
        }
      }
      teardown();
      recorderRef.current = null;
    };
  }, [teardown]);

  return {
    supported,
    isListening,
    interim,
    start: startSync,
    stop,
    toggle,
    error,
  };
}
