import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { retrieveForQuery } from "@/lib/scripture/retrieve";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as {
    query?: string;
    boostTags?: string[];
  };

  if (!body.query?.trim()) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  try {
    const result = await retrieveForQuery(body.query.trim(), {
      topK: 5,
      neighborWindow: 3,
      boostTags: body.boostTags ?? [],
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Retrieval failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
