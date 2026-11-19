export const VERIFY_CLAIM = "[Verify claim]";
export const hasUnverifiedClaim = (text: string) => /\[Verify claim(?: \d+)?\]/i.test(text);
export const RESOLVE_CLAIMS = "Replace or remove each verification placeholder before sharing or exporting.";

export function placeholderForFigure(figure: string): string {
  const clean = figure.trim().toLowerCase().replace(/,/g, "");
  if (/(?:%|percent|per cent)$/.test(clean)) return "[X%]";
  if (/^[$€£]/.test(clean)) return `[${clean[0]}X]`;
  if (/x$/i.test(clean) && /\d/.test(clean)) return "[N]x";
  return "[N]";
}
