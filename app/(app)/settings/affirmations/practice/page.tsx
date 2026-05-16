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

  const [index, setIndex] = useState(0);
  const [heard, setHeard] = useState("");
  const heardRef = useRef("");
  // True once the spoken transcript has matched the current affirmation. The
  // ONLY way to leave a slide is via this gate — there is no Skip, and the
  // Next button is hidden until the user has actually said it correctly.
  const [matched, setMatched] = useState(false);

  const current = queue[index] ?? null;
  // The pre-start "Speak each one" screen now lives in the modal that opens
  // from the Plan tab's Begin-recital button. Reaching this page means the
  // user has already committed — go straight into active practice.
  const done = queue.length > 0 && index >= queue.length;

  // The current affirmation's language drives both the STT recognizer's
  // language tag AND the normalization branch used for matching.
  const currentLang = current?.language ?? "en-US";

  // ── Voice ──
  // Only finals are matched against the affirmation; interim transcript is
  // surfaced via voice.interim for the "Heard" preview, not via a callback.
  const voice = useVoiceInput({
    lang: currentLang,
    onFinalText: handleFinalText,
  });

  function handleFinalText(final: string) {
    // Once matched, ignore any further STT input on this slide — the user
    // has already spoken the affirmation; nothing else should reopen it.
    if (matched) return;
    // Each mic cycle is a fresh attempt: replace, don't append. This keeps
    // the "Heard" line aligned with what the user just said, so the mismatch
    // (or match) feedback always reflects the most recent try.
    const next = final.trim();
    heardRef.current = next;
    setHeard(next);

    const target = current?.text;
    if (!target) return;
    const lang = current?.language ?? "en-US";
    if (normalizeAffirmation(next, lang) === normalizeAffirmation(target, lang)) {
      voice.stop();
      setMatched(true);
    }
  }

  function resetHeard() {
    heardRef.current = "";
    setHeard("");
  }

  function next() {
    voice.stop();
    resetHeard();
    setMatched(false);
    setIndex((i) => i + 1);
  }

  function repeat() {
    voice.stop();
    resetHeard();
    setMatched(false);
  }

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
                  setMatched(false);
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
      <Card className="bg-linear-to-b from-ivory to-parchment border-gold/40 transition-all">
        <CardContent className="pt-8 pb-6 space-y-6">
          <p className="font-lyric text-[22px] sm:text-[26px] text-ink leading-snug text-center px-2">
            &ldquo;{current?.text}&rdquo;
          </p>

          {matched ? (
            <MatchedSuccess onRepeat={repeat} onNext={next} />
          ) : (
            <AttemptPanel
              heard={heard}
              voice={voice}
            />
          )}
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

function CheckIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-saffron"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

interface AttemptVoiceApi {
  supported: boolean;
  isListening: boolean;
  isTranscribing: boolean;
  interim: string;
  toggle: () => void;
  error: string | null;
}

function AttemptPanel({
  heard,
  voice,
}: {
  heard: string;
  voice: AttemptVoiceApi;
}) {
  // The caption next to/under the mic button is the primary teaching surface
  // for the "tap to start, tap again to stop" interaction. We do NOT rely on
  // a hover title — mobile users never see those.
  const micLabel = voice.isTranscribing
    ? "Transcribing…"
    : voice.isListening
      ? "Tap to stop"
      : heard
        ? "Tap to try again"
        : "Tap to speak";

  // A heard transcript with no listening/transcribing in flight means the
  // last attempt finished without matching — surface that explicitly.
  const showMismatchHint =
    Boolean(heard) && !voice.isListening && !voice.isTranscribing;

  return (
    <>
      <div className="min-h-11 rounded-md border border-gold/30 bg-ivory/60 px-3 py-2">
        <LabelTiny>Heard</LabelTiny>
        <p className="font-lyric-italic text-[13px] text-earth-deep mt-0.5 leading-snug">
          {voice.isListening ? (
            voice.interim ? (
              <span>{voice.interim}</span>
            ) : (
              <span className="text-earth-mid italic">listening…</span>
            )
          ) : voice.isTranscribing ? (
            <span className="text-earth-mid italic">transcribing…</span>
          ) : heard ? (
            heard
          ) : voice.supported ? (
            <span className="text-earth-mid italic">tap the mic to speak</span>
          ) : (
            <span className="text-earth-mid italic">
              voice input unavailable on this browser
            </span>
          )}
        </p>
      </div>

      {voice.error && (
        <p className="text-[11px] text-saffron font-lyric-italic text-center">
          Mic error: {voice.error}. Tap the mic to try again.
        </p>
      )}

      {showMismatchHint && !voice.error && (
        <p className="text-[11px] text-saffron/90 font-lyric-italic text-center">
          Not quite — tap the mic to say the affirmation again.
        </p>
      )}

      {voice.supported && (
        <div className="flex flex-col items-center gap-2">
          <ButtonBare
            type="button"
            onClick={voice.toggle}
            disabled={voice.isTranscribing}
            aria-pressed={voice.isListening}
            title={micLabel}
            className={cn(
              "relative h-16 w-16 rounded-full flex items-center justify-center transition-all",
              voice.isTranscribing
                ? "bg-ivory-deep border border-gold/30 text-earth-mid/50 cursor-wait"
                : voice.isListening
                  ? "bg-saffron text-ivory shadow-[0_4px_18px_rgba(196,106,31,0.4)]"
                  : "bg-ivory border border-gold/50 text-saffron hover:bg-ivory-deep"
            )}
          >
            <MicIcon />
            {voice.isListening && !voice.isTranscribing && (
              <span className="absolute inset-0 rounded-full border-2 border-saffron/50 animate-ping" />
            )}
          </ButtonBare>
          <p className="text-[10px] font-pressure-caps tracking-[2px] text-earth-mid">
            {micLabel}
          </p>
        </div>
      )}
    </>
  );
}

function MatchedSuccess({
  onRepeat,
  onNext,
}: {
  onRepeat: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="h-14 w-14 rounded-full bg-saffron/15 border border-saffron/50 flex items-center justify-center">
          <CheckIcon />
        </div>
        <p className="font-lyric text-2xl text-ink">Taken root.</p>
        <p className="font-lyric-italic text-[12px] text-earth-mid max-w-xs text-center">
          Each repetition deepens it. Say it again to anchor it, or move on.
        </p>
      </div>
      <div className="flex items-center justify-center gap-3">
        <ButtonBare
          type="button"
          onClick={onRepeat}
          className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-earth-deep px-3 py-1.5"
        >
          Repeat
        </ButtonBare>
        <ButtonBare
          type="button"
          onClick={onNext}
          className="text-[10px] font-pressure-caps tracking-wider bg-ink text-ivory rounded-md px-3 py-1.5"
        >
          Next →
        </ButtonBare>
      </div>
    </div>
  );
}
