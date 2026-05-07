import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { listGoalHistory } from "@/lib/goals/history";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const entries = await listGoalHistory(auth.userId, id);
  return NextResponse.json(entries);
}
