import type { SessionConfig, VoiceVerse } from "./types";

// Pure WebRTC plumbing. No React. CallScreen wires this to its UI state.
//
// Lifecycle:
//   const client = new RealtimeClient(config);
//   client.on(handler);
//   await client.connect(localMicStream);
//   ... (events stream in) ...
//   client.sendToolResult(openaiToolCallId, { verses: [...] });
//   client.disconnect();

const REALTIME_BASE_URL = "https://api.openai.com/v1/realtime";

export type RealtimeEvent =
  | { type: "connected" }
  | { type: "disconnected"; reason?: string }
  | { type: "user_transcript"; text: string; itemId: string }
  | { type: "acharya_transcript_delta"; delta: string; responseId: string }
  | { type: "acharya_transcript_done"; text: string; responseId: string }
  | {
      type: "tool_call";
      name: "retrieve_scripture";
      args: { query: string; why?: string };
      callId: string; // OpenAI's internal tool-call id (NOT our voice callId)
    }
  | { type: "response_started"; responseId: string }
  | { type: "response_done"; responseId: string }
  | { type: "remote_audio_track"; stream: MediaStream }
  | { type: "error"; message: string };

type Handler = (event: RealtimeEvent) => void;

export class RealtimeClient {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private handlers = new Set<Handler>();
  private remoteStream: MediaStream | null = null;

  constructor(private config: SessionConfig) {}

  on(handler: Handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private emit(event: RealtimeEvent) {
    this.handlers.forEach((h) => h(event));
  }

  /** Open the peer connection. Caller must pass the user's mic stream. */
  async connect(localStream: MediaStream): Promise<void> {
    const pc = new RTCPeerConnection();
    this.pc = pc;

    // Inbound audio — Acharya's voice.
    this.remoteStream = new MediaStream();
    pc.ontrack = (ev) => {
      ev.streams[0]?.getTracks().forEach((t) => this.remoteStream!.addTrack(t));
      this.emit({ type: "remote_audio_track", stream: this.remoteStream! });
    };

    // Outbound audio — user's mic.
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

    // Data channel for events + tool I/O.
    const dc = pc.createDataChannel("oai-events");
    this.dc = dc;
    dc.onmessage = (e) => this.handleServerEvent(e.data);
    dc.onopen = () => this.emit({ type: "connected" });
    dc.onclose = () => this.emit({ type: "disconnected" });

    // SDP offer/answer with OpenAI.
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpRes = await fetch(
      `${REALTIME_BASE_URL}?model=${encodeURIComponent(this.config.model)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp ?? "",
      }
    );

    if (!sdpRes.ok) {
      const text = await sdpRes.text();
      this.emit({
        type: "error",
        message: `SDP exchange failed: ${sdpRes.status} ${text}`,
      });
      throw new Error(`SDP exchange failed: ${sdpRes.status}`);
    }

    const answerSdp = await sdpRes.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
  }

  /** Send a tool result back to the model for a given OpenAI tool-call id. */
  sendToolResult(
    openaiToolCallId: string,
    payload: { verses: VoiceVerse[]; rateLimited?: boolean; reason?: string }
  ) {
    if (!this.dc || this.dc.readyState !== "open") return;
    this.dc.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: openaiToolCallId,
          output: JSON.stringify(payload),
        },
      })
    );
    this.dc.send(JSON.stringify({ type: "response.create" }));
  }

  /** Force the model to produce its first response (used for the greeting). */
  triggerGreeting() {
    if (!this.dc || this.dc.readyState !== "open") return;
    this.dc.send(
      JSON.stringify({
        type: "response.create",
        response: {
          instructions: `Begin the call now. Speak the following greeting in your warm teacher voice, then await the user: "${this.config.greeting}"`,
        },
      })
    );
  }

  /** Cancel current response + inject a system message + force re-response.
   *  Used by the crisis monitor. */
  interruptWithSafetyScript(script: string) {
    if (!this.dc || this.dc.readyState !== "open") return;
    this.dc.send(JSON.stringify({ type: "response.cancel" }));
    this.dc.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "system",
          content: [{ type: "input_text", text: script }],
        },
      })
    );
    this.dc.send(
      JSON.stringify({
        type: "response.create",
        response: {
          instructions:
            "Speak the system message you just received, verbatim, in plain present voice — drop the persona.",
        },
      })
    );
  }

  disconnect() {
    try {
      this.dc?.close();
    } catch {
      // ignore
    }
    try {
      this.pc?.getSenders().forEach((s) => s.track?.stop());
      this.pc?.close();
    } catch {
      // ignore
    }
    this.dc = null;
    this.pc = null;
    this.remoteStream = null;
  }

  private handleServerEvent(raw: unknown) {
    if (typeof raw !== "string") return;
    let evt: { type: string; [k: string]: unknown };
    try {
      evt = JSON.parse(raw) as { type: string; [k: string]: unknown };
    } catch {
      return;
    }

    switch (evt.type) {
      case "conversation.item.input_audio_transcription.completed": {
        const text = (evt as { transcript?: string }).transcript ?? "";
        const itemId = (evt as { item_id?: string }).item_id ?? "";
        if (text) this.emit({ type: "user_transcript", text, itemId });
        return;
      }
      case "response.audio_transcript.delta": {
        const delta = (evt as { delta?: string }).delta ?? "";
        const responseId =
          (evt as { response_id?: string }).response_id ?? "";
        this.emit({ type: "acharya_transcript_delta", delta, responseId });
        return;
      }
      case "response.audio_transcript.done": {
        const text = (evt as { transcript?: string }).transcript ?? "";
        const responseId =
          (evt as { response_id?: string }).response_id ?? "";
        this.emit({ type: "acharya_transcript_done", text, responseId });
        return;
      }
      case "response.created": {
        const responseId =
          (evt as { response?: { id?: string } }).response?.id ?? "";
        this.emit({ type: "response_started", responseId });
        return;
      }
      case "response.done": {
        const responseId =
          (evt as { response?: { id?: string } }).response?.id ?? "";
        this.emit({ type: "response_done", responseId });
        return;
      }
      case "response.function_call_arguments.done": {
        const argsRaw = (evt as { arguments?: string }).arguments ?? "{}";
        const name = (evt as { name?: string }).name ?? "";
        const callId = (evt as { call_id?: string }).call_id ?? "";
        if (name !== "retrieve_scripture") return;
        try {
          const args = JSON.parse(argsRaw) as { query: string; why?: string };
          this.emit({
            type: "tool_call",
            name: "retrieve_scripture",
            args,
            callId,
          });
        } catch {
          this.emit({ type: "error", message: "tool args parse failed" });
        }
        return;
      }
      case "error": {
        const msg =
          (evt as { error?: { message?: string } }).error?.message ??
          "unknown";
        this.emit({ type: "error", message: msg });
        return;
      }
      default:
        // Many events flow through; we only surface the ones above. The rest
        // are ignored on purpose to keep the API small.
        return;
    }
  }

  /** Expose the remote audio stream for OmPulse's WebAudio analysis. */
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }
}
