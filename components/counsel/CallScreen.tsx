"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { VoiceOrb } from "./VoiceOrb";
import { CallStatus } from "./CallStatus";
import { CallControls } from "./CallControls";
import { CitationToastStack } from "./CitationToastStack";
import { SourcesModal } from "./SourcesModal";
import { RealtimeClient } from "@/lib/voice/realtime-client";
import { attachCrisisMonitor } from "@/lib/voice/crisis-monitor";
import {
  type CallStatusKind,
  type SessionConfig,
  type VoiceTurn,
  type VoiceVerse,
  voiceVerseToRetrieved,
} from "@/lib/voice/types";
import { useCounselStore } from "@/lib/stores/counsel";
import { MAX_CALL_SECONDS } from "@/lib/voice/constants";
import { ButtonBare } from "@/components/ui/button";
import { OmGlyph } from "@/components/gurukul/OmGlyph";

interface CallScreenProps {
  language: "en" | "hi";
}

export function CallScreen({ language }: CallScreenProps) {
  const router = useRouter();
  const appendVoiceTranscript = useCounselStore((s) => s.appendVoiceTranscript);

  const clientRef = useRef<RealtimeClient | null>(null);
  const monitorRef = useRef<ReturnType<typeof attachCrisisMonitor> | null>(
    null
  );
  const turnsRef = useRef<VoiceTurn[]>([]);
  /** Verses fetched between the current tool call and the next acharya_done.
   *  When the next acharya turn finishes, these citations are stamped on it. */
  const pendingCitationsRef = useRef<VoiceVerse[]>([]);
  const startedAtRef = useRef<number>(0);
  const callIdRef = useRef<string>("");
  const endingRef = useRef<boolean>(false);

  const [status, setStatus] = useState<CallStatusKind>("idle");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [allVerses, setAllVerses] = useState<VoiceVerse[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sourcesModal, setSourcesModal] = useState<VoiceVerse | null>(null);

  /** Live transcript rendered above the orb. User turns appear when Whisper
   *  completes; Acharya turns stream in word-by-word via delta events. The
   *  last entry can be `partial: true` while the Acharya is still speaking. */
  type LiveEntry = {
    id: string;
    role: "user" | "acharya";
    text: string;
    partial?: boolean;
  };
  const [liveTranscript, setLiveTranscript] = useState<LiveEntry[]>([]);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the transcript area to the bottom as new entries land.
  useEffect(() => {
    const el = transcriptScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [liveTranscript]);

  /** "Live" = connection is open and we're in an active turn-taking state.
   *  Mic outbound and the mute control are gated on this. */
  const isLive =
    status === "listening" ||
    status === "acharya_speaking" ||
    status === "tool_running";

  // Gate outbound audio: keep the track silenced until the call is live AND
  // the user hasn't muted. Re-runs when status flips so the mic comes alive
  // exactly at the "Listening…" transition.
  useEffect(() => {
    if (!localStream) return;
    const enabled = isLive && !muted;
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }, [localStream, isLive, muted]);

  // 1. Boot: request mic, mint session, open WebRTC.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("connecting");
      try {
        const mic = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        if (cancelled) {
          mic.getTracks().forEach((t) => t.stop());
          return;
        }
        setLocalStream(mic);

        const sessRes = await fetch("/api/counsel/voice/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language }),
        });
        if (!sessRes.ok) {
          const body = (await sessRes.json().catch(() => ({}))) as {
            message?: string;
            error?: string;
            details?: string;
            model?: string;
            voice?: string;
            status?: number;
          };
          // Prefer the human-readable message extracted server-side from
          // OpenAI's error envelope. Fall back through error/details/raw.
          const reason =
            body.message ||
            body.details ||
            body.error ||
            `session ${sessRes.status}`;
          throw new Error(reason);
        }
        const config = (await sessRes.json()) as SessionConfig;
        if (cancelled) return;
        callIdRef.current = config.callId;

        const client = new RealtimeClient(config);
        clientRef.current = client;
        monitorRef.current = attachCrisisMonitor(client, language);

        client.on((evt) => {
          switch (evt.type) {
            case "remote_audio_track":
              setRemoteStream(evt.stream);
              return;
            case "connected":
              setStatus("listening");
              startedAtRef.current = Date.now();
              client.triggerGreeting();
              return;
            case "user_audio_committed":
              // Lock in the user's bubble position the moment they finish
              // speaking — well before the transcript arrives. Without this,
              // the Acharya's response (which starts almost immediately)
              // would slot in BEFORE the user's transcribed bubble.
              setLiveTranscript((prev) => [
                ...prev,
                {
                  id: `u-${evt.itemId}`,
                  role: "user",
                  text: "…",
                  partial: true,
                },
              ]);
              return;
            case "user_transcript":
              turnsRef.current.push({
                role: "user",
                text: evt.text,
                at: Date.now(),
              });
              // Fill in the placeholder that user_audio_committed created.
              // Fallback to append-at-end if no placeholder exists (e.g., the
              // committed event was missed for whatever reason).
              setLiveTranscript((prev) => {
                const placeholderId = `u-${evt.itemId}`;
                const idx = prev.findIndex((e) => e.id === placeholderId);
                if (idx !== -1) {
                  const updated = [...prev];
                  updated[idx] = {
                    ...updated[idx],
                    text: evt.text,
                    partial: false,
                  };
                  return updated;
                }
                return [
                  ...prev,
                  {
                    id: placeholderId,
                    role: "user",
                    text: evt.text,
                  },
                ];
              });
              setStatus("acharya_speaking");
              return;
            case "response_started":
              setStatus("acharya_speaking");
              return;
            case "acharya_transcript_delta":
              // Deterministic ID-based lookup. Every delta for a given
              // response.id ALWAYS routes to the same entry (whether the
              // entry is partial or already finalized), so duplicate event
              // streams (Beta + GA both firing) cannot create two entries.
              setLiveTranscript((prev) => {
                const targetId = `a-${evt.responseId}`;
                const idx = prev.findIndex((e) => e.id === targetId);
                if (idx !== -1) {
                  const updated = [...prev];
                  updated[idx] = {
                    ...updated[idx],
                    text: updated[idx].text + evt.delta,
                  };
                  return updated;
                }
                return [
                  ...prev,
                  {
                    id: targetId,
                    role: "acharya",
                    text: evt.delta,
                    partial: true,
                  },
                ];
              });
              return;
            case "acharya_transcript_done":
              turnsRef.current.push({
                role: "acharya",
                text: evt.text,
                at: Date.now(),
                citations: pendingCitationsRef.current.length
                  ? pendingCitationsRef.current.map(voiceVerseToRetrieved)
                  : undefined,
              });
              // Finalize any in-progress entry for this response; if no
              // deltas arrived (the model may emit only `.done` for a short
              // turn), push a fresh final entry instead.
              setLiveTranscript((prev) => {
                const targetId = `a-${evt.responseId}`;
                const idx = prev.findIndex((e) => e.id === targetId);
                if (idx === -1) {
                  return [
                    ...prev,
                    {
                      id: targetId,
                      role: "acharya",
                      text: evt.text,
                    },
                  ];
                }
                const updated = [...prev];
                updated[idx] = {
                  ...updated[idx],
                  text: evt.text,
                  partial: false,
                };
                return updated;
              });
              pendingCitationsRef.current = [];
              setStatus("listening");
              return;
            case "tool_call":
              setStatus("tool_running");
              void handleToolCall(evt.args, evt.callId);
              return;
            case "error":
              console.error("[CallScreen] realtime error:", evt.message);
              setErrorMessage(evt.message);
              return;
            case "disconnected":
              setStatus("ended");
              return;
            default:
              return;
          }
        });

        await client.connect(mic);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Call failed to start";
        setErrorMessage(msg);
        setStatus("ended");
        // Release the mic if we acquired it before the failure — otherwise
        // the browser's recording indicator stays on and the user sees a
        // hot mic for a call that never connected.
        setLocalStream((current) => {
          current?.getTracks().forEach((t) => t.stop());
          return null;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [language]);

  // 2. Elapsed timer + hard cap enforcement
  useEffect(() => {
    if (
      status !== "listening" &&
      status !== "acharya_speaking" &&
      status !== "tool_running"
    ) {
      return;
    }
    const id = setInterval(() => {
      const sec = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setElapsedSec(sec);
      if (sec >= MAX_CALL_SECONDS) {
        playEndChime();
        void endCall();
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // 3. Cleanup on unmount — tear down resources only (NO navigation).
  //
  // Important: this fires on React StrictMode's dev double-mount too. Doing
  // anything here that calls router.replace would instantly bounce the user
  // back to /counsel the moment they entered the call. Navigation belongs
  // only in explicit user end-actions (back arrow, end button, cap timer).
  useEffect(() => {
    return () => {
      void teardownResources().catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleToolCall(
    args: { query: string; why?: string },
    openaiToolCallId: string
  ) {
    try {
      const res = await fetch("/api/counsel/voice/tool/retrieve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: callIdRef.current,
          query: args.query,
          why: args.why,
        }),
      });
      const body = (await res.json()) as {
        verses: VoiceVerse[];
        rateLimited?: boolean;
        reason?: string;
      };
      if (body.verses?.length) {
        pendingCitationsRef.current.push(...body.verses);
        setAllVerses((prev) => [...prev, ...body.verses]);
      }
      clientRef.current?.sendToolResult(openaiToolCallId, body);
    } catch (e) {
      console.error("[CallScreen] tool fetch failed:", e);
      clientRef.current?.sendToolResult(openaiToolCallId, {
        verses: [],
        rateLimited: false,
        reason: "fetch_error",
      });
    }
  }

  /** Resource cleanup. Idempotent. Safe to call on unmount or end-action.
   *  Does NOT navigate — that's the caller's job.
   *
   *  Persists transcript to localStorage, POSTs duration to /end, tears
   *  down peer connection and mic. Guarded so it only fires once.
   */
  async function teardownResources() {
    if (endingRef.current) return;
    endingRef.current = true;

    const broke = monitorRef.current?.brokeCharacter() ?? false;
    const durationSec = startedAtRef.current
      ? Math.floor((Date.now() - startedAtRef.current) / 1000)
      : 0;

    // 1. Persist transcript locally (only if we actually had a conversation)
    if (turnsRef.current.length > 0) {
      appendVoiceTranscript(turnsRef.current, durationSec);
    }

    // 2. Tell server about the duration (only if we got far enough to mint)
    if (callIdRef.current) {
      await fetch("/api/counsel/voice/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: callIdRef.current,
          durationSec,
          brokeCharacter: broke,
        }),
      }).catch(() => undefined);
    }

    // 3. Tear down peer connection + local stream
    clientRef.current?.disconnect();
    clientRef.current = null;
    monitorRef.current?.dispose();
    monitorRef.current = null;
    localStream?.getTracks().forEach((t) => t.stop());
  }

  /** User-initiated end: tear down resources, then go back to whatever
   *  page the user was on BEFORE they entered Counsel. The entry to voice
   *  uses router.replace (see CallEntryButton.startCall), which means chat
   *  and voice share the same history slot — so one back-press here skips
   *  past chat entirely. Falls back to "/" if there's no prior entry
   *  (deep-link / refresh into /counsel/call). */
  async function endCall() {
    await teardownResources();
    setStatus("ended");
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.replace("/");
    }
  }

  function toggleMute() {
    // No-op when the call isn't live — the gating effect above is the
    // authority on whether tracks are enabled; toggle just flips intent.
    if (!isLive) return;
    if (!localStream) return;
    setMuted((m) => !m);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at top, rgba(43,24,16,0.6) 0%, transparent 70%), radial-gradient(ellipse at bottom, rgba(26,18,8,1) 0%, rgba(13,6,4,1) 100%)",
      }}
    >
      <header className="flex items-center justify-between px-4 py-3 border-b border-earth-deep/40 backdrop-blur-sm">
        <ButtonBare
          type="button"
          onClick={() => void endCall()}
          aria-label="Back"
          className="text-parchment/60 hover:text-saffron transition-colors w-9 h-9 rounded-full flex items-center justify-center"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </ButtonBare>
        <span className="w-9 h-9" />
        <ButtonBare
          type="button"
          onClick={() => void endCall()}
          aria-label="End call"
          className="text-parchment/60 hover:text-saffron transition-colors w-9 h-9 rounded-full flex items-center justify-center"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </ButtonBare>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Live transcript — what was said, on a live basis */}
        <div
          ref={transcriptScrollRef}
          className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-3"
        >
          {liveTranscript.length === 0 && status === "connecting" && (
            <p className="text-center text-parchment/30 font-lyric-italic text-sm mt-8">
              {language === "hi"
                ? "जुड़ रहा है…"
                : "Connecting…"}
            </p>
          )}
          {liveTranscript.map((entry) =>
            entry.role === "user" ? (
              <div key={entry.id} className="flex justify-end animate-bubble-in">
                <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-saffron text-ivory px-4 py-2.5 shadow-sm">
                  <p className="font-lyric text-base leading-snug">
                    {entry.text}
                  </p>
                </div>
              </div>
            ) : (
              <div
                key={entry.id}
                className="flex items-start gap-3 max-w-[88%] animate-bubble-in"
              >
                <div className="shrink-0 w-9 h-9 rounded-full border border-saffron/30 bg-saffron/10 flex items-center justify-center">
                  <OmGlyph size={18} tone="saffron" />
                </div>
                <div className="flex-1 rounded-2xl rounded-tl-sm border border-earth-mid/40 bg-ink-soft px-4 py-3 shadow-sm">
                  <p className="font-lyric text-base leading-relaxed text-ivory">
                    {entry.text}
                    {entry.partial && (
                      <span className="inline-block w-0.5 h-4 ml-1 align-middle bg-saffron/80 animate-pulse" />
                    )}
                  </p>
                </div>
              </div>
            )
          )}
          <style>{`
            @keyframes bubble-in {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-bubble-in {
              animation: bubble-in 220ms ease-out both;
            }
          `}</style>
        </div>

        {/* Orb + status — sits below the transcript */}
        <div className="flex flex-col items-center justify-center gap-3 pt-2 pb-28">
          <VoiceOrb
            remoteStream={remoteStream}
            localStream={localStream}
            size={200}
          />
          <CallStatus status={status} language={language} />
        </div>
      </div>

      {/* Hidden audio element to render Acharya's voice */}
      {remoteStream && (
        <audio
          autoPlay
          playsInline
          ref={(el) => {
            if (el && el.srcObject !== remoteStream) el.srcObject = remoteStream;
          }}
          className="hidden"
        />
      )}

      <CitationToastStack
        verses={allVerses}
        onTap={(v) => setSourcesModal(v)}
      />

      <div className="absolute inset-x-0 bottom-6 flex justify-center">
        <CallControls
          elapsedSec={elapsedSec}
          capSec={MAX_CALL_SECONDS}
          muted={muted}
          onToggleMute={toggleMute}
          disabled={!isLive}
        />
      </div>

      {errorMessage && (
        <div className="absolute top-16 inset-x-0 px-4">
          <div className="mx-auto max-w-md rounded-lg border border-saffron/40 bg-ink-soft p-3">
            <p className="font-lyric-italic text-xs text-parchment leading-relaxed">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {sourcesModal && (
        <SourcesModal
          open
          onClose={() => setSourcesModal(null)}
          sources={[voiceVerseToRetrieved(sourcesModal)]}
          citationsUsed={[sourcesModal.externalId]}
          initialVerseExternalId={sourcesModal.externalId}
        />
      )}
    </div>
  );
}

function playEndChime() {
  try {
    const audio = new Audio("/audio/call-end.ogg");
    audio.volume = 0.6;
    void audio.play().catch(() => undefined);
  } catch {
    // ignore — chime is decorative
  }
}
