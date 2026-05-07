import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { listSubGoals } from "@/lib/goals/progress";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id: parentId } = await context.params;

  const subs = await listSubGoals(auth.userId, parentId);
  return NextResponse.json(subs);
}
