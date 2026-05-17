"use server";

import { cookies } from "next/headers";
import { PALETTES, PALETTE_COOKIE_NAME, type Palette } from "@/lib/palette";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Persist the user's chosen palette as a cookie. Silently ignores invalid
 * values so a malformed client call cannot poison the cookie store.
 *
 * The cookie is NOT httpOnly because the Settings UI reads it (via a
 * server-rendered initial prop) and may need to inspect it for the
 * toggle's selected state. It is not security-sensitive.
 */
export async function setPaletteCookie(palette: Palette): Promise<void> {
  if (!(PALETTES as readonly string[]).includes(palette)) {
    return;
  }
  const store = await cookies();
  store.set(PALETTE_COOKIE_NAME, palette, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
}

/**
 * Clear the palette cookie. The root layout will fall back to
 * `NEXT_PUBLIC_PALETTE` (or `DEFAULT_PALETTE`) on the next render.
 */
export async function clearPaletteCookie(): Promise<void> {
  const store = await cookies();
  store.delete(PALETTE_COOKIE_NAME);
}
