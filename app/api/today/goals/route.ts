import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { getTodayGoals } from "@/lib/goals/today";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const goals = await getTodayGoals(auth.userId);
  return NextResponse.json(goals);
}
