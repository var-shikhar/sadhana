"use client";

import { useEffect, useState, useCallback } from "react";
import { Folio, type FolioReflection } from "./Folio";
import { FolioFlip } from "./FolioFlip";

interface FolioCarouselProps {
  reflections: FolioReflection[]; // oldest → newest
}

export function FolioCarousel({ reflections }: FolioCarouselProps) {
  const items: (FolioReflection | undefined)[] = [...reflections, undefined];
  const lastReflectionIndex = Math.max(0, items.length - 2);
  const [index, setIndex] = useState(lastReflectionIndex);
  const [flipping, setFlipping] = useState(false);

  const goPrev = useCallback(() => {
    if (index > 0) {
      setFlipping(true);
      setTimeout(() => setIndex((i) => i - 1), 300);
    }
  }, [index]);

  const goNext = useCallback(() => {
    if (index < items.length - 1) {
      setFlipping(true);
      setTimeout(() => setIndex((i) => i + 1), 300);
    }
  }, [index, items.length]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goPrev, goNext]);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX);
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return;
    const dx = e.changedTouches[0].clientX - touchStart;
    if (dx > 60) goPrev();
    else if (dx < -60) goNext();
    setTouchStart(null);
  }

  if (items.length === 0) return null;

  const left = index > 0 ? items[index - 1] : undefined;
  const center = items[index];
  const right = index < items.length - 1 ? items[index + 1] : undefined;

  return (
    <div
      className="flex items-center justify-center gap-2 py-8 select-none"
      style={{ perspective: "1200px" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {left !== undefined ? (
        <Folio reflection={left} position="left" />
      ) : (
        <div className="w-[220px]" />
      )}
      <FolioFlip flipping={flipping} onFlipComplete={() => setFlipping(false)}>
        <Folio
          reflection={center}
          position="focus"
          showSeal={index === 0 && reflections.length > 0}
        />
      </FolioFlip>
      {right !== undefined ? (
        <Folio reflection={right} position="right" />
      ) : (
        <div className="w-[220px]" />
      )}
    </div>
  );
}
