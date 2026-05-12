"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { OmPulse } from "./OmPulse";
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
          const body = await sessRes.json().catch(() => ({}));
          throw new Error(
            body.message || body.error || `session ${sessRes.status}`
          );
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
            case "user_transcript":
              turnsRef.current.push({
                role: "user",
                text: evt.text,
                at: Date.now(),
              });
              setStatus("acharya_speaking");
              return;
            case "response_started":
              setStatus("acharya_speaking");
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

  // 3. Cleanup on unmount
  useEffect(() => {
    return () => {
      // Best-effort: end the call cleanly if the user navigated away.
      if (!endingRef.current) {
        void endCall().catch(() => undefined);
      }
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

  async function endCall() {
    if (endingRef.current) return;
    endingRef.current = true;

    const broke = monitorRef.current?.brokeCharacter() ?? false;
    const durationSec = startedAtRef.current
      ? Math.floor((Date.now() - startedAtRef.current) / 1000)
      : 0;

    // 1. Persist transcript locally
    if (turnsRef.current.length > 0) {
      appendVoiceTranscript(turnsRef.current, durationSec);
    }

    // 2. Tell server about the duration
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

    setStatus("ended");
    router.replace("/counsel");
  }

  function toggleMute() {
    if (!localStream) return;
    const next = !muted;
    localStream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
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

      <div className="flex-1 flex flex-col items-center justify-center gap-10 pb-32">
        <OmPulse
          remoteStream={remoteStream}
          localStream={localStream}
          size={220}
        />
        <CallStatus status={status} language={language} />
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
