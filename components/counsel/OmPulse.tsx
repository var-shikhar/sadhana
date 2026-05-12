"use client";

import { useEffect, useRef } from "react";
import { OmGlyph } from "@/components/gurukul/OmGlyph";

interface OmPulseProps {
  /** Inbound audio (Acharya). The pulse is mostly driven by this. */
  remoteStream: MediaStream | null;
  /** Outbound audio (user mic). Optional — used to also breathe gently when
   *  the user is speaking, so the OM feels alive on both sides. */
  localStream?: MediaStream | null;
  /** Pixel size of the glyph at scale 1.0. */
  size?: number;
}

/** Wraps OmGlyph with a WebAudio AnalyserNode-driven scale-on-volume
 *  pulse. Subtle: 1.0 → 1.08. Smooths over a moving window so the OM
 *  breathes rather than jitters. Falls back to a slow ambient breathe
 *  when there's no audio. */
export function OmPulse({
  remoteStream,
  localStream,
  size = 200,
}: OmPulseProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    const AudioCtx =
      window.AudioContext ||
      (
        window as unknown as {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const remoteAnalyser = remoteStream
      ? makeAnalyser(ctx, remoteStream)
      : null;
    const localAnalyser = localStream ? makeAnalyser(ctx, localStream) : null;

    let smoothed = 0;
    const startTs = performance.now();

    const tick = () => {
      const remoteVol = remoteAnalyser ? rms(remoteAnalyser) : 0;
      const localVol = localAnalyser ? rms(localAnalyser) : 0;
      // Bias toward whichever side is louder so the OM tracks the speaker.
      const target = Math.max(remoteVol, localVol);
      // Ambient breathe when silent: gentle sin wave 0..0.05.
      const t = (performance.now() - startTs) / 1000;
      const ambient = 0.025 + 0.025 * Math.sin(t * 0.9);
      const raw = Math.max(target * 0.8, ambient);
      // Smoothing: exponential moving average.
      smoothed = smoothed * 0.82 + raw * 0.18;
      // Map 0..0.8 audio volume to 1.0..1.08 scale.
      const scale = 1 + Math.min(0.08, smoothed * 0.1);
      wrap.style.setProperty("--om-scale", scale.toFixed(4));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      remoteAnalyser?.disconnect();
      localAnalyser?.disconnect();
      ctx.close().catch(() => undefined);
    };
  }, [remoteStream, localStream]);

  return (
    <div
      ref={wrapRef}
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        transform: "scale(var(--om-scale, 1))",
        transformOrigin: "center",
        transition: "transform 60ms linear",
      }}
    >
      <OmGlyph size={size} tone="saffron" />
    </div>
  );
}

function makeAnalyser(ctx: AudioContext, stream: MediaStream) {
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.6;
  src.connect(analyser);
  return analyser;
}

function rms(analyser: AnalyserNode): number {
  const buf = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / buf.length);
}
