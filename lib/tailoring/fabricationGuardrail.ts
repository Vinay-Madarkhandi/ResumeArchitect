import { documentToMarkdown } from "@/lib/documentMarkdown";
import type { DocumentContent } from "@/lib/schemas/document";

export interface FlaggedPhrase {
  phrase: string;
  contextSnippet: string;
}

// A lightweight proper-noun heuristic: 2-5 consecutive capitalized words
// (e.g. "Acme Corporation", "Google Cloud Platform"). A single capitalized
// word is excluded since a normal sentence starts with one on every line;
// requiring 2+ keeps this to genuinely name-like phrases. No "." inside a
// word: a period is almost always a sentence boundary here (e.g. "...Spring
// Boot. Expert in..."), and allowing it let the pattern bridge across two
// unrelated sentences into one false-positive "phrase".
const PROPER_NOUN_RE = /\b([A-Z][a-zA-Z0-9&]*(?:\s+[A-Z][a-zA-Z0-9&]*){1,4})\b/g;

/**
 * Best-effort, never-blocking fabrication check for freeform text: any
 * proper-noun-like phrase present in the tailored document but not present
 * anywhere in the source is flagged for the user to review — never
 * silently discarded. Free-text heuristics produce false positives an
 * exact field comparison wouldn't (the old version of this check compared
 * `experience[].company` directly and hard-rejected the whole result on
 * any mismatch); per the confirmed product decision, this is now a visible
 * flag the user can verify or revert, not an automatic rejection.
 */
export function findFlaggedPhrases(source: DocumentContent, tailored: DocumentContent): FlaggedPhrase[] {
  const sourceText = documentToMarkdown(source);
  const tailoredText = documentToMarkdown(tailored);

  const sourcePhrases = new Set(extractProperNouns(sourceText).map(normalizePhrase));
  const seen = new Set<string>();
  const flagged: FlaggedPhrase[] = [];

  for (const phrase of extractProperNouns(tailoredText)) {
    const normalized = normalizePhrase(phrase);
    if (!normalized || sourcePhrases.has(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    flagged.push({ phrase, contextSnippet: contextAround(tailoredText, phrase) });
  }

  return flagged;
}

function extractProperNouns(text: string): string[] {
  return [...text.matchAll(PROPER_NOUN_RE)].map((m) => m[1]);
}

function normalizePhrase(phrase: string): string {
  return phrase
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function contextAround(text: string, phrase: string): string {
  const index = text.indexOf(phrase);
  if (index === -1) return phrase;
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + phrase.length + 40);
  const snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${snippet}${end < text.length ? "…" : ""}`;
}
