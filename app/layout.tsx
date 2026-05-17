import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond, Eczar } from "next/font/google";
import { cookies } from "next/headers";
import { Providers } from "./providers";
import {
  PALETTE_COOKIE_NAME,
  PALETTE_THEME_COLOR,
  resolvePalette,
} from "@/lib/palette";
import "./globals.css";

const ui = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ui",
});

const lyric = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-lyric",
});

const pressure = Eczar({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-pressure",
});

export const metadata: Metadata = {
  title: "Sadhana — Your Daily Practice",
  description: "Your daily practice. Your 1% better.",
  manifest: "/manifest.json",
};

async function readPalette() {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(PALETTE_COOKIE_NAME)?.value;
  return resolvePalette(cookieValue, process.env.NEXT_PUBLIC_PALETTE);
}

export async function generateViewport(): Promise<Viewport> {
  const palette = await readPalette();
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: PALETTE_THEME_COLOR[palette],
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const palette = await readPalette();
  return (
    <html lang="en" data-palette={palette}>
      <body className={`${ui.variable} ${lyric.variable} ${pressure.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
