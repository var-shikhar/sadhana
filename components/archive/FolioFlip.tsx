"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface FolioFlipProps {
  flipping: boolean;
  onFlipComplete?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function FolioFlip({ flipping, onFlipComplete, children, className }: FolioFlipProps) {
  const [phase, setPhase] = useState<"idle" | "flipping">("idle");

  useEffect(() => {
    if (flipping && phase === "idle") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("flipping");
      const t = setTimeout(() => {
        setPhase("idle");
        onFlipComplete?.();
      }, 600);
      return () => clearTimeout(t);
    }
  }, [flipping, phase, onFlipComplete]);

  return (
    <div
      className={cn("relative", className)}
      style={{
        perspective: "1000px",
        transformStyle: "preserve-3d",
        animation: phase === "flipping" ? "var(--animate-folio-flip)" : undefined,
      }}
    >
      {children}
    </div>
  );
}
