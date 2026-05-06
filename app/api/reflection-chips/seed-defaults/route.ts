import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { seedDefaultChipsIfEmpty } from "@/lib/reflection/default-chips";

export async function POST() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const inserted = await seedDefaultChipsIfEmpty(auth.userId);
  return NextResponse.json({ inserted });
}
