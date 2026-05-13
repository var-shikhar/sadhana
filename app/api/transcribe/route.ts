import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Transcribe a short audio clip via OpenAI Whisper. Used as the fallback when
 * the browser's Web Speech API is unavailable (Brave strips Google STT keys;
 * Firefox doesn't ship SpeechRecognition; some Chromium forks block too).
 *
 * Expects multipart/form-data with:
 *   - audio: a Blob (webm/opus, mp4, wav — anything Whisper accepts)
 *   - lang:  optional BCP-47 tag from the client ("en-US", "hi-IN", ...).
 *           We pass only the ISO-639-1 prefix to Whisper.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set." },
      { status: 500 }
    );
  }

  const incoming = await request.formData();
  const file = incoming.get("audio");
  const langTag = incoming.get("lang");

  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json(
      { error: "audio_required" },
      { status: 400 }
    );
  }

  // Cap upload size at 25MB (Whisper's hard limit).
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json(
      { error: "audio_too_large" },
      { status: 413 }
    );
  }

  const upstream = new FormData();
  upstream.append("file", file, "audio.webm");
  upstream.append("model", "whisper-1");
  upstream.append("response_format", "json");
  if (typeof langTag === "string" && langTag.length >= 2) {
    // Whisper takes ISO-639-1 ("en", "hi"). Our affirmation tags are
    // "en-US" / "hi-IN" / "hi-Latn-IN" — the first two chars give us
    // the right hint in every current case.
    upstream.append("language", langTag.slice(0, 2));
  }

  const res = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    }
  );

  if (!res.ok) {
    const details = await res.text().catch(() => "");
    console.error("[transcribe] whisper upstream failed:", res.status, details);
    return NextResponse.json(
      { error: "transcribe_failed", status: res.status },
      { status: 502 }
    );
  }

  const json = (await res.json()) as { text?: string };
  return NextResponse.json({ text: (json.text ?? "").trim() });
}
