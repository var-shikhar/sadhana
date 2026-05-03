"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, ButtonBare } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OmGlyph } from "@/components/gurukul/OmGlyph";
import { MessageBubble } from "@/components/counsel/MessageBubble";
import { ThinkingIndicator } from "@/components/counsel/ThinkingIndicator";
import { SourcesModal } from "@/components/counsel/SourcesModal";
import { MicButton } from "@/components/counsel/MicButton";
import { useGuruQuery } from "@/hooks/useGuruQuery";
import { useCounselStore } from "@/lib/stores/counsel";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import type { RetrievedVerse } from "@/lib/scripture/retrieve";

/**
 * The Counsel surface — full-bleed dark, intimate, focused on one thing:
 * the dialogue. It takes over the viewport (z-50) so the BottomNav, page
 * chrome, and ornament noise drop away. The room is small. The flame is
 * lit. You speak.
 */
export default function CounselPage() {
  const messages = useCounselStore((s) => s.messages);
  const appendUser = useCounselStore((s) => s.appendUser);
  const appendAcharya = useCounselStore((s) => s.appendAcharya);
  const recentHistory = useCounselStore((s) => s.recentHistory);
  const clear = useCounselStore((s) => s.clear);

  const mutation = useGuruQuery();

  const [draft, setDraft] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [sourcesModal, setSourcesModal] = useState<{
    open: boolean;
    sources: RetrievedVerse[];
    citationsUsed: string[];
    initialVerseExternalId?: string;
  }>({ open: false, sources: [], citationsUsed: [] });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, mutation.isPending]);

  const voice = useVoiceInput({
    lang: "en-US",
    onFinalText: (final) => {
      setDraft((prev) => (prev ? `${prev} ${final}` : final));
    },
  });

  function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || mutation.isPending) return;
    appendUser(text);
    setDraft("");
    if (voice.isListening) voice.stop();

    mutation.mutate(
      { query: text, history: recentHistory(4) },
      {
        onSuccess: (res) => {
          const answerText =
            res.answer && res.answer.trim().length > 0
              ? res.answer
              : "(The Acharya returned no words this time. Try asking again, or rephrase your question.)";
          appendAcharya(
            answerText,
            res.citationsUsed ?? [],
            res.verses ?? [],
            res.brokeCharacter ?? false
          );
        },
      }
    );
  }

  function openSourcesFor(messageId: string, externalId?: string) {
    const m = messages.find((m) => m.id === messageId);
    if (!m || !m.sources) return;
    setSourcesModal({
      open: true,
      sources: m.sources,
      citationsUsed: m.citationsUsed ?? [],
      initialVerseExternalId: externalId,
    });
  }

  const isEmpty = messages.length === 0 && !mutation.isPending;
  const composerValue = voice.isListening
    ? `${draft}${draft && voice.interim ? " " : ""}${voice.interim}`
    : draft;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at top, rgba(43,24,16,0.6) 0%, transparent 70%), radial-gradient(ellipse at bottom, rgba(26,18,8,1) 0%, rgba(13,6,4,1) 100%)",
      }}
    >
      {/* Top bar — minimal: back arrow · OM · clear */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-earth-deep/40 backdrop-blur-sm">
        <Link
          href="/"
          className="text-parchment/60 hover:text-saffron transition-colors flex items-center justify-center w-9 h-9 rounded-full"
          aria-label="Back to home"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex items-center justify-center">
          <OmGlyph size={22} tone="saffron" />
        </div>
        {messages.length > 0 ? (
          <ButtonBare
            type="button"
            onClick={() => setConfirmClear(true)}
            aria-label="Clear conversation"
            className="text-parchment/40 hover:text-saffron transition-colors w-9 h-9 rounded-full flex items-center justify-center"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22m-3 0V5a2 2 0 00-2-2H8a2 2 0 00-2 2v2"
              />
            </svg>
          </ButtonBare>
        ) : (
          <span className="w-9 h-9" />
        )}
      </header>

      {/* Messages area — the only thing that matters */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-5"
      >
        {isEmpty && <EmptyState />}

        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            variant="dark"
            onOpenSources={
              m.role === "acharya" ? () => openSourcesFor(m.id) : undefined
            }
            onCitationClick={
              m.role === "acharya"
                ? (externalId) => openSourcesFor(m.id, externalId)
                : undefined
            }
          />
        ))}

        {mutation.isPending && <ThinkingIndicator variant="dark" />}

        {mutation.isError && (
          <div className="rounded-lg border border-saffron/40 bg-ink-soft p-4">
            <p className="font-lyric-italic text-sm text-parchment leading-relaxed">
              {(mutation.error as Error).message}
            </p>
          </div>
        )}
      </div>

      {/* Composer — minimal, dark, focused */}
      <div className="px-4 py-3 border-t border-earth-deep/40 backdrop-blur-sm bg-ink/80">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <MicButton
            isListening={voice.isListening}
            supported={voice.supported}
            onToggle={voice.toggle}
            disabled={mutation.isPending}
            variant="dark"
          />

          <Textarea
            value={composerValue}
            onChange={(e) => setDraft(e.target.value.slice(0, 1000))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              voice.isListening ? "Listening…" : "Speak."
            }
            rows={1}
            disabled={mutation.isPending}
            className="flex-1 min-h-10 max-h-32 bg-ink-soft border-earth-mid/40 text-parchment font-lyric text-base resize-none placeholder:text-parchment/30 placeholder:font-lyric-italic focus-visible:border-saffron/60 focus-visible:ring-saffron/20"
          />

          <Button
            type="submit"
            size="sm"
            disabled={!draft.trim() || mutation.isPending}
            className="h-10 w-10 p-0 rounded-full shrink-0"
            aria-label="Send"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l14-9-7 18-2-7-5-2z" />
            </svg>
          </Button>
        </form>

        {voice.error && voice.error !== "no-speech" && (
          <p className="text-[10px] text-saffron/80 font-lyric-italic mt-2 text-center">
            {voice.error === "not-allowed"
              ? "Microphone access denied. Enable it in your browser settings."
              : `Voice error: ${voice.error}`}
          </p>
        )}
      </div>

      {/* Confirm clear — dark variant */}
      {confirmClear && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-ink/70 backdrop-blur-sm px-4"
          onClick={() => setConfirmClear(false)}
        >
          <div
            className="max-w-sm w-full bg-ink-soft border border-earth-mid/40 rounded-xl p-5 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-lyric text-base text-parchment">
              Clear this conversation?
            </p>
            <p className="font-lyric-italic text-xs text-parchment/60">
              The Acharya will forget what was said in this thread. Your
              practice data is not affected.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 bg-ink border-earth-mid/40 text-parchment hover:bg-ink-soft"
                onClick={() => setConfirmClear(false)}
              >
                Keep
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  clear();
                  setConfirmClear(false);
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sources modal */}
      <SourcesModal
        open={sourcesModal.open}
        onClose={() =>
          setSourcesModal({
            open: false,
            sources: [],
            citationsUsed: [],
          })
        }
        sources={sourcesModal.sources}
        citationsUsed={sourcesModal.citationsUsed}
        initialVerseExternalId={sourcesModal.initialVerseExternalId}
      />
    </div>
  );
}

/**
 * Empty state — minimal, ambient. One line of italic, a faded OM watermark
 * behind. The user should know what to do without being told.
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] relative pointer-events-none">
      <div className="opacity-[0.06] mb-2">
        <OmGlyph size={140} tone="saffron" />
      </div>
      <p className="font-lyric-italic text-base text-parchment/40 -mt-20">
        Speak.
      </p>
    </div>
  );
}
