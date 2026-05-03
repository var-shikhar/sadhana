"use client"

import { Textarea } from "@/components/ui/textarea"
import { LabelTiny } from "@/components/gurukul/LabelTiny"

interface DaySummaryProps {
  value: string
  onChange: (value: string) => void
  /** Visible character cap. */
  max?: number
  /** Read-only display mode (used on the completed-state card). */
  readOnly?: boolean
}

const PLACEHOLDER =
  "the day, in a sentence — what it was, where it landed, what it gave you…"

export function DaySummary({
  value,
  onChange,
  max = 280,
  readOnly = false,
}: DaySummaryProps) {
  if (readOnly) {
    return (
      <div className="space-y-1.5">
        <LabelTiny>The day, sealed</LabelTiny>
        <p className="font-lyric-italic text-[15px] text-ink leading-relaxed border-l-2 border-gold/60 pl-3">
          {value || <span className="text-earth-mid">— left unsealed —</span>}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <LabelTiny>Seal the day</LabelTiny>
        <span className="text-[10px] text-earth-mid font-sans tabular-nums">
          {value.length}/{max}
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
        placeholder={PLACEHOLDER}
        rows={5}
        className="bg-ivory border-gold/40 font-lyric-italic text-[14px] leading-relaxed"
      />
    </div>
  )
}
