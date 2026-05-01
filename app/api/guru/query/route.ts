import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { retrieveForQuery } from "@/lib/scripture/retrieve";
import { synthesizeAnswer } from "@/lib/scripture/synthesize";

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
  };

  if (!body.query?.trim()) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  try {
    const retrieval = await retrieveForQuery(body.query.trim(), {
      topK: 6,
      neighborWindow: 2,
      boostTags: body.boostTags ?? [],
    });

    if (body.retrievalOnly) {
      return NextResponse.json({
        ...retrieval,
        answer: null,
        citationsUsed: [],
        modelUsed: null,
        brokeCharacter: false,
      });
    }

    const synthesis = await synthesizeAnswer({
      userQuery: body.query.trim(),
      retrievedVerses: retrieval.verses,
      conversationHistory: body.history,
    });

    return NextResponse.json({
      ...retrieval,
      answer: synthesis.answer,
      citationsUsed: synthesis.citationsUsed,
      modelUsed: synthesis.modelUsed,
      brokeCharacter: synthesis.brokeCharacter,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Counsel failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
