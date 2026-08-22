import { Font } from "@react-pdf/renderer";
import path from "node:path";

/**
 * @react-pdf/renderer can't consume next/font's opaque hashed CSS output —
 * it needs a direct font file per (family, weight, style) via Font.register.
 * Static TTFs are committed under public/fonts/ (see that folder's origin
 * notes) and resolved differently per environment: the server build reads
 * them straight off disk, while the browser build (used for the live
 * preview via usePDF()) fetches them as ordinary same-origin URLs.
 */

function fontPath(filename: string): string {
  if (typeof window === "undefined") {
    return path.join(process.cwd(), "public", "fonts", filename);
  }
  return `/fonts/${filename}`;
}

let registered = false;

export function registerResumeFonts() {
  if (registered) return;
  registered = true;

  Font.register({
    family: "Hanken Grotesk",
    fonts: [
      { src: fontPath("HankenGrotesk-Regular.ttf"), fontWeight: 400 },
      { src: fontPath("HankenGrotesk-Medium.ttf"), fontWeight: 500 },
      { src: fontPath("HankenGrotesk-SemiBold.ttf"), fontWeight: 600 },
      { src: fontPath("HankenGrotesk-Bold.ttf"), fontWeight: 700 },
    ],
  });

  Font.register({
    family: "Source Serif 4",
    fonts: [
      { src: fontPath("SourceSerif4-Regular.ttf"), fontWeight: 400 },
      { src: fontPath("SourceSerif4-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
      { src: fontPath("SourceSerif4-SemiBold.ttf"), fontWeight: 600 },
    ],
  });

  Font.register({
    family: "JetBrains Mono",
    fonts: [
      { src: fontPath("JetBrainsMono-Regular.ttf"), fontWeight: 400 },
      { src: fontPath("JetBrainsMono-Medium.ttf"), fontWeight: 500 },
    ],
  });

  // react-pdf's default hyphenation callback breaks words too aggressively
  // for a resume's short, meaningful lines (job titles, headings).
  Font.registerHyphenationCallback((word) => [word]);
}
