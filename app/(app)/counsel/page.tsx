"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { GoldRule } from "@/components/gurukul/GoldRule";
import { GuidedExplainer } from "@/components/gurukul/GuidedExplainer";
import { OmGlyph } from "@/components/gurukul/OmGlyph";
import { LotusMandala } from "@/components/ornament/LotusMandala";
import { MessageBubble } from "@/components/counsel/MessageBubble";
import { ThinkingIndicator } from "@/components/counsel/ThinkingIndicator";
import { SourcesModal } from "@/components/counsel/SourcesModal";
import { MicButton } from "@/components/counsel/MicButton";
import { useGuruQuery } from "@/hooks/useGuruQuery";
import { useCounselStore } from "@/lib/stores/counsel";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import type { RetrievedVerse } from "@/lib/scripture/retrieve";

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

  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
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

    mutation.mutate(
      {
        query: text,
        history: recentHistory(4),
      },
      {
        onSuccess: (res) => {
          if (res.answer) {
            appendAcharya(
              res.answer,
              res.citationsUsed,
              res.verses,
              res.brokeCharacter
            );
          }
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

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] relative">
      <LotusMandala
        className="absolute top-1/4 left-1/2 -translate-x-1/2 pointer-events-none"
        opacity={0.07}
        size={400}
      />

      {/* Header */}
      <header className="text-center py-4 space-y-1.5 relative">
        <div className="flex justify-center">
          <OmGlyph size={32} tone="saffron" />
        </div>
        <LabelTiny>Counsel · the Acharya</LabelTiny>
        <h1 className="font-lyric text-2xl text-ink leading-tight">
          Speak. The texts will answer.
        </h1>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="font-pressure-caps text-[9px] text-earth-mid hover:text-saffron tracking-[2px] mt-2"
          >
            ⌫ Clear conversation
          </button>
        )}
      </header>

      <GoldRule width="section" className="mb-4" />

      {/* Messages list — scrollable region */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 relative">
        {isEmpty && (
          <div className="space-y-4 pt-2">
            <GuidedExplainer
              defaultOpen
              question="What is happening?"
              explanation={`Speak as you would to a teacher who has known you a long time. The Acharya answers in the voice of Krishna to Arjuna — grounded in the Gita, the Yoga Sutras, and the principal Upanishads. Every claim is anchored to a verse you can open and verify.`}
              examples={`I keep starting and quitting · I'm angry and don't know why · What's the point of trying`}
            />
            <Card className="bg-linear-to-br from-ivory-deep to-parchment border-gold/40">
              <CardContent className="p-5 space-y-2">
                <LabelTiny>Three things to know</LabelTiny>
                <ul className="font-lyric-italic text-sm text-earth-deep space-y-1.5 leading-relaxed">
                  <li>· Every answer cites the verses it draws from. Tap any citation to see the verse.</li>
                  <li>· The Acharya remembers the last few turns of this conversation.</li>
                  <li>· If you write something that suggests you&apos;re in crisis, the Acharya breaks character and surfaces real-world help.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
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

        {mutation.isPending && <ThinkingIndicator />}

        {mutation.isError && (
          <Card className="bg-saffron/5 border-saffron/40">
            <CardContent className="p-4">
              <p className="font-lyric-italic text-sm text-earth-deep">
                {(mutation.error as Error).message}
              </p>
              <p className="text-xs text-earth-mid mt-2">
                If this is your first run, ensure the corpus is ingested:{" "}
                <code className="font-mono">npm run ingest:scriptures</code>
                {" "}— and that <code className="font-mono">OPENAI_API_KEY</code>{" "}
                is set in <code className="font-mono">.env.local</code>.
              </p>
            </CardContent>
          </Card>
        )}

        <div ref={scrollAnchorRef} />
      </div>

      {/* Composer — sticky bottom */}
      <div className="sticky bottom-0 -mx-4 px-4 pt-3 pb-2 bg-linear-to-t from-ivory via-ivory to-transparent">
        <form onSubmit={handleSend} className="flex flex-col gap-2">
          <Textarea
            value={
              voice.isListening
                ? `${draft}${draft && voice.interim ? " " : ""}${voice.interim}`
                : draft
            }
            onChange={(e) => setDraft(e.target.value.slice(0, 1000))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              voice.isListening
                ? "Listening — speak now…"
                : "Speak plainly. The Acharya is listening."
            }
            rows={2}
            disabled={mutation.isPending}
            className="bg-ivory border-gold/40 font-lyric text-base resize-none"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MicButton
                isListening={voice.isListening}
                supported={voice.supported}
                onToggle={voice.toggle}
                disabled={mutation.isPending}
              />
              <span className="font-pressure-caps text-[9px] text-earth-mid tracking-[2px]">
                {voice.isListening
                  ? "Speaking…"
                  : voice.supported
                  ? "↵ send · 🎙 voice"
                  : "↵ to send · ⇧↵ for new line"}
              </span>
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={!draft.trim() || mutation.isPending}
              className="font-pressure-caps tracking-[2px] text-[10px]"
            >
              {mutation.isPending ? "Listening…" : "Ask"}
            </Button>
          </div>
          {voice.error && (
            <p className="text-[10px] text-saffron font-lyric-italic">
              {voice.error === "not-allowed"
                ? "Microphone access denied. Enable it in your browser settings."
                : voice.error === "no-speech"
                ? "Didn't catch that. Try again."
                : `Voice error: ${voice.error}`}
            </p>
          )}
        </form>
        <p className="text-center text-xs text-earth-mid pt-2">
          <Link href="/" className="hover:text-saffron">
            ← back to home
          </Link>
        </p>
      </div>

      {/* Confirm clear */}
      {confirmClear && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
          onClick={() => setConfirmClear(false)}
        >
          <Card
            className="max-w-sm bg-ivory border-gold/40"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-5 space-y-3">
              <p className="font-lyric text-base text-ink">
                Clear this conversation?
              </p>
              <p className="font-lyric-italic text-xs text-earth-deep">
                The Acharya will forget what was said in this thread. Your
                practice data and reflections are not affected.
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
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
            </CardContent>
          </Card>
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
