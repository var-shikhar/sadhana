// Shared crisis detection used by both text Counsel (synthesize.ts) and
// voice Counsel (the realtime crisis monitor). Source of truth for both.

export const CRISIS_PATTERNS: RegExp[] = [
  /\bsuicid/i,
  /\bkill\s+myself/i,
  /\bend\s+(my\s+)?life/i,
  /\bharm\s+myself/i,
  /\bcutting\b/i,
  /\babuse(d)?\s+by/i,
  /\bbeaten\s+by/i,
  /\bcan'?t\s+go\s+on\b/i,
];

export function detectsCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((rx) => rx.test(text));
}

// English crisis response — used by text Counsel and (verbatim, spoken aloud
// by the model) by voice Counsel.
export const CRISIS_RESPONSE_EN = `What you are carrying is beyond what these texts — or I — can hold alone. Please reach a real person today.

In India: **iCall** at 9152987821, or **AASRA** at 91-22-27546669. Both are free, confidential, and answer in your language.

Outside India: a local crisis line, your doctor, or a trusted friend. Even one phone call.

The Acharya will be here when you return. The path is not going anywhere.`;

// Hindi version — only used by voice Counsel in Hindi mode. Plain language,
// drops the persona, gives the same hotlines.
export const CRISIS_RESPONSE_HI = `जो आप उठा रहे हैं — वह इन ग्रंथों या मेरे अकेले समेटने से परे है। आज ही किसी असली व्यक्ति तक पहुँचिए।

भारत में: **iCall** — 9152987821, या **AASRA** — 91-22-27546669। दोनों निःशुल्क, गोपनीय हैं और आपकी भाषा में उत्तर देते हैं।

भारत के बाहर: स्थानीय हेल्पलाइन, अपने डॉक्टर, या किसी भरोसेमंद मित्र को फ़ोन कीजिए। एक कॉल भी पर्याप्त है।

आचार्य यहीं रहेंगे जब आप लौटेंगे। मार्ग कहीं नहीं जा रहा।`;

export function getCrisisResponseForLang(lang: "en" | "hi"): string {
  return lang === "hi" ? CRISIS_RESPONSE_HI : CRISIS_RESPONSE_EN;
}
