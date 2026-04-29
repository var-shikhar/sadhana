import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond, Eczar } from "next/font/google";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#faf6ec",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${ui.variable} ${lyric.variable} ${pressure.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
