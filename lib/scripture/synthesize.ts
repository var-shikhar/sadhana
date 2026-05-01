import type { RetrievedVerse } from "./retrieve"

/**
 * The Acharya speaks in the voice of Krishna to Arjuna — grounded ENTIRELY
 * in the verses retrieved from the corpus. Citation discipline is enforced
 * post-generation: any [TEXT_X.Y] reference not present in the retrieved set
 * is stripped before the answer reaches the user.
 *
 * Model: GPT-4o (paid, quality-first per the user's stated preference).
 * Future swap to Claude requires changing this file only.
 */

/**
 * Model selection is env-driven. Default to GPT-5 nano for cost/speed.
 * Override via OPENAI_MODEL=gpt-4o-mini, OPENAI_MODEL=gpt-4o, etc.
 *
 * Cost reference (per 1M tokens, approx):
 *   gpt-5-nano   →  ~$0.05 in / ~$0.40 out  (cheapest, fast)
 *   gpt-4o-mini  →  $0.15 in / $0.60 out    (balanced)
 *   gpt-4o       →  $2.50 in / $10.00 out   (highest quality)
 */
const MODEL = process.env.OPENAI_MODEL || "gpt-5-nano"
const MAX_OUTPUT_TOKENS = 700

const SYSTEM_PROMPT = `You are an Acharya — a teacher speaking in the voice of Krishna to Arjuna, the friend on the chariot of the user's life. You are grounded entirely in the Vedic-Yogic tradition: Bhagavad Gita, Yoga Sutras of Patanjali, and the principal Upanishads.

VOICE:
- Address the user as "Partha", "friend", or simply "you" — never the neutral therapist tone.
- Speak with the gravity of a teacher who has watched many practitioners arrive and depart. Sometimes severe, sometimes tender.
- Use Sanskrit terms with a light gloss on first use only — "abhyasa (sustained practice)", "vairagya (non-attachment)".
- Never use modern self-help language: avoid "you've got this", "manifestation", "best self", "self-care", "growth mindset".

CITATION DISCIPLINE — NON-NEGOTIABLE:
- You may ONLY cite verses present in the SCRIPTURE_CONTEXT below.
- Inline citation format: [BG 2.47], [YS 1.30], [KU_1.3.14]. Use the EXACT externalId shown for each verse.
- Cite when quoting or paraphrasing a specific verse.
- If you reference a general teaching not directly in the context, write "in the spirit of the texts" — do NOT fabricate a citation.
- If NO retrieved verse fits the user's question, say so honestly: "What you describe is not directly addressed in the verses I have here. The closest is..."

ANSWER STRUCTURE:
- 3 to 5 short paragraphs.
- Open by naming what is happening for the user (mirror).
- Quote or paraphrase one to three relevant verses with citations.
- Close with either a question (Socratic) or one small, concrete suggestion.
- Never give a numbered list of tips.

SAFETY (BREAK CHARACTER):
- If the user expresses suicidal ideation, severe distress, abuse, or asks for medical/psychiatric advice, drop the persona and respond plainly: "What you are carrying is beyond what these texts (or I) can hold. Please reach a real person — in India: iCall (9152987821) or AASRA (91-22-27546669); elsewhere, a crisis line or a trusted friend — today."`

interface SynthesisInput {
  userQuery: string
  retrievedVerses: RetrievedVerse[]
  conversationHistory?: Array<{ role: "user" | "acharya"; text: string }>
}

export interface SynthesisResult {
  answer: string
  citationsUsed: string[] // externalIds actually cited in the answer
  retrievedExternalIds: string[] // all that were available
  modelUsed: string
  brokeCharacter: boolean // true if a safety response triggered
}

function formatVerseForContext(v: RetrievedVerse): string {
  // Use the matched translation if available, else the first translation.
  const t = v.matchedText
    ? { text: v.matchedText, translator: v.matchedTranslator ?? "unknown" }
    : v.translations[0]
      ? {
          text: v.translations[0].englishText,
          translator: v.translations[0].translator,
        }
      : null
  if (!t) return ""
  return `[${v.externalId}] (${t.translator}): "${t.text}"`
}

/**
 * Strip any [TEXT_X.Y] citation that is NOT in the retrieved set.
 * Returns the cleaned answer and the list of valid citations actually used.
 */
function validateCitations(
  rawAnswer: string,
  retrievedExternalIds: Set<string>,
): { cleaned: string; citationsUsed: string[] } {
  const citationRegex = /\[([A-Za-z]+_?[\d.]+)\]/g
  const citationsUsed = new Set<string>()
  let cleaned = rawAnswer

  // Pass 1: collect all referenced citations
  const matches = Array.from(rawAnswer.matchAll(citationRegex))
  for (const m of matches) {
    const id = m[1]
    if (retrievedExternalIds.has(id)) {
      citationsUsed.add(id)
    } else {
      // Strip unauthorized citation — replace `[XYZ]` with empty string.
      // The model has already paraphrased around it, so the prose still flows.
      cleaned = cleaned.replace(m[0], "")
    }
  }

  // Tidy up double spaces or stray punctuation left by stripped citations
  cleaned = cleaned
    .replace(/\s+\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim()

  return { cleaned, citationsUsed: Array.from(citationsUsed) }
}

/**
 * Crude crisis-keyword check. Triggers a "break character" plain-English
 * response from the Acharya per the safety rule. The model is also told
 * about this in the system prompt; this is a belt-and-suspenders backup.
 */
const CRISIS_PATTERNS = [
  /\bsuicid/i,
  /\bkill\s+myself/i,
  /\bend\s+(my\s+)?life/i,
  /\bharm\s+myself/i,
  /\bcutting\b/i,
  /\babuse(d)?\s+by/i,
  /\bbeaten\s+by/i,
  /\bcan'?t\s+go\s+on\b/i,
]

function detectsCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((rx) => rx.test(text))
}

const CRISIS_RESPONSE = `What you are carrying is beyond what these texts — or I — can hold alone. Please reach a real person today.

In India: **iCall** at 9152987821, or **AASRA** at 91-22-27546669. Both are free, confidential, and answer in your language.

Outside India: a local crisis line, your doctor, or a trusted friend. Even one phone call.

The Acharya will be here when you return. The path is not going anywhere.`

export async function synthesizeAnswer(
  input: SynthesisInput,
): Promise<SynthesisResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.")
  }

  // Crisis pre-check
  if (detectsCrisis(input.userQuery)) {
    return {
      answer: CRISIS_RESPONSE,
      citationsUsed: [],
      retrievedExternalIds: input.retrievedVerses.map((v) => v.externalId),
      modelUsed: "safety-prefilter",
      brokeCharacter: true,
    }
  }

  const retrievedExternalIds = new Set(
    input.retrievedVerses.map((v) => v.externalId),
  )

  const contextBlock = input.retrievedVerses
    .map(formatVerseForContext)
    .filter(Boolean)
    .join("\n")

  const messages: Array<{
    role: "system" | "user" | "assistant"
    content: string
  }> = [{ role: "system", content: SYSTEM_PROMPT }]

  // Conversation history (last 4 turns max — 2 user + 2 acharya)
  if (input.conversationHistory) {
    const recent = input.conversationHistory.slice(-4)
    for (const turn of recent) {
      messages.push({
        role: turn.role === "user" ? "user" : "assistant",
        content: turn.text,
      })
    }
  }

  // Current turn — user query + retrieved scripture context
  messages.push({
    role: "user",
    content: `USER QUESTION: ${input.userQuery}

SCRIPTURE_CONTEXT (the only verses you may cite by their bracketed id):
${contextBlock || "(no verses retrieved — answer honestly that the texts you have do not directly address this question, and offer presence without fabricated citation.)"}`,
  })

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_completion_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.6,
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`OpenAI synthesis error ${res.status}: ${errorText}`)
  }

  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  const rawAnswer = json.choices[0]?.message?.content?.trim() ?? ""

  // Citation validation — strip any citation the model invented
  const { cleaned, citationsUsed } = validateCitations(
    rawAnswer,
    retrievedExternalIds,
  )

  return {
    answer: cleaned,
    citationsUsed,
    retrievedExternalIds: Array.from(retrievedExternalIds),
    modelUsed: MODEL,
    brokeCharacter: false,
  }
}
