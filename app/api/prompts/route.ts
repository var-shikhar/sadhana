import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { observeNudges } from "@/lib/prompts/observer";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const nudges = await observeNudges(auth.userId);
  return NextResponse.json(nudges);
}
