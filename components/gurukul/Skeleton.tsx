"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  /** Render N stacked shimmer bars (text-line skeleton). Overrides height. */
  lines?: number;
  /** Round the block fully (for avatar / circular bead placeholders). */
  circle?: boolean;
}

/**
 * Parchment-toned shimmer placeholder for sub-page sections that are loading
 * while the rest of the page is already rendered. Use this — not `<Loader>` —
 * for milestone lists, task panels, growth-orbit slots, chart cards, etc.
 *
 * Visual: a parchment block with a saffron shimmer wave sliding across,
 * matching the existing `ThinkingIndicator` shimmer keyframe.
 */
export function Skeleton({ className, lines, circle = false }: SkeletonProps) {
  if (lines && lines > 0) {
    return (
      <div className="space-y-2" aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBlock
            key={i}
            className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")}
          />
        ))}
        <span className="sr-only">Loading</span>
      </div>
    );
  }
  return (
    <SkeletonBlock
      className={cn(circle ? "rounded-full" : "rounded-md", className)}
    />
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      role="presentation"
      className={cn(
        "sadhana-skeleton relative overflow-hidden bg-ivory-deep border border-gold/20",
        className,
      )}
    >
      <div className="sadhana-skeleton-shimmer absolute inset-y-0" />
      <style>{`
        .sadhana-skeleton-shimmer {
          width: 60%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            color-mix(in oklab, var(--saffron) 22%, transparent) 50%,
            transparent 100%
          );
          animation: sadhana-skeleton-shimmer 1.8s ease-in-out infinite;
        }
        @keyframes sadhana-skeleton-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}
