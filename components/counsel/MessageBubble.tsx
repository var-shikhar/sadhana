"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { OmGlyph } from "@/components/gurukul/OmGlyph";
import { CitationChip } from "./CitationChip";
import { SpeakerButton } from "./SpeakerButton";
import { useSpeak } from "@/hooks/useSpeak";
import type { CounselMessage } from "@/lib/stores/counsel";

interface MessageBubbleProps {
  message: CounselMessage;
  onOpenSources?: () => void;
  onCitationClick?: (externalId: string) => void;
}

/** Strip [BG 2.47]-style citation brackets when speaking aloud. */
function stripCitationsForSpeech(text: string): string {
  return text.replace(/\[[A-Za-z]+_?[\d.]+\]/g, "");
}

/** Tokenize an answer string into plain text + [CITATION] tokens. */
function tokenizeAnswer(text: string): Array<
  | { kind: "text"; value: string }
  | { kind: "citation"; externalId: string }
> {
  const out: ReturnType<typeof tokenizeAnswer> = [];
  const regex = /\[([A-Za-z]+_?[\d.]+)\]/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIdx) {
      out.push({ kind: "text", value: text.slice(lastIdx, m.index) });
    }
    out.push({ kind: "citation", externalId: m[1] });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) {
    out.push({ kind: "text", value: text.slice(lastIdx) });
  }
  return out;
}

export function MessageBubble({
  message,
  onOpenSources,
  onCitationClick,
}: MessageBubbleProps) {
  // Hooks must be called in the same order every render — keep all of them
  // at the top, regardless of which bubble shape we render.
  const speak = useSpeak({ rate: 0.92 });

  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-bubble-in">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-saffron text-ivory px-4 py-2.5 shadow-sm">
          <p className="font-lyric text-base leading-snug">{message.text}</p>
        </div>
        <style>{`
          @keyframes bubble-in {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-bubble-in {
            animation: bubble-in 280ms ease-out forwards;
          }
        `}</style>
      </div>
    );
  }

  // Acharya bubble
  const tokens = tokenizeAnswer(message.text);
  const sourceCount = message.sources?.length ?? 0;

  return (
    <div className="flex items-start gap-3 max-w-[88%] animate-acharya-in">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-saffron/15 border border-saffron/40 flex items-center justify-center">
        <OmGlyph size={18} tone="saffron" />
      </div>
      <div
        className={cn(
          "flex-1 rounded-2xl rounded-tl-sm border px-4 py-3 shadow-sm space-y-3",
          message.brokeCharacter
            ? "bg-ivory border-saffron/60"
            : "bg-linear-to-br from-ivory-deep to-parchment border-gold/40"
        )}
      >
        {message.brokeCharacter && (
          <div className="font-pressure-caps text-[9px] text-saffron tracking-[3px]">
            Plain words
          </div>
        )}
        <div className="font-lyric text-base leading-relaxed text-ink space-y-3 ink-bleed">
          {message.text.split(/\n\n+/).map((para, i) => {
            const paraTokens = tokenizeAnswer(para);
            return (
              <p key={i}>
                {paraTokens.map((tok, j) => {
                  if (tok.kind === "text") {
                    return <Fragment key={j}>{renderInlineMarkdown(tok.value)}</Fragment>;
                  }
                  return (
                    <Fragment key={j}>
                      <CitationChip
                        externalId={tok.externalId}
                        inline
                        onOpen={() => onCitationClick?.(tok.externalId)}
                      />
                    </Fragment>
                  );
                })}
              </p>
            );
          })}
        </div>

        <div className="flex items-center gap-4 pt-1">
          {sourceCount > 0 && onOpenSources && (
            <button
              type="button"
              onClick={onOpenSources}
              className="inline-flex items-center gap-1 text-[11px] font-pressure-caps text-saffron tracking-[2px] hover:text-saffron/80 transition-colors"
            >
              <span>↪ Sources · {sourceCount}</span>
            </button>
          )}
          <SpeakerButton
            isSpeaking={speak.isSpeaking}
            supported={speak.supported}
            onToggle={() => {
              if (speak.isSpeaking) speak.stop();
              else speak.speak(stripCitationsForSpeech(message.text));
            }}
          />
        </div>

        {/* Suppress lint — used inside string only */}
        {void tokens}
      </div>

      <style>{`
        @keyframes acharya-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-acharya-in {
          animation: acharya-in 380ms ease-out forwards;
        }
        @keyframes ink-bleed-in {
          from { clip-path: inset(0 100% 0 0); filter: blur(1px); opacity: 0.4; }
          to { clip-path: inset(0 0 0 0); filter: blur(0); opacity: 1; }
        }
        .ink-bleed {
          animation: ink-bleed-in 1100ms ease-out forwards;
        }
      `}</style>
    </div>
  );
}

/** Tiny inline markdown — only bold (**text**) for now. */
function renderInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} className="font-pressure text-ink">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={i}>{p}</Fragment>;
  });
}
