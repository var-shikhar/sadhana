import { krishnaGuruEn } from "./krishna_guru.en";
import { krishnaGuruHi } from "./krishna_guru.hi";

export type PersonaId = "krishna_guru";
export type Language = "en" | "hi";

export interface Persona {
  id: PersonaId;
  language: Language;
  /** The greeting the Acharya speaks first, before any user turn. */
  greeting: string;
  /** The instructions block passed to OpenAI Realtime as `instructions`.
   *  Should NOT include the practitioner snapshot or starter verses — the
   *  session route stitches those in. Should include placeholders:
   *    {{PRACTITIONER_STATE}}  — the buildPractitionerSnapshot block, or "" if none
   *    {{STARTER_CONTEXT}}     — the starter verses block, or "" if none
   */
  systemTemplate: string;
}

const registry: Record<PersonaId, Record<Language, Persona>> = {
  krishna_guru: {
    en: krishnaGuruEn,
    hi: krishnaGuruHi,
  },
};

export function getPersona(id: PersonaId, lang: Language): Persona {
  return registry[id][lang];
}

/** Render a Persona's systemTemplate with the runtime context blocks. */
export function renderSystemPrompt(
  persona: Persona,
  practitionerState: string,
  starterContext: string
): string {
  return persona.systemTemplate
    .replace(
      "{{PRACTITIONER_STATE}}",
      practitionerState ||
        "(none provided — speak from your own steadiness.)"
    )
    .replace(
      "{{STARTER_CONTEXT}}",
      starterContext ||
        "(no starter verses pre-loaded — call retrieve_scripture if you need grounding.)"
    );
}
