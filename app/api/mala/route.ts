import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { getMalaState, getTapasState } from "@/lib/vrata/calculate";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const [mala, tapas] = await Promise.all([
    getMalaState(auth.userId),
    getTapasState(auth.userId),
  ]);

  return NextResponse.json({ mala, tapas });
}
