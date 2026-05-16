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
  sm: 36,
  md: 96,
  lg: 220,
};

const OUTER_PETALS = 12;
const MIDDLE_PETALS = 8;
const INNER_PETALS = 6;

const OUTER_CYCLE_MS = 2400;
const MIDDLE_CYCLE_MS = 2000;
const INNER_CYCLE_MS = 1600;

const OUTER_STAGGER_MS = 140;
const MIDDLE_STAGGER_MS = 180;
const INNER_STAGGER_MS = 200;

/**
 * The Sadhana loader — a layered lotus mandala.
 *
 * Three concentric strands of petals (12 saffron outer, 8 gold middle,
 * 6 sage inner) each on their own bloom cycle, staggered, and each ring
 * also slowly rotates — outer CW, middle CCW, inner CW — so the whole
 * thing moves like an opening flower turning in still water. A bindu
 * breathes at the centre, a dashed gold halo circumscribes the outer
 * petals.
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
          {/* Hairline halo just outside the outer petal radius. Static,
              gives the eye a contour to fall back to. */}
          <circle
            cx="50"
            cy="50"
            r="47"
            fill="none"
            stroke="var(--gold)"
            strokeWidth="0.35"
            strokeOpacity="0.4"
            strokeDasharray="0.6 2.4"
          />

          {/* Outer strand — 12 long saffron petals, CW slow rotation */}
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
                  d="M 50 6 C 42 14 43 38 50 40 C 57 38 58 14 50 6 Z"
                  fill="var(--saffron)"
                  stroke="var(--gold)"
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
                  d="M 50 18 C 44 24 45 38 50 39 C 55 38 56 24 50 18 Z"
                  fill="var(--gold)"
                  stroke="var(--saffron)"
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
                  fill="var(--sage)"
                  opacity="0.85"
                />
              </g>
            ))}
          </g>

          {/* Bindu — saffron halo, ivory core, slow breath */}
          <circle
            cx="50"
            cy="50"
            r="5.5"
            fill="var(--saffron)"
            className="sadhana-loader-bindu"
          />
          <circle
            cx="50"
            cy="50"
            r="2.2"
            fill="var(--ivory)"
            className="sadhana-loader-bindu-core"
          />
        </svg>
      )}

      {caption && !isMicro && (
        <span className="font-lyric-italic text-earth-mid text-base">
          {caption}
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

        /* xs variant — single pulsing saffron dot, no mandala. */
        .sadhana-loader-microbindu {
          background: var(--saffron);
          animation: sadhana-micro-pulse 1.4s ease-in-out infinite;
        }
        @keyframes sadhana-micro-pulse {
          0%, 100% { opacity: 0.5; transform: scale(0.85); }
          50%      { opacity: 1;   transform: scale(1);    }
        }
      `}</style>
    </div>
  );

  if (!fullScreen) return body;
  return (
    <div className="min-h-[calc(100vh-8rem)] w-full flex items-center justify-center">
      {body}
    </div>
  );
}
