"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type BeadState = "filled" | "slip" | "future";

interface MalaBeadProps {
  state: BeadState;
  /** Bead diameter in px */
  size?: number;
  className?: string;
}

/**
 * A single mala bead. When `public/assets/rudraksha-{16|32|64}.webp` is
 * provided, the filled bead renders the image (probed once at module load,
 * cached). Until the asset exists, the bead is a CSS-rendered terracotta
 * sphere that matches the design intent — no 404s in the network log.
 */

const probedSizes = new Map<number, boolean>();

async function probeAsset(assetSize: number): Promise<boolean> {
  if (probedSizes.has(assetSize)) return probedSizes.get(assetSize)!;
  try {
    const res = await fetch(`/assets/rudraksha-${assetSize}.webp`, {
      method: "HEAD",
    });
    const ok = res.ok;
    probedSizes.set(assetSize, ok);
    return ok;
  } catch {
    probedSizes.set(assetSize, false);
    return false;
  }
}

export function MalaBead({ state, size = 16, className }: MalaBeadProps) {
  const assetSize = size <= 20 ? 16 : size <= 48 ? 32 : 64;
  const [hasAsset, setHasAsset] = useState(() => probedSizes.get(assetSize) ?? false);

  useEffect(() => {
    if (probedSizes.has(assetSize)) return;
    probeAsset(assetSize).then(setHasAsset);
  }, [assetSize]);

  if (state === "future") {
    return (
      <span
        aria-hidden="true"
        className={cn("inline-block rounded-full border border-gold/60", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const opacity = state === "slip" ? 0.4 : 1;

  // Default look: a CSS-only terracotta sphere with subtle grain shading.
  const cssBead =
    "radial-gradient(circle at 30% 30%, #b8945c 0%, #8b5a2b 35%, #5c2e0e 75%, #2b1810 100%)";

  const backgroundImage = hasAsset
    ? `url(/assets/rudraksha-${assetSize}.webp)`
    : cssBead;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block rounded-full overflow-hidden",
        !hasAsset && "shadow-[inset_-1px_-1px_2px_rgba(0,0,0,0.35),inset_1px_1px_1px_rgba(255,220,170,0.25)]",
        className
      )}
      style={{
        width: size,
        height: size,
        opacity,
        backgroundImage,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
  );
}
