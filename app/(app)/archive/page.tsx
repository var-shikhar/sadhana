"use client";

import { useArchive } from "@/hooks/useArchive";
import { FolioCarousel } from "@/components/archive/FolioCarousel";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { GoldRule } from "@/components/gurukul/GoldRule";
import { PressureLabel } from "@/components/gurukul/PressureLabel";

export default function ArchivePage() {
  const { reflections, loading } = useArchive();

  if (loading) {
    return (
      <p className="font-lyric-italic text-earth-mid py-6">Opening the folio...</p>
    );
  }

  if (reflections.length === 0) {
    return (
      <div className="space-y-6 py-2 text-center">
        <header className="space-y-2">
          <PressureLabel caps tone="ink">
            The Folio
          </PressureLabel>
          <p className="font-lyric-italic text-sm text-earth-deep">
            Days you have walked
          </p>
        </header>
        <GoldRule width="section" />
        <p className="font-lyric-italic text-base text-earth-mid pt-12">
          your first folio is waiting — write tonight
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <header className="text-center space-y-2">
        <LabelTiny>Archive</LabelTiny>
        <h1 className="font-lyric text-3xl text-ink">The Folio</h1>
        <p className="font-lyric-italic text-sm text-earth-deep">
          Days you have walked
        </p>
      </header>
      <GoldRule width="section" />
      <FolioCarousel reflections={reflections} />
      <p className="text-center text-xs text-earth-mid">← → arrow keys, or swipe</p>
    </div>
  );
}
