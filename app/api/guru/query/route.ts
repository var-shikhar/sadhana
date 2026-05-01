import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { retrieveForQuery } from "@/lib/scripture/retrieve";
import { synthesizeAnswer } from "@/lib/scripture/synthesize";
import {
  buildPractitionerSnapshot,
  formatSnapshotForPrompt,
} from "@/lib/acharya/practitioner-context";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as {
    query?: string;
    boostTags?: string[];
    /** Optional past turns for conversational memory */
    history?: Array<{ role: "user" | "acharya"; text: string }>;
    /** Skip LLM synthesis if true — return retrieval only (debug mode) */
    retrievalOnly?: boolean;
    /** Opt out of personalized context — answers from scripture alone */
    skipPersonalization?: boolean;
  };

  if (!body.query?.trim()) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  try {
    // Pull the practitioner's recent state in parallel with retrieval setup.
    // The snapshot informs both retrieval (boost tags) and synthesis (the
    // Acharya speaks to *this* practitioner, not a generic seeker).
    const snapshotPromise = body.skipPersonalization
      ? Promise.resolve(null)
      : buildPractitionerSnapshot(auth.userId).catch((e) => {
          console.error("[counsel] practitioner snapshot failed:", e);
          return null;
        });

    const snapshot = await snapshotPromise;

    // Merge caller-supplied boost tags with derived ones from user state.
    const mergedBoostTags = Array.from(
      new Set([...(body.boostTags ?? []), ...(snapshot?.derivedTags ?? [])])
    );

    const retrieval = await retrieveForQuery(body.query.trim(), {
      topK: 6,
      neighborWindow: 2,
      boostTags: mergedBoostTags,
    });

    if (body.retrievalOnly) {
      return NextResponse.json({
        ...retrieval,
        answer: null,
        citationsUsed: [],
        modelUsed: null,
        brokeCharacter: false,
        practitionerTags: snapshot?.derivedTags ?? [],
      });
    }

    const synthesis = await synthesizeAnswer({
      userQuery: body.query.trim(),
      retrievedVerses: retrieval.verses,
      conversationHistory: body.history,
      practitionerContext: snapshot ? formatSnapshotForPrompt(snapshot) : null,
    });

    return NextResponse.json({
      ...retrieval,
      answer: synthesis.answer,
      citationsUsed: synthesis.citationsUsed,
      modelUsed: synthesis.modelUsed,
      brokeCharacter: synthesis.brokeCharacter,
      practitionerTags: snapshot?.derivedTags ?? [],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Counsel failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
