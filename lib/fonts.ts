import { Bodoni_Moda, Geist_Mono, Hanken_Grotesk, Schibsted_Grotesk, Source_Serif_4 } from "next/font/google";

/**
 * App chrome: Schibsted Grotesk (UI), Geist Mono (scores and measurements
 * only), Bodoni Moda (marketing display only).
 * Proof paper: Source Serif 4 and Hanken Grotesk, the same faces
 * lib/pdf/fonts.ts embeds in exported PDFs, so the page on screen matches
 * the download.
 */
const schibsted = Schibsted_Grotesk({ variable: "--font-schibsted", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});
const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"], display: "swap" });

export const fontVariables = [schibsted, geistMono, bodoni, sourceSerif, hanken].map((f) => f.variable).join(" ");
