import {
  detectsCrisis,
  getCrisisResponseForLang,
} from "@/lib/safety/crisis-patterns";
import type { RealtimeClient } from "./realtime-client";

/** Wires the crisis check into a RealtimeClient's user-transcript stream.
 *  Returns an unsubscribe fn and a getter for whether character was broken
 *  during the call (so /end can record it). */
export function attachCrisisMonitor(
  client: RealtimeClient,
  language: "en" | "hi"
): { dispose: () => void; brokeCharacter: () => boolean } {
  let broke = false;
  const off = client.on((evt) => {
    if (evt.type !== "user_transcript") return;
    if (broke) return; // one-shot per call — don't keep interrupting
    if (!detectsCrisis(evt.text)) return;
    broke = true;
    const script = getCrisisResponseForLang(language);
    client.interruptWithSafetyScript(script);
  });
  return {
    dispose: () => off(),
    brokeCharacter: () => broke,
  };
}
