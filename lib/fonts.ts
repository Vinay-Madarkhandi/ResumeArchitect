import { Hanken_Grotesk, JetBrains_Mono, Source_Serif_4 } from "next/font/google";

/**
 * "Executive Precision" typeface strategy (see public/UI template/executive_precision/DESIGN.md):
 * Hanken Grotesk for interface UI, Source Serif 4 for document/resume content,
 * JetBrains Mono for metadata/labels. Self-hosted at build time via next/font
 * (no external request, no CLS, unlike the mockups' raw <link> tags).
 */

export const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const fontVariables = `${hankenGrotesk.variable} ${sourceSerif4.variable} ${jetBrainsMono.variable}`;
