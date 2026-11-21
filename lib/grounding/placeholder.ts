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

/**
 * Strips all verification placeholders (e.g. "[Verify claim]", "[Verify claim 2]")
 * from a text string while cleaning up extra whitespace.
 */
export function stripUnverifiedClaims(text: string): string {
  return text
    .replace(/\s*\[Verify claim(?: \d+)?\]\s*/gi, (match, offset, string) => {
      if (offset === 0 || offset + match.length >= string.length) return "";
      return " ";
    })
    .replace(/[ \t]{2,}/g, " ");
}

/**
 * Strips verification placeholders from all text nodes in a DocumentContent tree,
 * preserving all formatting, marks, and node structure.
 */
export function stripClaimsFromDocument<T>(doc: T): T {
  if (!doc || typeof doc !== "object") return doc;
  if (Array.isArray(doc)) {
    return doc.map((item) => stripClaimsFromDocument(item)) as unknown as T;
  }
  const copy: Record<string, any> = { ...doc };
  if (copy.type === "text" && typeof copy.text === "string") {
    copy.text = stripUnverifiedClaims(copy.text);
  }
  if (Array.isArray(copy.content)) {
    copy.content = copy.content
      .map((item: any) => stripClaimsFromDocument(item))
      .filter((child: any) => child?.type !== "text" || (typeof child.text === "string" && child.text.length > 0));
  }
  return copy as T;
}
