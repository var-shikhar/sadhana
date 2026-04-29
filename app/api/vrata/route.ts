import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import {
  getVrataState,
  declareVrata,
  abandonActiveVrata,
} from "@/lib/vrata/calculate";
import { VRATA_LENGTHS } from "@/types";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const state = await getVrataState(auth.userId);
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { lengthName, boundHabitIds, sankalpa } = body as {
    lengthName: (typeof VRATA_LENGTHS)[number]["name"];
    boundHabitIds: string[];
    sankalpa: string | null;
  };

  const lengthDef = VRATA_LENGTHS.find((l) => l.name === lengthName);
  if (!lengthDef) {
    return NextResponse.json({ error: "Invalid vrata length" }, { status: 400 });
  }
  if (!Array.isArray(boundHabitIds) || boundHabitIds.length === 0) {
    return NextResponse.json(
      { error: "At least one offering must be bound to the vrata" },
      { status: 400 }
    );
  }

  try {
    const vrata = await declareVrata({
      userId: auth.userId,
      lengthName,
      baseDays: lengthDef.baseDays,
      boundHabitIds,
      sankalpa: sankalpa?.trim() || null,
    });
    return NextResponse.json(vrata);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not declare vrata" },
      { status: 409 }
    );
  }
}

export async function DELETE() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  await abandonActiveVrata(auth.userId);
  return NextResponse.json({ success: true });
}
