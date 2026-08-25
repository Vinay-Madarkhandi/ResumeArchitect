import { Archivo, Instrument_Serif, Source_Serif_4, Space_Mono } from "next/font/google";

/**
 * Typeface strategy: two separate identities, deliberately kept apart.
 *
 * App chrome (nav, buttons, headings, marketing copy) uses Archivo for UI
 * text, Instrument Serif for display headlines/the wordmark, and Space Mono
 * for metadata/labels — the app's own editorial visual identity.
 *
 * The resume DOCUMENT itself (the editor canvas and the exported PDF) keeps
 * Source Serif 4 regardless of app-chrome redesigns: it's the actual
 * deliverable a hiring manager reads, and lib/pdf/fonts.ts embeds this same
 * family as real font files for @react-pdf/renderer — changing it means
 * sourcing and embedding new font assets, not just swapping a CSS variable,
 * so it's out of scope for a chrome-only redesign.
 */

export const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

export const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const fontVariables = `${archivo.variable} ${instrumentSerif.variable} ${sourceSerif4.variable} ${spaceMono.variable}`;
