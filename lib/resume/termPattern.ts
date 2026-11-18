function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Matches a term as a whole token. Separators inside the term are flexible
 * ("CI/CD" ≈ "CI CD", "Node.js" ≈ "nodejs" is not attempted; aliases cover that).
 */
export function termPattern(term: string): RegExp {
  const parts = term
    .trim()
    .toLowerCase()
    .split(/[\s\-_/]+/)
    .filter(Boolean)
    .map(escapeRegExp);
  return new RegExp(`(?<![a-z0-9])${parts.join("[\\s\\-_/]*")}(?![a-z0-9])`, "i");
}
