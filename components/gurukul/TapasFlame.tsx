"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TapasFlameProps {
  /** 0..1 — how bright the flame is. Below 0.25 it's a low ember; 1 = full flame. */
  brightness?: number;
  /** Width in px. The component preserves the 2:3 aspect of a flame. */
  size?: number;
  className?: string;
  /**
   * If true, uses the WebM video asset at /assets/flame.webm.
   * Falls back to the SVG flame if the file is missing or fails to load.
   * Auto-pauses on prefers-reduced-motion.
   */
  preferVideo?: boolean;
}

/**
 * The tapas flame — a layered, hand-tuned SVG (variant #4 "Living Altar").
 * When a /assets/flame.webm exists, it is used in place of the SVG. The
 * component negotiates the swap on mount and falls back gracefully.
 */
export function TapasFlame({
  brightness = 1,
  size = 80,
  className,
  preferVideo = true,
}: TapasFlameProps) {
  const [useVideo, setUseVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Probe for the WebM asset on mount; only swap if it exists.
  useEffect(() => {
    if (!preferVideo) return;
    let cancelled = false;
    fetch("/assets/flame.webm", { method: "HEAD" })
      .then((r) => {
        if (!cancelled && r.ok) setUseVideo(true);
      })
      .catch(() => {
        // No-op — we keep the SVG fallback
      });
    return () => {
      cancelled = true;
    };
  }, [preferVideo]);

  // Pause the video on reduced-motion preference
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (reducedMotion) v.pause();
    else void v.play().catch(() => undefined);
  }, [reducedMotion, useVideo]);

  // Brightness drives a CSS opacity + a mild filter saturation; the flame
  // never goes to zero — even at brightness 0 we keep a faint ember.
  const flameOpacity = Math.max(0.35, Math.min(1, brightness));
  const saturation = Math.max(0.6, Math.min(1.2, brightness * 1.1 + 0.4));

  const aspectStyle = {
    width: size,
    height: Math.round(size * 1.5),
  };

  if (useVideo) {
    return (
      <div
        aria-hidden="true"
        className={cn("relative inline-block", className)}
        style={{
          ...aspectStyle,
          opacity: flameOpacity,
          filter: `saturate(${saturation})`,
        }}
      >
        <video
          ref={videoRef}
          src="/assets/flame.webm"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="w-full h-full object-contain"
          onError={() => setUseVideo(false)}
        />
      </div>
    );
  }

  return (
    <FlameSVG
      size={size}
      brightness={brightness}
      reducedMotion={reducedMotion}
      className={className}
      style={{
        opacity: flameOpacity,
        filter: `saturate(${saturation})`,
      }}
    />
  );
}

interface FlameSVGProps {
  size: number;
  brightness: number;
  reducedMotion: boolean;
  className?: string;
  style?: React.CSSProperties;
}

function FlameSVG({ size, reducedMotion, className, style }: FlameSVGProps) {
  const w = size;
  const h = Math.round(size * 1.5);
  const animsuffix = reducedMotion ? "none" : undefined;

  return (
    <div
      aria-hidden="true"
      className={cn("relative inline-block", className)}
      style={{ width: w, height: h, ...style }}
    >
      {/* Rising sparks — only when motion is allowed */}
      {!reducedMotion && (
        <>
          <div className="flame-spark flame-spark-a" />
          <div className="flame-spark flame-spark-b" />
          <div className="flame-spark flame-spark-c" />
          <div className="flame-spark flame-spark-d" />
        </>
      )}

      <svg
        width={w}
        height={h}
        viewBox="0 0 80 120"
        style={{ position: "relative", display: "block" }}
      >
        <defs>
          <radialGradient id="tapas-outer" cx="50%" cy="70%" r="60%">
            <stop offset="0%" stopColor="#ffe4b3" />
            <stop offset="35%" stopColor="#f29a3a" />
            <stop offset="75%" stopColor="#c46a1f" />
            <stop offset="100%" stopColor="#7a3a0e" stopOpacity="0.5" />
          </radialGradient>
          <radialGradient id="tapas-core" cx="50%" cy="65%" r="50%">
            <stop offset="0%" stopColor="#fffaf0" />
            <stop offset="50%" stopColor="#ffd9a3" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffd9a3" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="tapas-glow" cx="50%" cy="70%" r="80%">
            <stop offset="0%" stopColor="#ffd9a3" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffd9a3" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* halo */}
        <circle cx="40" cy="65" r="46" fill="url(#tapas-glow)" />

        {/* outer flame (sway + flicker) */}
        <g
          style={{
            transformOrigin: "40px 110px",
            animation: animsuffix
              ? "none"
              : "tapas-sway 3.5s ease-in-out infinite, tapas-flicker 2.5s ease-in-out infinite",
          }}
        >
          <path
            d="M 40 113
               C 18 108, 14 80, 22 60
               C 28 46, 36 40, 38 26
               C 39 18, 36 12, 42 4
               C 46 14, 50 22, 54 32
               C 60 50, 68 70, 64 92
               C 60 106, 52 113, 40 113 Z"
            fill="url(#tapas-outer)"
          />
        </g>

        {/* inner core (stronger flicker) */}
        <g
          style={{
            transformOrigin: "40px 108px",
            animation: animsuffix
              ? "none"
              : "tapas-flicker-strong 2.0s ease-in-out infinite",
          }}
        >
          <path
            d="M 40 108
               C 30 104, 28 86, 32 70
               C 36 56, 42 46, 42 32
               C 44 26, 42 20, 44 12
               C 47 22, 50 36, 50 48
               C 52 68, 54 90, 48 102
               C 46 106, 42 108, 40 108 Z"
            fill="url(#tapas-core)"
          />
        </g>

        {/* white-hot pulsing core */}
        <ellipse
          cx="42"
          cy="76"
          rx="3.5"
          ry="9"
          fill="#fffaf0"
          opacity="0.85"
          style={{
            animation: animsuffix
              ? "none"
              : "tapas-core-pulse 1.4s ease-in-out infinite",
          }}
        />

        {/* terracotta diya */}
        <ellipse cx="40" cy="115" rx="22" ry="2.5" fill="#1a1208" opacity="0.4" />
        <path
          d="M 16 115 Q 40 123 64 115 L 64 119 Q 40 127 16 119 Z"
          fill="#5c2e0e"
        />
        <path
          d="M 18 116 Q 40 120 62 116"
          fill="none"
          stroke="#d4a259"
          strokeWidth="0.8"
          opacity="0.8"
        />
      </svg>

      <style>{`
        @keyframes tapas-flicker {
          0%, 100% { transform: scale(1, 1); opacity: 0.92; }
          25% { transform: scale(1.04, 0.97); opacity: 1; }
          50% { transform: scale(0.97, 1.03); opacity: 0.9; }
          75% { transform: scale(1.02, 1); opacity: 0.96; }
        }
        @keyframes tapas-flicker-strong {
          0%, 100% { transform: scale(1, 1) rotate(-1deg); opacity: 0.92; }
          20% { transform: scale(1.06, 0.96) rotate(1deg); opacity: 1; }
          40% { transform: scale(0.96, 1.04) rotate(-0.5deg); opacity: 0.88; }
          60% { transform: scale(1.04, 0.98) rotate(0.5deg); opacity: 1; }
          80% { transform: scale(0.98, 1.02) rotate(-1deg); opacity: 0.95; }
        }
        @keyframes tapas-sway {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(2px); }
        }
        @keyframes tapas-core-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes tapas-spark-rise {
          0% { transform: translateY(0); opacity: 0; }
          20% { opacity: 0.85; }
          100% { transform: translateY(-32px); opacity: 0; }
        }
        .flame-spark {
          position: absolute;
          left: 50%;
          top: 60%;
          width: 2px;
          height: 2px;
          border-radius: 50%;
          background: #ffd9a3;
        }
        .flame-spark-a { animation: tapas-spark-rise 3s ease-out infinite; transform: translateX(-4px); }
        .flame-spark-b { animation: tapas-spark-rise 3.6s ease-out infinite 1s; background: #ffe4b3; transform: translateX(2px); }
        .flame-spark-c { animation: tapas-spark-rise 4.0s ease-out infinite 2s; background: #c46a1f; transform: translateX(-1px); }
        .flame-spark-d { animation: tapas-spark-rise 3.2s ease-out infinite 1.6s; transform: translateX(5px); }
      `}</style>
    </div>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}
