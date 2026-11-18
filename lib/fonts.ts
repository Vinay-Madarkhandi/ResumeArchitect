import { Bodoni_Moda, Geist_Mono, Schibsted_Grotesk } from "next/font/google";
import localFont from "next/font/local";

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
const sourceSerif = localFont({
  variable: "--font-source-serif",
  display: "swap",
  src: [
    { path: "../public/fonts/SourceSerif4-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/SourceSerif4-Italic.ttf", weight: "400", style: "italic" },
    { path: "../public/fonts/SourceSerif4-SemiBold.ttf", weight: "600", style: "normal" },
  ],
});
const hanken = localFont({
  variable: "--font-hanken",
  display: "swap",
  src: [
    { path: "../public/fonts/HankenGrotesk-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/HankenGrotesk-Italic.ttf", weight: "400", style: "italic" },
    { path: "../public/fonts/HankenGrotesk-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/HankenGrotesk-Bold.ttf", weight: "700", style: "normal" },
    { path: "../public/fonts/HankenGrotesk-BoldItalic.ttf", weight: "700", style: "italic" },
  ],
});

export const fontVariables = [schibsted, geistMono, bodoni, sourceSerif, hanken].map((f) => f.variable).join(" ");
