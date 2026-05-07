"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ButtonBare } from "@/components/ui/button";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { GoldRule } from "@/components/gurukul/GoldRule";
import { OmGlyph } from "@/components/gurukul/OmGlyph";
import { cn } from "@/lib/utils";
import { useAffirmations } from "@/hooks/useAffirmations";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import {
  normalizeAffirmation,
  shuffleInPlace,
} from "@/lib/affirmations/normalize";
import type { Affirmation } from "@/types";

export default function AffirmationsPracticePage() {
  const router = useRouter();
  const { affirmations, loading } = useAffirmations();

  // ── Snapshot the active list, shuffled ONCE per page mount. ──
  const queue = useMemo<Affirmation[]>(() => {
    if (loading) return [];
    return shuffleInPlace(affirmations.filter((a) => a.isActive).slice());
    // We deliberately skip the affirmations dep so the queue doesn't
    // reshuffle if the user toggles something in another tab mid-practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [heard, setHeard] = useState("");
  const heardRef = useRef("");
  const [advancing, setAdvancing] = useState(false);

  const current = queue[index] ?? null;
  const done = started && queue.length > 0 && index >= queue.length;

  // The current affirmation's language drives both the STT recognizer's
  // language tag AND the normalization branch used for matching.
  const currentLang = current?.language ?? "en-US";

  // ── Voice ──
  const voice = useVoiceInput({
    lang: currentLang,
    onFinalText: handleFinalText,
    onInterimText: () => {
      // we don't append interim into heardRef; only finals count for matching
    },
  });

  function handleFinalText(final: string) {
    if (advancing) return;
    const next = heardRef.current
      ? `${heardRef.current} ${final}`.trim()
      : final.trim();
    heardRef.current = next;
    setHeard(next);

    const target = current?.text;
    if (!target) return;
    const lang = current?.language ?? "en-US";
    if (normalizeAffirmation(next, lang) === normalizeAffirmation(target, lang)) {
      void advance();
    }
  }

  function resetHeard() {
    heardRef.current = "";
    setHeard("");
  }

  async function advance() {
    setAdvancing(true);
    // Stop listening so the next phrase doesn't accidentally land here.
    voice.stop();
    // Brief flash of "complete" before moving on.
    await new Promise((r) => setTimeout(r, 600));
    resetHeard();
    setIndex((i) => i + 1);
    setAdvancing(false);
  }

  function skip() {
    if (advancing) return;
    voice.stop();
    resetHeard();
    setIndex((i) => i + 1);
  }

  function repeat() {
    if (advancing) return;
    resetHeard();
    if (voice.supported && !voice.isListening) {
      voice.start();
    }
  }

  function begin() {
    setStarted(true);
    if (voice.supported) voice.start();
  }

  // Auto-restart listening when we move to a new affirmation (recognition
  // stops itself after each final phrase, so we restart per-affirmation).
  useEffect(() => {
    if (!started || done || !voice.supported || advancing) return;
    if (voice.isListening) return;
    const t = setTimeout(() => voice.start(), 250);
    return () => clearTimeout(t);
    // voice.start is stable from the hook; voice.isListening drives this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, done, voice.isListening, voice.supported, advancing, index]);

  // Stop listening on unmount.
  useEffect(() => {
    return () => voice.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render branches ──

  if (loading) {
    return (
      <p className="font-lyric-italic text-earth-mid py-6 text-center">
        Loading…
      </p>
    );
  }

  // Empty library
  if (queue.length === 0) {
    return (
      <div className="space-y-6 py-2">
        <Header />
        <GoldRule width="section" />
        <Card className="bg-ivory-deep border-gold/40">
          <CardContent className="pt-6 pb-6 text-center space-y-3">
            <p className="font-lyric-italic text-sm text-earth-mid">
              No active affirmations yet. Add or activate some first.
            </p>
            <Link
              href="/settings/affirmations"
              className="inline-block font-pressure-caps text-[10px] text-saffron underline-offset-4 hover:underline"
            >
              Manage affirmations →
            </Link>
          </CardContent>
        </Card>
        <BackToAffirmations />
      </div>
    );
  }

  // Pre-start screen
  if (!started) {
    return (
      <div className="space-y-6 py-2">
        <Header />
        <GoldRule width="section" />
        <Card className="bg-linear-to-b from-ivory to-parchment border-gold/40">
          <CardContent className="pt-8 pb-8 text-center space-y-5">
            <OmGlyph size={36} tone="saffron" />
            <div className="space-y-1.5">
              <p className="font-lyric text-2xl text-ink leading-snug">
                Speak each one.
              </p>
              <p className="font-lyric-italic text-sm text-earth-deep max-w-md mx-auto">
                {queue.length} affirmation{queue.length === 1 ? "" : "s"},
                shuffled. Read each aloud — the page advances when you&apos;ve
                said it.
              </p>
            </div>
            {voice.supported ? (
              <p className="font-lyric-italic text-[11px] text-earth-mid">
                We&apos;ll ask for microphone access on the first one.
              </p>
            ) : (
              <p className="font-lyric-italic text-[11px] text-saffron">
                Voice input isn&apos;t supported on this browser. You can still
                step through manually with the Next button.
              </p>
            )}
            <ButtonBare
              type="button"
              onClick={begin}
              className="inline-block bg-saffron text-ivory rounded-md px-6 py-2.5 text-[11px] font-pressure-caps tracking-[3px]"
            >
              Begin
            </ButtonBare>
          </CardContent>
        </Card>
        <BackToAffirmations />
      </div>
    );
  }

  // Completion screen
  if (done) {
    return (
      <div className="space-y-6 py-2">
        <Header />
        <GoldRule width="section" />
        <Card className="bg-linear-to-b from-ivory to-parchment border-gold/40">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <OmGlyph size={40} tone="saffron" />
            <p className="font-lyric text-2xl text-ink">Spoken.</p>
            <p className="font-lyric-italic text-sm text-earth-deep">
              {queue.length} affirmation{queue.length === 1 ? "" : "s"} —
              complete.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <ButtonBare
                type="button"
                onClick={() => {
                  setIndex(0);
                  resetHeard();
                  // Reshuffle the queue order on a re-run.
                  shuffleInPlace(queue);
                }}
                className="text-[10px] font-pressure-caps tracking-wider text-earth-deep underline-offset-4 hover:underline"
              >
                Speak again
              </ButtonBare>
              <ButtonBare
                type="button"
                onClick={() => router.push("/settings/affirmations")}
                className="bg-ink text-ivory rounded-md px-4 py-2 text-[10px] font-pressure-caps tracking-wider"
              >
                Done
              </ButtonBare>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active practice — single affirmation slide
  return (
    <div className="space-y-6 py-2">
      <Header />
      <GoldRule width="section" />

      {/* Progress */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {queue.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i < index
                  ? "w-6 bg-saffron"
                  : i === index
                    ? "w-8 bg-ink"
                    : "w-3 bg-earth-mid/30"
              )}
            />
          ))}
        </div>
        <span className="font-pressure-caps text-[10px] text-earth-mid tabular-nums">
          {index + 1} of {queue.length}
        </span>
      </div>

      {/* Slide */}
      <Card
        className={cn(
          "bg-linear-to-b from-ivory to-parchment border-gold/40 transition-all",
          advancing && "scale-[0.99] opacity-80"
        )}
      >
        <CardContent className="pt-8 pb-6 space-y-6">
          <p className="font-lyric text-[22px] sm:text-[26px] text-ink leading-snug text-center px-2">
            &ldquo;{current?.text}&rdquo;
          </p>

          {/* Live transcript */}
          <div className="min-h-[44px] rounded-md border border-gold/30 bg-ivory/60 px-3 py-2">
            <LabelTiny>Heard</LabelTiny>
            <p className="font-lyric-italic text-[13px] text-earth-deep mt-0.5 leading-snug">
              {heard || voice.interim ? (
                <>
                  {heard}
                  {voice.interim && (
                    <span className="text-earth-mid"> {voice.interim}</span>
                  )}
                </>
              ) : voice.supported && voice.isListening ? (
                <span className="text-earth-mid italic">listening…</span>
              ) : voice.supported ? (
                <span className="text-earth-mid italic">tap mic to speak</span>
              ) : (
                <span className="text-earth-mid italic">
                  voice input unavailable — use Next to advance
                </span>
              )}
            </p>
          </div>

          {voice.error && (
            <p className="text-[11px] text-saffron font-lyric-italic text-center">
              Mic error: {voice.error}. You can still tap Next to continue.
            </p>
          )}

          {/* Mic button */}
          {voice.supported && (
            <div className="flex justify-center">
              <ButtonBare
                type="button"
                onClick={voice.toggle}
                aria-pressed={voice.isListening}
                title={voice.isListening ? "Pause listening" : "Resume listening"}
                className={cn(
                  "relative h-16 w-16 rounded-full flex items-center justify-center transition-all",
                  voice.isListening
                    ? "bg-saffron text-ivory shadow-[0_4px_18px_rgba(196,106,31,0.4)]"
                    : "bg-ivory border border-gold/50 text-saffron hover:bg-ivory-deep"
                )}
              >
                <MicIcon />
                {voice.isListening && (
                  <span className="absolute inset-0 rounded-full border-2 border-saffron/50 animate-ping" />
                )}
              </ButtonBare>
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <ButtonBare
              type="button"
              onClick={skip}
              className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-earth-deep"
            >
              Skip
            </ButtonBare>
            <div className="flex items-center gap-2">
              <ButtonBare
                type="button"
                onClick={repeat}
                className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-earth-deep px-3 py-1.5"
              >
                Repeat
              </ButtonBare>
              <ButtonBare
                type="button"
                onClick={skip}
                className="text-[10px] font-pressure-caps tracking-wider bg-ink text-ivory rounded-md px-3 py-1.5"
              >
                Next →
              </ButtonBare>
            </div>
          </div>
        </CardContent>
      </Card>

      <BackToAffirmations />
    </div>
  );
}

function Header() {
  return (
    <header className="text-center space-y-2 relative">
      <LabelTiny>Mantra · the practice</LabelTiny>
      <h1 className="font-lyric text-3xl text-ink">Speak it back.</h1>
    </header>
  );
}

function BackToAffirmations() {
  return (
    <Link
      href="/settings/affirmations"
      className="block text-center font-pressure-caps text-[10px] text-earth-mid hover:text-earth-deep"
    >
      ← back to affirmations
    </Link>
  );
}

function MicIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}
