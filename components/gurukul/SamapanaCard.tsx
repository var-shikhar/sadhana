"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GoldRule } from "./GoldRule";
import { LotusMandala } from "@/components/ornament/LotusMandala";
import type { Vrata } from "@/types";
import { VRATA_LENGTHS } from "@/types";

interface SamapanaCardProps {
  vrata: Vrata;
}

/**
 * Vrata completion card. Appears on Home when the most recent vrata has
 * just transitioned to "completed" but the user hasn't yet started a new
 * one. A folio sealed with a saffron stamp; one pressure-caps line; gentle
 * invitation to begin a new vow.
 */
export function SamapanaCard({ vrata }: SamapanaCardProps) {
  const lengthDef = VRATA_LENGTHS.find((l) => l.name === vrata.lengthName);
  const englishLength = lengthDef?.english ?? "";

  return (
    <Card className="relative overflow-hidden bg-linear-to-br from-ivory-deep to-parchment border-gold/40">
      <LotusMandala
        className="absolute -top-6 -right-6 pointer-events-none"
        opacity={0.15}
        tone="saffron"
        size={180}
      />
      {/* saffron seal */}
      <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-saffron flex items-center justify-center shadow-[0_2px_8px_rgba(92,46,14,0.35)]">
        <span className="font-pressure-caps text-[7px] text-ivory">KEPT</span>
      </div>

      <CardContent className="p-6 space-y-4 relative">
        <div className="text-center space-y-1">
          <div className="font-pressure-caps text-[10px] text-saffron">Samapana</div>
          <h2 className="font-lyric text-2xl text-ink leading-tight">
            The vrata is kept.
          </h2>
          <p className="font-lyric-italic text-sm text-earth-deep">
            {englishLength} · {vrata.baseDays + vrata.extensionDays} days walked
          </p>
        </div>
        <GoldRule width="section" />
        <p className="font-lyric-italic text-sm text-earth-deep text-center">
          &quot;The yogi who is established in practice is not lost. The progress remains.&quot;
          <br />
          <span className="font-pressure-caps text-[9px] text-earth-mid not-italic">
            — Bhagavad Gita 6.40
          </span>
        </p>
        <div className="flex justify-center pt-2">
          <Link href="/vrata">
            <Button>Take a new vow</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
