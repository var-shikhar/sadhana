import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { logGoalProgress, unlogGoalProgress } from "@/lib/goals/progress";

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id: goalId } = await context.params;

  const body = (await request.json().catch(() => ({}))) as {
    date?: string;
    value?: number;
    note?: string | null;
  };

  const log = await logGoalProgress({
    userId: auth.userId,
    goalId,
    date: body.date || todayYmd(),
    value: body.value ?? 1,
    note: body.note ?? null,
  });
  return NextResponse.json(log);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id: goalId } = await context.params;
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || todayYmd();

  await unlogGoalProgress(auth.userId, goalId, date);
  return NextResponse.json({ success: true });
}
