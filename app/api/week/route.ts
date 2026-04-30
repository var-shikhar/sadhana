import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { getWeekSummary } from "@/lib/week/summary";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const summary = await getWeekSummary(auth.userId);
  return NextResponse.json(summary);
}
