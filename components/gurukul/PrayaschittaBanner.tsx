"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAcknowledgeSlips } from "@/hooks/useVrata";
import type { VrataSlip } from "@/types";

interface PrayaschittaBannerProps {
  slips: VrataSlip[];
}

function formatDate(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

/**
 * The morning surface that appears when one or more vrata slip days have
 * been recorded but not yet acknowledged. Strict policy: each slip extended
 * the vrata by 2 days. The banner names this honestly and lets the user
 * acknowledge before continuing.
 */
export function PrayaschittaBanner({ slips }: PrayaschittaBannerProps) {
  const ack = useAcknowledgeSlips();

  if (slips.length === 0) return null;

  const slipCount = slips.length;
  const extension = slipCount * 2;

  const message =
    slipCount === 1
      ? `On ${formatDate(slips[0].date)}, the offering was not made. The vrata adds 2 days. Begin again.`
      : `On ${slipCount} days, the offering was not made. The vrata adds ${extension} days. Begin again.`;

  return (
    <div className="rounded-lg border border-saffron/40 bg-ivory-deep/80 p-4 space-y-3">
      <div className="space-y-1">
        <div className="font-pressure-caps text-[10px] text-saffron">Prayaschitta</div>
        <p className="font-lyric-italic text-sm text-ink leading-relaxed">{message}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => ack.mutate(slips.map((s) => s.id))}
          disabled={ack.isPending}
        >
          {ack.isPending ? "Acknowledging…" : "I see it. Continue."}
        </Button>
        <Link
          href="/vrata"
          className="font-lyric-italic text-xs text-earth-deep hover:text-saffron"
        >
          See the vrata
        </Link>
      </div>
    </div>
  );
}
