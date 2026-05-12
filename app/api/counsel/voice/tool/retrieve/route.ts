import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { retrieveForQuery } from "@/lib/scripture/retrieve";
import { callBelongsToUser } from "@/lib/voice/usage";
import { checkAndConsume } from "@/lib/voice/tool-rate-limiter";

interface RequestBody {
  callId?: string;
  query?: string;
  why?: string;
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as RequestBody;
  if (!body.callId || !body.query?.trim()) {
    return NextResponse.json(
      { error: "callId and query are required" },
      { status: 400 }
    );
  }

  // Defense-in-depth: only the user who owns the call can run its tool.
  const owns = await callBelongsToUser(body.callId, auth.userId);
  if (!owns) {
    return NextResponse.json({ error: "callId not found" }, { status: 404 });
  }

  const limit = checkAndConsume(body.callId);
  if (!limit.allowed) {
    // The model receives this and is instructed (in its system prompt) to
    // speak from existing context instead of retrying.
    return NextResponse.json({
      verses: [],
      rateLimited: true,
      reason: limit.reason,
    });
  }

  const retrieval = await retrieveForQuery(body.query.trim(), {
    topK: 3,
    neighborWindow: 0,
  }).catch((e) => {
    console.error("[voice/tool/retrieve] retrieval failed:", e);
    return null;
  });

  if (!retrieval) {
    return NextResponse.json({
      verses: [],
      rateLimited: false,
      error: "retrieval_failed",
    });
  }

  // Slim shape — the realtime tool result should stay lean.
  const verses = retrieval.verses.map((v) => ({
    externalId: v.externalId,
    book: v.book,
    chapter: v.chapter,
    verse: v.verse,
    sanskritDevanagari: v.sanskritDevanagari,
    translator:
      v.matchedTranslator ?? v.translations[0]?.translator ?? "unknown",
    englishText: v.matchedText ?? v.translations[0]?.englishText ?? "",
    similarity: v.similarity,
  }));

  // why is just logged for visibility — not surfaced to the user.
  if (body.why) {
    console.log(`[voice/tool/retrieve] call=${body.callId} why=${body.why}`);
  }

  return NextResponse.json({ verses, rateLimited: false });
}
