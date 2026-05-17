"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { Reflection, ChipCategory } from "@/types"
import { CHIP_CATEGORY_META, CHIP_CATEGORY_ORDER } from "@/types"
import { LabelTiny } from "@/components/gurukul/LabelTiny"
import { ButtonBare } from "@/components/ui/button"
import { GrowthOrbit } from "@/components/gurukul/GrowthOrbit"
import { Skeleton } from "@/components/gurukul/Skeleton"
import { DaySummary } from "./DaySummary"
import { useCounselStore } from "@/lib/stores/counsel"
import { useGrowthHistory } from "@/hooks/useGrowthIndex"
import { format, subDays } from "date-fns"

interface ReflectionCompleteProps {
  reflection: Reflection
  /** Switch the page back to compose mode, pre-filled with today's entry. */
  onEdit?: () => void
}

const DEVANAGARI_NUMERALS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"]

function devanagariCount(n: number): string {
  return String(n)
    .split("")
    .map((d) => DEVANAGARI_NUMERALS[Number(d)] ?? d)
    .join("")
}

const TONE_TEXT: Record<ChipCategory, string> = {
  good: "text-sage",
  neutral: "text-earth-deep",
  bad: "text-saffron",
}

const TONE_DOT: Record<ChipCategory, string> = {
  good: "bg-sage",
  neutral: "bg-earth-mid",
  bad: "bg-saffron",
}

const TONE_CHIP_BG: Record<ChipCategory, string> = {
  good: "bg-sage/15 text-sage border-sage/40",
  neutral: "bg-earth-mid/15 text-earth-deep border-earth-mid/40",
  bad: "bg-saffron/15 text-saffron border-saffron/40",
}

function chipsFor(reflection: Reflection, cat: ChipCategory): string[] {
  switch (cat) {
    case "good":
      return reflection.goodChips ?? []
    case "bad":
      return reflection.badChips ?? []
    case "neutral":
      return reflection.neutralChips ?? []
  }
}

interface ActItem {
  name: string
  category: ChipCategory
  description?: string
}

function flattenActs(reflection: Reflection): ActItem[] {
  const desc = reflection.chipDescriptions ?? {}
  const items: ActItem[] = []
  for (const cat of CHIP_CATEGORY_ORDER) {
    for (const name of chipsFor(reflection, cat)) {
      items.push({ name, category: cat, description: desc[name] })
    }
  }
  return items
}

function buildCounselPrimer(reflection: Reflection): string {
  const desc = reflection.chipDescriptions ?? {}
  const lines: string[] = []
  lines.push(`Acharya, here is my reflection from ${reflection.date}.`)
  lines.push("")

  for (const cat of CHIP_CATEGORY_ORDER) {
    const chips = chipsFor(reflection, cat)
    if (chips.length === 0) continue
    const label = CHIP_CATEGORY_META[cat].label
    lines.push(`${label}:`)
    for (const name of chips) {
      const d = desc[name]
      lines.push(d ? `  • ${name} — ${d}` : `  • ${name}`)
    }
    lines.push("")
  }

  if (reflection.daySummary && reflection.daySummary.trim()) {
    lines.push(`The day, in a sentence: ${reflection.daySummary.trim()}`)
  }

  return lines.join("\n").trim()
}

export function ReflectionComplete({
  reflection,
  onEdit,
}: ReflectionCompleteProps) {
  const router = useRouter()
  const appendUser = useCounselStore((s) => s.appendUser)

  const summary = reflection.daySummary ?? ""

  // Detect the legacy CBT path so we render gracefully (archive may surface
  // older entries through this same lock-screen).
  const isLegacy =
    !reflection.goodChips && !reflection.badChips && !reflection.neutralChips

  if (isLegacy) {
    return (
      <div className="space-y-4 text-center">
        <p className="font-lyric text-xl text-ink">
          Today&apos;s reflection is complete.
        </p>
        <p className="font-lyric-italic text-sm text-earth-mid">
          {reflection.mode === "deep"
            ? "Deep reflection — 25 pts"
            : "Quick reflection — 15 pts"}
        </p>
      </div>
    )
  }

  const acts = flattenActs(reflection)
  const totalChips = acts.length

  function handleSpeakWithAcharya() {
    const primer = buildCounselPrimer(reflection)
    if (primer) appendUser(primer)
    router.push("/counsel")
  }

  return (
    <div className="space-y-6">
      {/* Tally header */}
      <div className="text-center space-y-1">
        <LabelTiny>The day, tallied</LabelTiny>
        <div className="flex items-baseline justify-center gap-5 pt-1">
          {CHIP_CATEGORY_ORDER.map((cat) => {
            const meta = CHIP_CATEGORY_META[cat]
            const count = chipsFor(reflection, cat).length
            return (
              <div key={cat} className="flex flex-col items-center gap-0.5">
                <span
                  className={cn(
                    "font-lyric text-3xl tabular-nums leading-none",
                    TONE_TEXT[cat],
                  )}
                >
                  {devanagariCount(count)}
                </span>
                <span className="font-pressure-caps text-[9px] text-earth-mid">
                  {meta.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Action row — sits flush above the list so the edit affordance lives
          right next to the details it lets you change. */}
      <div>
        {onEdit && (
          <div className="flex items-center justify-between gap-3 mb-2">
            <LabelTiny>What you noted</LabelTiny>
            <ButtonBare
              type="button"
              onClick={onEdit}
              className="font-pressure-caps text-[10px] text-earth-deep hover:text-saffron underline-offset-4 hover:underline"
            >
              Edit reflection →
            </ButtonBare>
          </div>
        )}

        {/* Single vertical list — each act with description and category chip below */}
        {acts.length === 0 ? (
          <p className="font-lyric-italic text-center text-sm text-earth-mid">
            nothing tallied today
          </p>
        ) : (
          <ul className="rounded-md border border-gold/30 bg-ivory/60 divide-y divide-gold/20 overflow-x-hidden overflow-y-auto h-[45vh]">
            {acts.map((act) => {
              const meta = CHIP_CATEGORY_META[act.category]
              return (
                <li
                  key={`${act.category}-${act.name}`}
                  className="px-3 py-2.5 space-y-1.5"
                >
                  <p className="font-lyric text-[14px] text-ink leading-tight">
                    {act.name}
                  </p>
                  {act.description && (
                    <p className="font-lyric-italic text-[12px] text-earth-deep leading-snug pl-2 border-l border-gold/30">
                      {act.description}
                    </p>
                  )}
                  <div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-pressure-caps tracking-wider",
                        TONE_CHIP_BG[act.category],
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          TONE_DOT[act.category],
                        )}
                      />
                      {meta.label}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {/* Day summary */}
      <DaySummary value={summary} onChange={() => {}} readOnly />

      {/* Inline practice summary — slimmed Viveka preview, with a link out
          to the full /analytics page for the deeper view. */}
      <PracticeSummaryPreview />

      {/* Footer actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <p className="font-lyric-italic text-[12px] text-earth-mid">
          {totalChips} {totalChips === 1 ? "thing" : "things"} marked.
        </p>
        <ButtonBare
          type="button"
          onClick={handleSpeakWithAcharya}
          className="font-pressure-caps text-[10px] text-saffron underline-offset-4 hover:underline"
        >
          Speak with the Acharya →
        </ButtonBare>
      </div>
    </div>
  )
}

/**
 * Slimmed-down Viveka summary shown inline on the sealed reflect page.
 * This is the "after submission" surface — the user has just closed the
 * day, and we want to give them a glance at the week's orbit before they
 * move on. The full analytics view lives at /analytics; we link there
 * with a clear affordance rather than duplicating every chart inline.
 */
function PracticeSummaryPreview() {
  const today = format(new Date(), "yyyy-MM-dd")
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd")
  const { scores, loading } = useGrowthHistory(thirtyDaysAgo, today)

  const { habitRatio, reflectionRatio, weekScore } = useMemo(() => {
    const last7 = scores.slice(-7)
    if (last7.length === 0) {
      return { habitRatio: 0, reflectionRatio: 0, weekScore: 0 }
    }
    const totalCompletion = last7.reduce(
      (sum, s) => sum + (s.completionPts || 0),
      0,
    )
    const habitRatio = Math.min(1, totalCompletion / (last7.length * 50))
    const reflectionDays = last7.filter(
      (s) => (s.reflectionPts || 0) > 0,
    ).length
    const reflectionRatio = reflectionDays / last7.length
    const weekScore = last7.reduce((sum, s) => sum + (s.dailyScore || 0), 0)
    return { habitRatio, reflectionRatio, weekScore }
  }, [scores])

  return (
    <div className="rounded-md border border-gold/30 bg-ivory/60 p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <LabelTiny>This week&apos;s practice</LabelTiny>
          <p className="font-lyric-italic text-[11px] text-earth-mid mt-0.5">
            A glance — the full Viveka view is one tap away.
          </p>
        </div>
        <Link
          href="/analytics"
          className="font-pressure-caps text-[10px] text-saffron underline-offset-4 hover:underline shrink-0"
        >
          See full summary →
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-4">
          <Skeleton circle className="h-16 w-16" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <GrowthOrbit
            habitRatio={habitRatio}
            reflectionRatio={reflectionRatio}
            size="sm"
            level={habitRatio > 0.5 ? "active" : "steady"}
          />
          <div className="flex-1 space-y-1.5">
            <SummaryStat
              label="Habits"
              value={`${Math.round(habitRatio * 100)}%`}
            />
            <SummaryStat
              label="Reflections"
              value={`${Math.round(reflectionRatio * 100)}%`}
            />
            <SummaryStat
              label="Week score"
              value={`${Math.round(weekScore)} pts`}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="font-pressure-caps text-[9px] text-earth-mid tracking-wider">
        {label}
      </span>
      <span className="font-lyric text-[14px] text-ink tabular-nums">
        {value}
      </span>
    </div>
  )
}
