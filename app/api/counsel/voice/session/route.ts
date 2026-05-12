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

  // 5. Mint ephemeral token from OpenAI Realtime.
  //
  // The session-create endpoint accepts our system instructions, voice, and
  // tool spec, then returns a short-lived client_secret the browser uses to
  // open its WebRTC peer connection. The OPENAI_API_KEY never leaves this
  // server.
  const sessionRes = await fetch(
    "https://api.openai.com/v1/realtime/sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: REALTIME_MODEL,
        voice: REALTIME_VOICE,
        modalities: ["audio", "text"],
        instructions,
        input_audio_transcription: { model: "whisper-1" },
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
      }),
    }
  );

  if (!sessionRes.ok) {
    const text = await sessionRes.text();
    return NextResponse.json(
      { error: "openai_session_mint_failed", details: text },
      { status: 502 }
    );
  }

  const sessionJson = (await sessionRes.json()) as {
    id: string;
    client_secret: { value: string; expires_at: number };
  };

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
    ephemeralKey: sessionJson.client_secret.value,
    expiresAt: sessionJson.client_secret.expires_at,
    model: REALTIME_MODEL,
    voice: REALTIME_VOICE,
    greeting: persona.greeting,
    language,
  });
}
