"use client";

import { useEffect, useRef } from "react";

interface VoiceOrbProps {
  /** Inbound audio (Acharya). Primary driver of the visualizer. */
  remoteStream: MediaStream | null;
  /** Outbound audio (user mic). Optional — the orb also breathes when the
   *  user is speaking, so it feels alive on both sides. */
  localStream?: MediaStream | null;
  /** Overall canvas size in CSS pixels. */
  size?: number;
}

/** ChatGPT/Perplexity-style circular voice visualizer.
 *
 *  Draws N radial bars arranged around a ring. Each bar's length is driven
 *  by a frequency bin from the loudest available audio source, smoothed
 *  over time. Falls back to an ambient sine wave when silent so the orb
 *  is never fully static — there's always a quiet breathe.
 *
 *  Renders on a DPR-aware <canvas>. One requestAnimationFrame loop.
 */
export function VoiceOrb({
  remoteStream,
  localStream,
  size = 320,
}: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // High-DPI canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const AudioCtx =
      window.AudioContext ||
      (
        window as unknown as { webkitAudioContext?: typeof AudioContext }
      ).webkitAudioContext;
    if (!AudioCtx) return;

    const audioCtx = new AudioCtx();
    const analysers: AnalyserNode[] = [];
    if (remoteStream) analysers.push(makeAnalyser(audioCtx, remoteStream));
    if (localStream) analysers.push(makeAnalyser(audioCtx, localStream));

    const NUM_BARS = 96;
    const cx = size / 2;
    const cy = size / 2;
    const ringRadius = size * 0.33;
    const maxBarHalf = size * 0.12; // max extension on each side of the ring

    const smoothed = new Array<number>(NUM_BARS).fill(0);
    const startTs = performance.now();

    const tick = () => {
      ctx.clearRect(0, 0, size, size);

      // Merge frequency data across analysers, taking max per bin.
      const merged = new Array<number>(NUM_BARS).fill(0);
      for (const a of analysers) {
        const bufLen = a.frequencyBinCount;
        const buf = new Uint8Array(bufLen);
        a.getByteFrequencyData(buf);
        // Sample NUM_BARS bins from the lower 60% of the spectrum — more
        // perceptible energy lives there for speech.
        const usable = Math.floor(bufLen * 0.6);
        const step = Math.max(1, Math.floor(usable / NUM_BARS));
        for (let i = 0; i < NUM_BARS; i++) {
          const v = buf[i * step] ?? 0;
          if (v > merged[i]) merged[i] = v;
        }
      }

      const t = (performance.now() - startTs) / 1000;

      for (let i = 0; i < NUM_BARS; i++) {
        // Ambient pulse — gentle sine offset per-bar so the ring breathes
        // even in silence. Phase varies by index for an organic look.
        const ambient = 22 + Math.sin(t * 1.1 + i * 0.18) * 10;
        const target = Math.max(merged[i], ambient);
        smoothed[i] = smoothed[i] * 0.78 + target * 0.22;

        const norm = Math.min(1, smoothed[i] / 200); // 0..1, slight saturation
        const halfLen = maxBarHalf * (0.18 + norm * 0.82);

        const angle = (i / NUM_BARS) * Math.PI * 2 - Math.PI / 2;
        const ux = Math.cos(angle);
        const uy = Math.sin(angle);

        // Bars centered on the ring — extend inward and outward by halfLen.
        const x1 = cx + ux * (ringRadius - halfLen);
        const y1 = cy + uy * (ringRadius - halfLen);
        const x2 = cx + ux * (ringRadius + halfLen);
        const y2 = cy + uy * (ringRadius + halfLen);

        // Color: cool blue, brighter and more glow as the bar gets taller.
        const alpha = 0.55 + norm * 0.45;
        ctx.strokeStyle = `rgba(120, 180, 255, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 1.8;
        ctx.lineCap = "round";
        ctx.shadowColor = "rgba(120, 180, 255, 0.55)";
        ctx.shadowBlur = 8 + norm * 10;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      analysers.forEach((a) => a.disconnect());
      audioCtx.close().catch(() => undefined);
    };
  }, [remoteStream, localStream, size]);

  return <canvas ref={canvasRef} className="block" />;
}

function makeAnalyser(ctx: AudioContext, stream: MediaStream) {
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.7;
  src.connect(analyser);
  return analyser;
}
