/**
 * Visual palette selector — see
 * `docs/superpowers/specs/2026-05-16-palette-toggle-design.md`.
 *
 * Three named palettes are available. The active one is chosen at build time
 * via the `NEXT_PUBLIC_PALETTE` env var and stamped onto `<html data-palette>`
 * by the root layout. CSS variable overrides for `restraint` and `focus` live
 * in `app/globals.css` under `[data-palette="..."]` selectors.
 */

export const PALETTES = ["gurukul", "restraint", "focus"] as const;
export type Palette = (typeof PALETTES)[number];

export const DEFAULT_PALETTE: Palette = "gurukul";

/**
 * Validate a raw env value into a Palette. Unknown values, empty string, and
 * `undefined` all fall back to `DEFAULT_PALETTE` so a typo never breaks the
 * render — it just falls through to the current (gurukul) look.
 */
export function parsePalette(raw: string | undefined): Palette {
  if (!raw) return DEFAULT_PALETTE;
  return (PALETTES as readonly string[]).includes(raw)
    ? (raw as Palette)
    : DEFAULT_PALETTE;
}

/**
 * `<meta name="theme-color">` value for each palette. Mobile browser chrome
 * picks this up. Light palettes share the ivory page bg; `focus` uses its
 * near-black bg.
 */
export const PALETTE_THEME_COLOR: Record<Palette, string> = {
  gurukul: "#faf6ec",
  restraint: "#faf6ec",
  focus: "#0e0a06",
};
