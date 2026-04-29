"use client";

import Link from "next/link";
import { useMala } from "@/hooks/useMala";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { PressureLabel } from "@/components/gurukul/PressureLabel";
import { GoldRule } from "@/components/gurukul/GoldRule";
import { MalaBead } from "@/components/gurukul/MalaBead";
import { LotusMandala } from "@/components/ornament/LotusMandala";

export default function MalaPage() {
  const { mala, loading } = useMala();

  if (loading) {
    return <p className="font-lyric-italic text-earth-mid py-6">Loading…</p>;
  }

  if (!mala) {
    return (
      <p className="font-lyric-italic text-earth-mid py-6">
        Could not load the mala.
      </p>
    );
  }

  // Build the 108-bead grid: filled for the current mala (totalDaysWalked % 108),
  // future for the rest. Slip pattern of recent27 is overlaid on the most-recent slice.
  const beadsInThisMala = mala.currentMalaBeads;
  const malaCount = Math.floor(mala.totalDaysWalked / 108);

  const grid: Array<"filled" | "slip" | "future"> = [];
  for (let i = 0; i < 108; i++) {
    if (i < beadsInThisMala) grid.push("filled");
    else grid.push("future");
  }
  // Overlay slips from recent27 onto the trailing edge of the filled portion
  const trailingStart = Math.max(0, beadsInThisMala - 27);
  for (let j = 0; j < Math.min(27, beadsInThisMala); j++) {
    const recentIdx = mala.recent27.length - 27 + j; // approximate alignment
    if (recentIdx >= 0 && mala.recent27[recentIdx] === "slip") {
      grid[trailingStart + j] = "slip";
    }
  }

  return (
    <div className="space-y-6 py-2 relative">
      <LotusMandala
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        opacity={0.08}
        size={420}
      />

      <header className="text-center space-y-2 relative">
        <LabelTiny>The Mala</LabelTiny>
        <h1 className="font-lyric text-3xl text-ink">108 beads</h1>
        <p className="font-lyric-italic text-sm text-earth-deep">
          One bead per day walked. Filled malas are kept; the current mala fills
          again.
        </p>
      </header>

      <GoldRule width="section" />

      <div className="text-center space-y-1">
        <PressureLabel className="text-3xl">{mala.totalDaysWalked}</PressureLabel>
        <p className="font-lyric-italic text-sm text-earth-deep">
          days walked in all
        </p>
        {malaCount > 0 && (
          <p className="font-pressure-caps text-[10px] text-saffron pt-1">
            {malaCount} {malaCount === 1 ? "mala" : "malas"} kept
          </p>
        )}
      </div>

      {/* The full 108-bead grid: 9 rows of 12 */}
      <div className="relative bg-ivory-deep/50 border border-gold/30 rounded-lg p-6 mx-auto" style={{ maxWidth: 360 }}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
            gap: 6,
            justifyItems: "center",
          }}
        >
          {grid.map((s, i) => (
            <MalaBead key={i} state={s} size={20} />
          ))}
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 bg-ivory">
          <span className="font-pressure-caps text-[9px] text-earth-mid">
            {beadsInThisMala} of 108
          </span>
        </div>
      </div>

      <p className="text-center text-xs text-earth-mid pt-4">
        <Link href="/" className="hover:text-saffron">← back to home</Link>
      </p>
    </div>
  );
}
