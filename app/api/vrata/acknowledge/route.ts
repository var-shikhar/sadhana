import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { acknowledgeSlips } from "@/lib/vrata/calculate";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as { slipIds: string[] };
  if (!Array.isArray(body.slipIds)) {
    return NextResponse.json({ error: "slipIds[] required" }, { status: 400 });
  }

  await acknowledgeSlips(auth.userId, body.slipIds);
  return NextResponse.json({ success: true });
}
