import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { retrieveForQuery, type RetrievedVerse } from "@/lib/scripture/retrieve";
import {
  buildPractitionerSnapshot,
  formatSnapshotForPrompt,
} from "@/lib/acharya/practitioner-context";
import {
  getPersona,
  renderSystemPrompt,
  type Language,
  type PersonaId,
} from "@/lib/voice/personas";
import {
  getTodaySecondsUsed,
  insertSessionRow,
  MAX_DAILY_SECONDS,
} from "@/lib/voice/usage";

const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime";
const REALTIME_VOICE = process.env.OPENAI_REALTIME_VOICE || "cedar";
// Transcription model for the user's speech → text. Options on OpenAI:
//   gpt-4o-mini-transcribe  — recommended default. Better punctuation
//                             and fewer hallucinations than whisper-1,
//                             same ~$0.003/min ballpark.
//   gpt-4o-transcribe       — highest quality, ~$0.006/min.
//   whisper-1               — legacy fallback.
// Override via env if you want to A/B without code changes.
const TRANSCRIPTION_MODEL =
  process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe";

interface RequestBody {
  language?: Language;
  personaId?: PersonaId;
  boostTags?: string[];
}

/** Format a verse for the STARTER_CONTEXT block. Mirrors the shape used in
 *  lib/scripture/synthesize.ts so the model sees a consistent format. */
function formatVerseForContext(v: RetrievedVerse): string {
  const t = v.matchedText
    ? { text: v.matchedText, translator: v.matchedTranslator ?? "unknown" }
    : v.translations[0]
      ? {
          text: v.translations[0].englishText,
          translator: v.translations[0].translator,
        }
      : null;
  if (!t) return "";
  return `[${v.externalId}] (${t.translator}): "${t.text}"`;
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const language: Language = body.language === "hi" ? "hi" : "en";
  const personaId: PersonaId = body.personaId ?? "krishna_guru";

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set." },
      { status: 500 }
    );
  }

  // 1. Daily-budget check
  const usedToday = await getTodaySecondsUsed(auth.userId);
  if (usedToday >= MAX_DAILY_SECONDS) {
    return NextResponse.json(
      {
        error: "daily_budget_exhausted",
        message:
          language === "hi"
            ? "आज आचार्य के साथ आपका समय पूरा हो गया है। कल लौटिए।"
            : "You have already spent your time with the Acharya today. Return tomorrow.",
        secondsUsed: usedToday,
        secondsLimit: MAX_DAILY_SECONDS,
      },
      { status: 429 }
    );
  }

  // 2. Practitioner snapshot
  const snapshot = await buildPractitionerSnapshot(auth.userId).catch((e) => {
    console.error("[voice/session] practitioner snapshot failed:", e);
    return null;
  });
  const practitionerBlock = snapshot ? formatSnapshotForPrompt(snapshot) : "";

  // 3. Starter retrieval (top 6, biased by user tags)
  const boostTags = Array.from(
    new Set([...(body.boostTags ?? []), ...(snapshot?.derivedTags ?? [])])
  );
  const starterRetrieval = await retrieveForQuery(
    "guidance for daily practice and inner steadiness",
    { topK: 6, neighborWindow: 1, boostTags }
  ).catch((e) => {
    console.error("[voice/session] starter retrieval failed:", e);
    return { verses: [] as RetrievedVerse[] };
  });
  const starterBlock = starterRetrieval.verses
    .map(formatVerseForContext)
    .filter(Boolean)
    .join("\n");

  // 4. Compose the system prompt
  const persona = getPersona(personaId, language);
  const instructions = renderSystemPrompt(
    persona,
    practitionerBlock,
    starterBlock
  );

  // 5. Mint ephemeral token from OpenAI Realtime (GA API).
  //
  // The GA endpoint is /v1/realtime/client_secrets — replaces the Beta
  // /v1/realtime/sessions, which was disabled in late 2025. The body is
  // wrapped in a `session` envelope; audio config is nested under
  // audio.input / audio.output. Response is flat: { value, expires_at }.
  // The OPENAI_API_KEY never leaves this server.
  const sessionRes = await fetch(
    "https://api.openai.com/v1/realtime/client_secrets",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: REALTIME_MODEL,
          instructions,
          // Explicit audio output — paired with audio.output.voice below.
          // GA emits transcript events alongside audio when this is set.
          output_modalities: ["audio"],
          audio: {
            input: {
              transcription: { model: TRANSCRIPTION_MODEL },
              // Turn-end detection. The default (server_vad with
              // silence_duration_ms ~200) cuts the user off after the
              // briefest pause — wrong for a listening companion, where
              // thoughtful pauses mid-sentence are the norm. semantic_vad
              // uses a small model to decide if the user is actually done,
              // and `eagerness: "low"` biases it toward waiting longer.
              turn_detection: {
                type: "semantic_vad",
                eagerness: "low",
                create_response: true,
                interrupt_response: true,
              },
            },
            output: {
              voice: REALTIME_VOICE,
            },
          },
          tools: [
            {
              type: "function",
              name: "retrieve_scripture",
              description:
                "Retrieve verses from the Vedic-Yogic corpus (Bhagavad Gita, Yoga Sutras, principal Upanishads). Call only when you need verses you don't already have in your STARTER_CONTEXT or earlier tool results. Returns verses you may draw on as inspiration; you must NEVER name them aloud — the user sees them as on-screen cards.",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description:
                      "A semantic query — what is the user really asking about? Aim for 5–15 words.",
                  },
                  why: {
                    type: "string",
                    description:
                      "One short line explaining why this retrieval is needed now (logged for our metrics).",
                  },
                },
                required: ["query"],
              },
            },
          ],
        },
      }),
    }
  );

  if (!sessionRes.ok) {
    const text = await sessionRes.text();
    // Log on the server so you can see the exact OpenAI reply in your
    // dev terminal — this is the single most useful diagnostic when the
    // mint fails (wrong model name, no realtime access, etc.).
    console.error(
      `[voice/session] OpenAI mint failed: ${sessionRes.status} ${sessionRes.statusText}\n  model=${REALTIME_MODEL} voice=${REALTIME_VOICE}\n  body=${text}`
    );
    // Try to extract a human-readable message from OpenAI's JSON envelope.
    let humanMessage = text;
    try {
      const parsed = JSON.parse(text) as {
        error?: { message?: string; code?: string; type?: string };
      };
      if (parsed.error?.message) {
        humanMessage = parsed.error.message;
        if (parsed.error.code) {
          humanMessage = `${parsed.error.code}: ${humanMessage}`;
        }
      }
    } catch {
      // not JSON — leave as raw text
    }
    return NextResponse.json(
      {
        error: "openai_session_mint_failed",
        message: humanMessage,
        status: sessionRes.status,
        model: REALTIME_MODEL,
        voice: REALTIME_VOICE,
        details: text,
      },
      { status: 502 }
    );
  }

  // GA returns { value, expires_at } at the top level. Defensive fallback to
  // the legacy nested shape in case OpenAI flips it back during the rollout.
  const sessionJson = (await sessionRes.json()) as {
    value?: string;
    expires_at?: number;
    client_secret?: { value?: string; expires_at?: number };
  };
  const ephemeralKey =
    sessionJson.value ?? sessionJson.client_secret?.value ?? null;
  const expiresAt =
    sessionJson.expires_at ?? sessionJson.client_secret?.expires_at ?? 0;

  if (!ephemeralKey) {
    console.error(
      "[voice/session] OpenAI returned 200 but no ephemeral key in body:",
      JSON.stringify(sessionJson)
    );
    return NextResponse.json(
      {
        error: "openai_session_no_key",
        message:
          "OpenAI accepted the request but did not return an ephemeral key.",
      },
      { status: 502 }
    );
  }

  // 6. Persist a usage row up-front (duration starts at 0; /end updates it).
  const callId = randomUUID();
  await insertSessionRow({
    callId,
    userId: auth.userId,
    personaId,
    language,
  });

  return NextResponse.json({
    callId,
    ephemeralKey,
    expiresAt,
    model: REALTIME_MODEL,
    voice: REALTIME_VOICE,
    greeting: persona.greeting,
    language,
  });
}
