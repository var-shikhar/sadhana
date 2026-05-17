"use client";

import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

export type LoaderSize = "xs" | "sm" | "md" | "lg";

interface LoaderProps {
  size?: LoaderSize;
  /** Lyric-italic line under the lotus. Ignored for size="xs". */
  caption?: string;
  className?: string;
  /** Centers the loader in the available viewport (accounting for bottom nav). */
  fullScreen?: boolean;
}

const SIZE_PX: Record<LoaderSize, number> = {
  xs: 14,
  sm: 40,
  md: 112,
  lg: 260,
};

const RIM_PETALS = 16;
const OUTER_PETALS = 12;
const MIDDLE_PETALS = 8;
const INNER_PETALS = 6;

const RIM_CYCLE_MS = 2800;
const OUTER_CYCLE_MS = 2400;
const MIDDLE_CYCLE_MS = 2000;
const INNER_CYCLE_MS = 1600;

const RIM_STAGGER_MS = 120;
const OUTER_STAGGER_MS = 140;
const MIDDLE_STAGGER_MS = 180;
const INNER_STAGGER_MS = 200;

/**
 * The Sadhana loader — a layered lotus mandala.
 *
 * Four concentric strands of petals (16 slender rim filaments, 12 outer,
 * 8 middle, 6 inner) each on their own bloom cycle, staggered, and each
 * ring also slowly rotates — rim CCW, outer CW, middle CCW, inner CW —
 * so the whole thing moves like an opening flower turning in still water.
 * A bindu breathes at the centre, a dashed halo sits just inside the
 * outermost rim.
 *
 * `xs` is reserved for inline-in-button use; it drops the mandala for
 * a single pulsing bindu so it stays legible at 14px.
 *
 * Colors come from CSS variables (`--saffron`, `--gold`, `--sage`,
 * `--ivory`) so the loader adapts to gurukul / restraint / focus
 * palettes with no per-palette branch. Reduced-motion is handled by
 * the global `prefers-reduced-motion` rule in `app/globals.css`.
 */
export function Loader({
  size = "md",
  caption,
  className,
  fullScreen = false,
}: LoaderProps) {
  const box = SIZE_PX[size];
  const isMicro = size === "xs";

  const body = (
    <div
      className={cn(
        "inline-flex flex-col items-center gap-3.5",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {isMicro ? (
        <span
          aria-hidden="true"
          className="sadhana-loader-microbindu inline-block rounded-full"
          style={{ width: box, height: box }}
        />
      ) : (
        <svg
          aria-hidden="true"
          width={box}
          height={box}
          viewBox="0 0 100 100"
          className="overflow-visible"
        >
          {/* Hairline halo just inside the rim filaments. Static, gives
              the eye a contour to fall back to. */}
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="var(--loader-halo)"
            strokeWidth="0.35"
            strokeOpacity="0.4"
            strokeDasharray="0.6 2.4"
          />

          {/* Rim strand — 16 slender filaments reaching to the edge, CCW
              slow rotation. Forms the outermost halo of light around the
              lotus body. */}
          <g className="sadhana-loader-strand sadhana-loader-strand--rim">
            {Array.from({ length: RIM_PETALS }).map((_, i) => (
              <g
                key={`rim-${i}`}
                className="sadhana-loader-petal sadhana-loader-petal--rim"
                style={
                  {
                    "--rot": `${(i * 360) / RIM_PETALS}deg`,
                    "--delay": `${i * RIM_STAGGER_MS}ms`,
                  } as CSSProperties
                }
              >
                <path
                  d="M 50 1 C 48.5 8 48.8 26 50 27 C 51.2 26 51.5 8 50 1 Z"
                  fill="var(--loader-petal-outer)"
                  opacity="0.85"
                />
              </g>
            ))}
          </g>

          {/* Outer strand — 12 long petals, CW slow rotation */}
          <g className="sadhana-loader-strand sadhana-loader-strand--outer">
            {Array.from({ length: OUTER_PETALS }).map((_, i) => (
              <g
                key={`outer-${i}`}
                className="sadhana-loader-petal sadhana-loader-petal--outer"
                style={
                  {
                    "--rot": `${(i * 360) / OUTER_PETALS}deg`,
                    "--delay": `${i * OUTER_STAGGER_MS}ms`,
                  } as CSSProperties
                }
              >
                <path
                  d="M 50 4 C 41 12 42 39 50 41 C 58 39 59 12 50 4 Z"
                  fill="var(--loader-petal-outer)"
                  stroke="var(--loader-petal-outer-stroke)"
                  strokeWidth="0.4"
                  strokeOpacity="0.7"
                />
              </g>
            ))}
          </g>

          {/* Middle strand — 8 gold petals, CCW slower rotation, offset 22.5° */}
          <g className="sadhana-loader-strand sadhana-loader-strand--middle">
            {Array.from({ length: MIDDLE_PETALS }).map((_, i) => (
              <g
                key={`middle-${i}`}
                className="sadhana-loader-petal sadhana-loader-petal--middle"
                style={
                  {
                    "--rot": `${(i * 360) / MIDDLE_PETALS + 22.5}deg`,
                    "--delay": `${i * MIDDLE_STAGGER_MS}ms`,
                  } as CSSProperties
                }
              >
                <path
                  d="M 50 15 C 43 22 44 39 50 40 C 56 39 57 22 50 15 Z"
                  fill="var(--loader-petal-middle)"
                  stroke="var(--loader-petal-outer)"
                  strokeWidth="0.3"
                  strokeOpacity="0.45"
                />
              </g>
            ))}
          </g>

          {/* Inner strand — 6 sage petals, CW faster rotation, offset 30° */}
          <g className="sadhana-loader-strand sadhana-loader-strand--inner">
            {Array.from({ length: INNER_PETALS }).map((_, i) => (
              <g
                key={`inner-${i}`}
                className="sadhana-loader-petal sadhana-loader-petal--inner"
                style={
                  {
                    "--rot": `${(i * 360) / INNER_PETALS + 30}deg`,
                    "--delay": `${i * INNER_STAGGER_MS}ms`,
                  } as CSSProperties
                }
              >
                <path
                  d="M 50 30 C 46 34 47 41 50 42 C 53 41 54 34 50 30 Z"
                  fill="var(--loader-petal-inner)"
                  opacity="0.85"
                />
              </g>
            ))}
          </g>

          {/* Bindu — bright halo, contrasting core, slow breath */}
          <circle
            cx="50"
            cy="50"
            r="5.5"
            fill="var(--loader-bindu)"
            className="sadhana-loader-bindu"
          />
          <circle
            cx="50"
            cy="50"
            r="2.2"
            fill="var(--loader-bindu-core)"
            className="sadhana-loader-bindu-core"
          />
        </svg>
      )}

      {caption && !isMicro && (
        <span
          key={caption}
          className="sadhana-loader-caption-wrap relative inline-block"
          aria-label={caption}
        >
          <span className="sadhana-loader-caption font-lyric-italic text-base inline-block">
            {Array.from(caption).map((ch, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="sadhana-loader-caption-letter inline-block"
                style={{ animationDelay: `${i * 35}ms` }}
              >
                {ch === " " ? " " : ch}
              </span>
            ))}
          </span>
          <span
            aria-hidden="true"
            className="sadhana-loader-caption-rule absolute left-0 right-0"
          />
        </span>
      )}
      <span className="sr-only">{caption ?? "Loading"}</span>

      <style>{`
        /* Ring-level slow rotations. Each strand turns at a different
           pace and direction. */
        .sadhana-loader-strand {
          transform-origin: 50px 50px;
          transform-box: view-box;
        }
        .sadhana-loader-strand--rim    { animation: sadhana-ring-ccw 44s linear infinite; }
        .sadhana-loader-strand--outer  { animation: sadhana-ring-cw  28s linear infinite; }
        .sadhana-loader-strand--middle { animation: sadhana-ring-ccw 36s linear infinite; }
        .sadhana-loader-strand--inner  { animation: sadhana-ring-cw  18s linear infinite; }
        @keyframes sadhana-ring-cw  { to { transform: rotate(360deg); } }
        @keyframes sadhana-ring-ccw { to { transform: rotate(-360deg); } }

        /* Per-petal bloom — each petal at its --rot position cycles
           through scale-up + fade-in → hold → fade-out. */
        .sadhana-loader-petal {
          transform-origin: 50px 50px;
          transform-box: view-box;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-delay: var(--delay);
        }
        .sadhana-loader-petal--rim {
          animation-name: sadhana-petal-rim;
          animation-duration: ${RIM_CYCLE_MS}ms;
        }
        .sadhana-loader-petal--outer {
          animation-name: sadhana-petal-outer;
          animation-duration: ${OUTER_CYCLE_MS}ms;
        }
        .sadhana-loader-petal--middle {
          animation-name: sadhana-petal-middle;
          animation-duration: ${MIDDLE_CYCLE_MS}ms;
        }
        .sadhana-loader-petal--inner {
          animation-name: sadhana-petal-inner;
          animation-duration: ${INNER_CYCLE_MS}ms;
        }
        @keyframes sadhana-petal-rim {
          0%, 100% { transform: rotate(var(--rot)) scaleY(0.3); opacity: 0; }
          18%      { transform: rotate(var(--rot)) scaleY(1);   opacity: 0.85; }
          70%      { transform: rotate(var(--rot)) scaleY(1);   opacity: 0.85; }
          90%      { transform: rotate(var(--rot)) scaleY(0.6); opacity: 0.1; }
        }
        @keyframes sadhana-petal-outer {
          0%, 100% { transform: rotate(var(--rot)) scale(0.45); opacity: 0; }
          22%      { transform: rotate(var(--rot)) scale(1);    opacity: 1; }
          68%      { transform: rotate(var(--rot)) scale(1);    opacity: 1; }
          88%      { transform: rotate(var(--rot)) scale(0.7);  opacity: 0.15; }
        }
        @keyframes sadhana-petal-middle {
          0%, 100% { transform: rotate(var(--rot)) scale(0.5);  opacity: 0; }
          25%      { transform: rotate(var(--rot)) scale(1);    opacity: 0.9; }
          70%      { transform: rotate(var(--rot)) scale(1);    opacity: 0.9; }
        }
        @keyframes sadhana-petal-inner {
          0%, 100% { transform: rotate(var(--rot)) scale(0.6);  opacity: 0; }
          30%      { transform: rotate(var(--rot)) scale(1);    opacity: 0.85; }
          70%      { transform: rotate(var(--rot)) scale(1);    opacity: 0.85; }
        }

        /* Bindu breath. Halo and core breathe with a slight delay between
           them so the centre feels like it's exhaling outward. */
        .sadhana-loader-bindu,
        .sadhana-loader-bindu-core {
          transform-origin: 50px 50px;
          transform-box: view-box;
          animation: sadhana-bindu-pulse 2.6s ease-in-out infinite;
        }
        .sadhana-loader-bindu-core {
          animation-delay: 250ms;
        }
        @keyframes sadhana-bindu-pulse {
          0%, 100% { transform: scale(0.85); opacity: 0.7; }
          50%      { transform: scale(1.1);  opacity: 1;   }
        }

        /* xs variant — single pulsing bindu dot, no mandala. */
        .sadhana-loader-microbindu {
          background: var(--loader-bindu);
          animation: sadhana-micro-pulse 1.4s ease-in-out infinite;
        }
        @keyframes sadhana-micro-pulse {
          0%, 100% { opacity: 0.5; transform: scale(0.85); }
          50%      { opacity: 1;   transform: scale(1);    }
        }

        /* Caption — letter-by-letter rise on mount, then a saffron
           underline draws from the left under the text, dwells briefly,
           retracts to the right, and the cycle repeats. The whole
           caption also breathes gently in opacity so the static
           moments still feel alive. */
        .sadhana-loader-caption-wrap {
          animation: sadhana-caption-breath 5.5s ease-in-out infinite;
        }
        .sadhana-loader-caption {
          color: var(--loader-caption-base);
        }
        .sadhana-loader-caption-letter {
          opacity: 0;
          transform: translateY(6px);
          animation: sadhana-caption-letter-in 620ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
        }
        @keyframes sadhana-caption-letter-in {
          0%   { opacity: 0; transform: translateY(6px); }
          60%  { opacity: 1; transform: translateY(-1px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .sadhana-loader-caption-rule {
          bottom: -6px;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            var(--loader-caption-shimmer) 50%,
            transparent 100%
          );
          transform: scaleX(0);
          transform-origin: left center;
          opacity: 0;
          animation: sadhana-caption-rule 3.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          /* Delay until the longest letter-stagger has finished, plus a beat. */
          animation-delay: 1100ms;
        }
        @keyframes sadhana-caption-rule {
          0%   { transform: scaleX(0); transform-origin: left center;  opacity: 0; }
          25%  { transform: scaleX(1); transform-origin: left center;  opacity: 1; }
          55%  { transform: scaleX(1); transform-origin: right center; opacity: 1; }
          80%  { transform: scaleX(0); transform-origin: right center; opacity: 0; }
          100% { transform: scaleX(0); transform-origin: left center;  opacity: 0; }
        }
        @keyframes sadhana-caption-breath {
          0%, 100% { opacity: 0.78; }
          50%      { opacity: 1;    }
        }
      `}</style>
    </div>
  );

  if (!fullScreen) return body;
  // True full-viewport overlay — covers the BottomNav too. Matches the
  // theme-switch overlay used in PaletteToggle: `fixed inset-0 z-[100]`
  // with a translucent palette-bg and a soft backdrop blur.
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-100 flex items-center justify-center backdrop-blur-sm"
      style={{
        background: "color-mix(in oklab, var(--loader-overlay-bg) 92%, transparent)",
      }}
    >
      {body}
    </div>
  );
}
