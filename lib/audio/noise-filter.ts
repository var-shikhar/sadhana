"use client";

// Browser-side noise suppression via RNNoise (WebAssembly + AudioWorklet).
//
// GENERIC plug-in: this module knows nothing about Counsel, voice mode,
// CallScreen, or any specific feature. Public API:
//
//   const filter = await attachNoiseFilter(rawMicStream);
//   // ... use filter.outputStream wherever you'd have used rawMicStream
//   filter.dispose();
//
// Any component with a mic MediaStream can drop this in.
//
// Failure modes (WASM 404, AudioWorklet unsupported, decode error, etc.)
// return the ORIGINAL stream unchanged — the caller keeps working, just
// without our extra noise filter. A console warning surfaces the reason.

import {
  loadRnnoise,
  RnnoiseWorkletNode,
} from "@sapphi-red/web-noise-suppressor";

const WORKLET_URL = "/audio-worklets/rnnoise-worklet.js";
const WASM_URL = "/audio-worklets/rnnoise.wasm";
const WASM_SIMD_URL = "/audio-worklets/rnnoise_simd.wasm";

const FILTER_ENABLED =
  (process.env.NEXT_PUBLIC_VOICE_NOISE_FILTER || "on").toLowerCase() !== "off";

export interface NoiseFilterHandle {
  /** The stream to use downstream (e.g. RTCPeerConnection.addTrack). */
  outputStream: MediaStream;
  /** Whether the filter is actually active (vs passing the raw stream). */
  active: boolean;
  /** Tear everything down. Idempotent. */
  dispose: () => void;
}

/** Wrap a raw mic MediaStream with an RNNoise filter. If anything goes
 *  wrong (env-disabled, unsupported browser, WASM fetch fails, etc.),
 *  the caller still gets a usable stream — just the raw one. */
export async function attachNoiseFilter(
  rawStream: MediaStream
): Promise<NoiseFilterHandle> {
  if (!FILTER_ENABLED) {
    return passthrough(rawStream, "disabled-by-env");
  }

  if (typeof window === "undefined") {
    return passthrough(rawStream, "no-window");
  }

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) {
    return passthrough(rawStream, "no-audiocontext");
  }

  let ctx: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let rnnoise: RnnoiseWorkletNode | null = null;
  let destination: MediaStreamAudioDestinationNode | null = null;
  let disposed = false;

  try {
    // RNNoise expects 48 kHz audio. Force the context to match so the
    // browser handles any resampling on the input edge for us.
    ctx = new AudioCtx({ sampleRate: 48000 });

    // Fetch the WASM (the helper auto-selects SIMD if the browser supports
    // it) and register the AudioWorklet processor.
    const wasmBinary = await loadRnnoise({
      url: WASM_URL,
      simdUrl: WASM_SIMD_URL,
    });
    await ctx.audioWorklet.addModule(WORKLET_URL);

    source = ctx.createMediaStreamSource(rawStream);
    rnnoise = new RnnoiseWorkletNode(ctx, { wasmBinary, maxChannels: 1 });
    destination = ctx.createMediaStreamDestination();

    source.connect(rnnoise);
    rnnoise.connect(destination);

    const outputStream = destination.stream;

    return {
      outputStream,
      active: true,
      dispose: () => {
        if (disposed) return;
        disposed = true;
        try {
          source?.disconnect();
        } catch {
          // ignore
        }
        try {
          rnnoise?.destroy();
          rnnoise?.disconnect();
        } catch {
          // ignore
        }
        try {
          destination?.disconnect();
        } catch {
          // ignore
        }
        ctx?.close().catch(() => undefined);
      },
    };
  } catch (e) {
    console.warn("[noise-filter] setup failed, falling back to raw mic:", e);
    try {
      source?.disconnect();
    } catch {
      // ignore
    }
    try {
      rnnoise?.disconnect();
    } catch {
      // ignore
    }
    try {
      destination?.disconnect();
    } catch {
      // ignore
    }
    await ctx?.close().catch(() => undefined);
    return passthrough(rawStream, "init-failed");
  }
}

function passthrough(
  stream: MediaStream,
  reason: string
): NoiseFilterHandle {
  console.info(
    `[noise-filter] using raw mic (no RNNoise) — reason: ${reason}`
  );
  return {
    outputStream: stream,
    active: false,
    dispose: () => {
      // Nothing owned — caller still stops the original tracks.
    },
  };
}
