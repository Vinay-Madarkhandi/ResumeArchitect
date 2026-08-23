/**
 * JS mirror of the "Executive Precision" design tokens (app/globals.css) for
 * @react-pdf/renderer's StyleSheet.create(), which can't consume Tailwind
 * classes or CSS custom properties at all. Sizes are print-appropriate (pt,
 * not the screen px scale in globals.css) while keeping the same visual
 * hierarchy and palette.
 */

export const pdfColors = {
  ink: "#0b1c30",
  inkMuted: "#45464d",
  accent: "#006a61",
  hairline: "#c6c6cd",
  background: "#ffffff",
};

export const pdfFonts = {
  sans: "Hanken Grotesk",
  doc: "Source Serif 4",
  mono: "JetBrains Mono",
};

export const pdfType = {
  name: 22,
  headline: 11,
  sectionHeader: 10.5,
  body: 9.5,
  meta: 8.5,
};
