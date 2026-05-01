"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { RetrievedVerse } from "@/lib/scripture/retrieve";

const BOOK_LABELS: Record<string, string> = {
  bhagavad_gita: "Bhagavad Gita",
  yoga_sutras: "Yoga Sutras of Patanjali",
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

const SOURCE_LABEL: Record<RetrievedVerse["source"], string> = {
  bullseye: "Cited",
  neighbor: "Surrounding context",
  cross_reference: "Cross-reference",
};

interface SourcesModalProps {
  open: boolean;
  onClose: () => void;
  sources: RetrievedVerse[];
  initialVerseExternalId?: string;
  citationsUsed?: string[];
}

/**
 * Sources panel — opens from within the dark Counsel surface, so it carries
 * the same evening-room mood. The Acharya's answer is the answer; this panel
 * is the *library shelf* the user can step over to and verify any citation.
 */
export function SourcesModal({
  open,
  onClose,
  sources,
  initialVerseExternalId,
  citationsUsed,
}: SourcesModalProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const usedSet = useMemo(
    () => new Set(citationsUsed ?? []),
    [citationsUsed]
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    if (initialVerseExternalId) {
      setExpanded(new Set([initialVerseExternalId]));
      requestAnimationFrame(() => {
        document
          .getElementById(`source-${initialVerseExternalId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } else if (citationsUsed && citationsUsed.length > 0) {
      setExpanded(new Set(citationsUsed));
    }
  }, [open, initialVerseExternalId, citationsUsed]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const groups = useMemo(() => {
    const m = new Map<string, RetrievedVerse[]>();
    for (const v of sources) {
      if (!m.has(v.book)) m.set(v.book, []);
      m.get(v.book)!.push(v);
    }
    return Array.from(m.entries());
  }, [sources]);

  if (!open) return null;

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-55 flex items-end sm:items-center justify-center animate-modal-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-ink/70 backdrop-blur-[3px]" />
      <div
        className="relative w-full max-w-2xl max-h-[88vh] flex flex-col bg-ink-soft rounded-t-xl sm:rounded-xl border border-earth-mid/40 shadow-[0_8px_32px_rgba(0,0,0,0.6)] animate-modal-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-baseline justify-between bg-ink-soft/95 backdrop-blur p-5 border-b border-earth-mid/40 z-10">
          <div>
            <span className="font-pressure-caps text-[10px] text-earth-mid tracking-[3px]">
              Sources
            </span>
            <h2 className="font-lyric text-2xl text-parchment mt-0.5">
              The texts the Acharya drew from
            </h2>
            <p className="font-lyric-italic text-xs text-parchment/50 mt-1">
              {sources.length} verses · {groups.length}{" "}
              {groups.length === 1 ? "book" : "books"}
              {citationsUsed && citationsUsed.length > 0 && (
                <>
                  {" · "}
                  <span className="text-saffron">
                    {citationsUsed.length} cited
                  </span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-parchment/40 hover:text-saffron text-2xl leading-none -mt-1 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 space-y-6">
          {groups.map(([book, verses]) => (
            <section key={book} className="space-y-3">
              <div className="flex items-baseline gap-2">
                <h3 className="font-lyric text-lg text-parchment">
                  {BOOK_LABELS[book] ?? book}
                </h3>
                <span className="font-pressure-caps text-[9px] text-parchment/50">
                  {verses.length} {verses.length === 1 ? "verse" : "verses"}
                </span>
              </div>
              <div className="space-y-2">
                {verses.map((v) => {
                  const ref = formatRef(v);
                  const isExpanded = expanded.has(v.externalId);
                  const wasCited = usedSet.has(v.externalId);
                  return (
                    <div
                      key={v.externalId}
                      id={`source-${v.externalId}`}
                      className={cn(
                        "rounded border transition-all",
                        wasCited
                          ? "border-saffron/50 bg-linear-to-br from-[#1f1610] to-[#2b1810]"
                          : "border-earth-mid/30 bg-ink/50"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(v.externalId)}
                        className="w-full flex items-baseline justify-between gap-2 px-4 py-3 text-left"
                      >
                        <div className="flex items-baseline gap-3 min-w-0">
                          <span className="font-pressure-caps text-[10px] text-saffron tracking-[2px]">
                            {ref}
                          </span>
                          <span className="font-pressure-caps text-[8px] text-parchment/50">
                            {SOURCE_LABEL[v.source]}
                            {v.similarity > 0 && (
                              <> · {(v.similarity * 100).toFixed(0)}%</>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {wasCited && (
                            <span
                              className="w-5 h-5 rounded-full bg-saffron flex items-center justify-center"
                              title="Cited in answer"
                            >
                              <span className="font-pressure-caps text-[6px] text-ivory">
                                C
                              </span>
                            </span>
                          )}
                          <span
                            className={cn(
                              "text-parchment/50 transition-transform",
                              isExpanded && "rotate-90"
                            )}
                          >
                            ›
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-4 animate-source-expand">
                          {v.sanskritDevanagari && (
                            <div className="space-y-1">
                              <span className="font-pressure-caps text-[10px] text-earth-mid tracking-[3px]">
                                Sanskrit
                              </span>
                              <p className="font-lyric text-base text-parchment leading-relaxed">
                                {v.sanskritDevanagari}
                              </p>
                              {v.sanskritIast && (
                                <p className="font-lyric-italic text-xs text-parchment/60 mt-1">
                                  {v.sanskritIast}
                                </p>
                              )}
                            </div>
                          )}

                          {v.translations.length > 0 ? (
                            <div className="space-y-3">
                              <span className="font-pressure-caps text-[10px] text-earth-mid tracking-[3px]">
                                Translations
                              </span>
                              {v.translations.map((t) => (
                                <div
                                  key={t.translator}
                                  className="space-y-1 border-l-2 border-saffron/40 pl-3"
                                >
                                  <div className="font-pressure-caps text-[9px] text-saffron tracking-[2px]">
                                    {TRANSLATOR_LABELS[t.translator] ?? t.translator}
                                    {t.editionYear && (
                                      <span className="text-parchment/40 ml-1">
                                        · {t.editionYear}
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-lyric-italic text-sm text-parchment leading-relaxed">
                                    &quot;{t.englishText}&quot;
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="font-lyric-italic text-sm text-parchment/50">
                              No translation stored for this verse yet.
                            </p>
                          )}

                          {v.tags.length > 0 && (
                            <div className="space-y-1.5 pt-2 border-t border-earth-mid/30">
                              <span className="font-pressure-caps text-[10px] text-earth-mid tracking-[3px]">
                                Themes
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {v.tags.map((t) => (
                                  <span
                                    key={t}
                                    className="font-pressure-caps text-[8px] text-parchment/70 border border-earth-mid/40 rounded-full px-2 py-0.5"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes modal-in {
          from { background-color: transparent; }
          to { background-color: rgba(13, 6, 4, 0.7); }
        }
        @keyframes modal-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes source-expand {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 800px; }
        }
        .animate-modal-in { animation: modal-in 200ms ease-out; }
        .animate-modal-up { animation: modal-up 320ms ease-out; }
        .animate-source-expand {
          animation: source-expand 240ms ease-out;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

function formatRef(v: RetrievedVerse): string {
  const SHORT: Record<string, string> = {
    bhagavad_gita: "BG",
    yoga_sutras: "YS",
    katha_upanishad: "KU",
    isha_upanishad: "IsaUp",
    kena_upanishad: "KenaUp",
    mundaka_upanishad: "MundakaUp",
    mandukya_upanishad: "MandukyaUp",
  };
  const book = SHORT[v.book] ?? v.book;
  const sub = v.subVerse ? `.${v.subVerse}` : "";
  return `${book} ${v.chapter}.${v.verse}${sub}`;
}
