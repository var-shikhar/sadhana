import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { finalizeSessionRow } from "@/lib/voice/usage";
import { release } from "@/lib/voice/tool-rate-limiter";

interface RequestBody {
  callId?: string;
  durationSec?: number;
  brokeCharacter?: boolean;
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as RequestBody;
  if (!body.callId || typeof body.durationSec !== "number") {
    return NextResponse.json(
      { error: "callId and durationSec are required" },
      { status: 400 }
    );
  }

  await finalizeSessionRow({
    callId: body.callId,
    userId: auth.userId,
    durationSec: body.durationSec,
    brokeCharacter: !!body.brokeCharacter,
  });

  // Free the in-memory rate-limit entry now that the call is over.
  release(body.callId);

  return NextResponse.json({ ok: true });
}
