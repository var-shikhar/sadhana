"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { GoldRule } from "@/components/gurukul/GoldRule";
import { GuidedExplainer } from "@/components/gurukul/GuidedExplainer";
import { OmGlyph } from "@/components/gurukul/OmGlyph";
import { useGuruQuery } from "@/hooks/useGuruQuery";
import { cn } from "@/lib/utils";
import type { RetrievedVerse } from "@/lib/scripture/retrieve";

const BOOK_LABELS: Record<string, string> = {
  bhagavad_gita: "Bhagavad Gita",
  yoga_sutras: "Yoga Sutras",
  isha_upanishad: "Isha Upanishad",
  kena_upanishad: "Kena Upanishad",
  katha_upanishad: "Katha Upanishad",
  mundaka_upanishad: "Mundaka Upanishad",
  mandukya_upanishad: "Mandukya Upanishad",
  prashna_upanishad: "Prashna Upanishad",
  taittiriya_upanishad: "Taittiriya Upanishad",
  aitareya_upanishad: "Aitareya Upanishad",
  chandogya_upanishad: "Chandogya Upanishad",
  brihadaranyaka_upanishad: "Brihadaranyaka Upanishad",
  svetasvatara_upanishad: "Shvetashvatara Upanishad",
  hatha_yoga_pradipika: "Hatha Yoga Pradipika",
  vivekachudamani: "Vivekachudamani",
};

const BOOK_SHORT: Record<string, string> = {
  bhagavad_gita: "BG",
  yoga_sutras: "YS",
  isha_upanishad: "IsaUp",
  kena_upanishad: "KenaUp",
  katha_upanishad: "KU",
  mundaka_upanishad: "MundakaUp",
  mandukya_upanishad: "MandukyaUp",
};

const TRANSLATOR_LABELS: Record<string, string> = {
  besant: "Annie Besant",
  arnold: "Edwin Arnold",
  telang: "K.T. Telang",
  vivekananda: "Swami Vivekananda",
  paramananda: "Swami Paramananda",
  muller: "F. Max Müller",
  prabhupada: "A.C. Bhaktivedanta Swami Prabhupada",
  easwaran: "Eknath Easwaran",
  iyengar: "B.K.S. Iyengar",
  aurobindo: "Sri Aurobindo",
  johnston: "Charles Johnston",
};

export default function CounselPage() {
  const [query, setQuery] = useState("");
  const [selectedVerse, setSelectedVerse] = useState<RetrievedVerse | null>(null);
  const mutation = useGuruQuery();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || mutation.isPending) return;
    mutation.mutate({ query: query.trim() });
  }

  const result = mutation.data;
  const bullseyes = result?.verses.filter((v) => v.source === "bullseye") ?? [];
  const neighbors = result?.verses.filter((v) => v.source === "neighbor") ?? [];
  const crossRefs = result?.verses.filter((v) => v.source === "cross_reference") ?? [];

  return (
    <div className="space-y-6 py-2 relative">
      <header className="text-center space-y-2">
        <div className="flex justify-center">
          <OmGlyph size={36} tone="saffron" />
        </div>
        <LabelTiny>Counsel</LabelTiny>
        <h1 className="font-lyric text-3xl text-ink leading-tight">
          Speak. The texts will answer.
        </h1>
        <p className="font-lyric-italic text-sm text-earth-deep max-w-md mx-auto">
          Day 1 — retrieval only. The Acharya&apos;s voice comes next; for now,
          you ask, and the verses surface.
        </p>
      </header>

      <GoldRule width="section" />

      <GuidedExplainer
        defaultOpen
        question="What is happening?"
        explanation={`Type a sentence about where you are right now — what you feel, what you can't move past, what the day asks of you. The system searches across the Bhagavad Gita, Yoga Sutras, and the principal Upanishads, and returns the verses that speak to it. You can click any verse to see the full passage, surrounding context, and other translations.`}
        examples={`I keep starting and quitting · I can't focus when I sit · I'm angry and I don't know why`}
      />

      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 500))}
          placeholder="Speak plainly. The Acharya is listening."
          rows={3}
          className="bg-ivory border-gold/40 font-lyric text-base"
        />
        <Button
          type="submit"
          className="w-full"
          disabled={!query.trim() || mutation.isPending}
        >
          {mutation.isPending ? "Searching the texts…" : "Ask"}
        </Button>
      </form>

      {mutation.isError && (
        <Card className="bg-saffron/5 border-saffron/40">
          <CardContent className="p-4">
            <p className="font-lyric-italic text-sm text-earth-deep">
              {(mutation.error as Error).message}
            </p>
            <p className="text-xs text-earth-mid mt-2">
              If this is your first run, make sure the corpus is ingested:{" "}
              <code className="font-mono">npm run ingest:scriptures</code>
            </p>
          </CardContent>
        </Card>
      )}

      {result && bullseyes.length === 0 && (
        <Card className="bg-ivory-deep border-gold/40">
          <CardContent className="p-5 text-center">
            <p className="font-lyric-italic text-sm text-earth-deep">
              No verse closely matches what you wrote. The texts are honest
              about their gaps. Try another wording, or sit with the question
              awhile.
            </p>
          </CardContent>
        </Card>
      )}

      {bullseyes.length > 0 && (
        <section className="space-y-3">
          <LabelTiny className="block">The texts answer</LabelTiny>
          <div className="space-y-2">
            {bullseyes.map((v) => (
              <VerseCard
                key={v.verseId}
                verse={v}
                onOpen={() => setSelectedVerse(v)}
                emphasis
              />
            ))}
          </div>
        </section>
      )}

      {neighbors.length > 0 && (
        <section className="space-y-3">
          <LabelTiny className="block">The surround</LabelTiny>
          <p className="font-lyric-italic text-xs text-earth-mid">
            Verses near the bullseye in the same text — the discourse Krishna
            (or Patanjali, or the rishi) develops around it.
          </p>
          <div className="space-y-2">
            {neighbors.map((v) => (
              <VerseCard
                key={v.verseId}
                verse={v}
                onOpen={() => setSelectedVerse(v)}
              />
            ))}
          </div>
        </section>
      )}

      {crossRefs.length > 0 && (
        <section className="space-y-3">
          <LabelTiny className="block">Cross-references</LabelTiny>
          <p className="font-lyric-italic text-xs text-earth-mid">
            Hand-curated echoes — where one text speaks to another on this
            theme.
          </p>
          <div className="space-y-2">
            {crossRefs.map((v) => (
              <VerseCard
                key={v.verseId}
                verse={v}
                onOpen={() => setSelectedVerse(v)}
              />
            ))}
          </div>
        </section>
      )}

      {result?.appliedTagBoosts && result.appliedTagBoosts.length > 0 && (
        <p className="font-pressure-caps text-[9px] text-earth-mid text-center">
          tag boosts: {result.appliedTagBoosts.join(" · ")}
        </p>
      )}

      <p className="text-center text-xs text-earth-mid pt-2">
        <Link href="/" className="hover:text-saffron">← back to home</Link>
      </p>

      {selectedVerse && (
        <VerseDrawer
          verse={selectedVerse}
          onClose={() => setSelectedVerse(null)}
        />
      )}
    </div>
  );
}

interface VerseCardProps {
  verse: RetrievedVerse;
  onOpen: () => void;
  emphasis?: boolean;
}

function VerseCard({ verse, onOpen, emphasis }: VerseCardProps) {
  const bookShort = BOOK_SHORT[verse.book] ?? verse.book;
  const ref = `${bookShort} ${verse.chapter}.${verse.verse}${verse.subVerse ? "." + verse.subVerse : ""}`;
  const text = verse.matchedText ?? verse.translations[0]?.englishText ?? "";

  return (
    <Card
      onClick={onOpen}
      className={cn(
        "cursor-pointer flex flex-col gap-2 p-4 bg-ivory-deep border-gold/30 transition-all hover:border-saffron/60",
        emphasis && "bg-linear-to-br from-ivory-deep to-parchment border-saffron/40"
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-pressure-caps text-[10px] text-saffron tracking-[3px]">
          {ref}
        </span>
        {emphasis && verse.similarity > 0 && (
          <span className="font-pressure-caps text-[8px] text-earth-mid">
            similarity {(verse.similarity * 100).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="font-lyric-italic text-sm text-ink leading-relaxed">
        &quot;{text}&quot;
      </p>
      {verse.matchedTranslator && (
        <p className="text-[10px] text-earth-mid">
          — {TRANSLATOR_LABELS[verse.matchedTranslator] ?? verse.matchedTranslator}
        </p>
      )}
      {verse.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {verse.tags.slice(0, 5).map((t) => (
            <span
              key={t}
              className="font-pressure-caps text-[8px] text-earth-mid border border-gold/30 rounded-full px-2 py-0.5"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

function VerseDrawer({
  verse,
  onClose,
}: {
  verse: RetrievedVerse;
  onClose: () => void;
}) {
  const bookLabel = BOOK_LABELS[verse.book] ?? verse.book;
  const bookShort = BOOK_SHORT[verse.book] ?? verse.book;
  const ref = `${bookShort} ${verse.chapter}.${verse.verse}${verse.subVerse ? "." + verse.subVerse : ""}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-ivory rounded-t-xl sm:rounded-xl border border-gold/40 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-baseline justify-between bg-ivory/95 backdrop-blur p-5 border-b border-gold/30">
          <div>
            <div className="font-pressure-caps text-[10px] text-saffron">{ref}</div>
            <div className="font-lyric text-lg text-ink mt-0.5">{bookLabel}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-earth-mid hover:text-ink text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-5 space-y-5">
          {verse.sanskritDevanagari && (
            <div className="space-y-1">
              <LabelTiny>Sanskrit</LabelTiny>
              <p className="font-lyric text-lg text-ink leading-relaxed">
                {verse.sanskritDevanagari}
              </p>
              {verse.sanskritIast && (
                <p className="font-lyric-italic text-sm text-earth-deep mt-1">
                  {verse.sanskritIast}
                </p>
              )}
            </div>
          )}
          {verse.translations.length > 0 ? (
            <div className="space-y-4">
              <LabelTiny>Translations</LabelTiny>
              {verse.translations.map((t) => (
                <div
                  key={t.translator}
                  className="space-y-1.5 border-l-2 border-gold/40 pl-3"
                >
                  <div className="font-pressure-caps text-[9px] text-saffron tracking-[2px]">
                    {TRANSLATOR_LABELS[t.translator] ?? t.translator}
                    {t.editionYear && (
                      <span className="text-earth-mid ml-1">· {t.editionYear}</span>
                    )}
                  </div>
                  <p className="font-lyric-italic text-sm text-ink leading-relaxed">
                    &quot;{t.englishText}&quot;
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-lyric-italic text-sm text-earth-mid">
              No translation available for this verse yet.
            </p>
          )}
          {verse.tags.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-gold/20">
              <LabelTiny>Themes</LabelTiny>
              <div className="flex flex-wrap gap-1.5">
                {verse.tags.map((t) => (
                  <span
                    key={t}
                    className="font-pressure-caps text-[9px] text-earth-deep border border-gold/40 rounded-full px-2.5 py-0.5"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
