import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";
import type { ChangeFlag, TailoredChange } from "@/lib/schemas/tailoring";
import { termPattern } from "@/lib/scoring/score";
import { parseInline } from "@/lib/documentMarkdown";
import { inlineText } from "@/lib/resume/units";

/**
 * The proof stage: a deterministic check of every AI edit against the
 * candidate's original resume. Anything the original can't back up (a new
 * number, a new proper name, a job requirement the original never mentions)
 * is flagged on that change. This runs after, and independently of, the
 * model's own instructions not to invent anything.
 */

const NUMBER_RE = /\d[\d,.]*(?:\s?%|[kmb]\b|x\b|\+)?/gi;
// Two to five capitalized words in a row: "Google Cloud", "Acme Corp".
const PROPER_NOUN_RE = /\b([A-Z][a-zA-Z0-9&]*(?:\s+[A-Z][a-zA-Z0-9&]*){1,4})\b/g;

function normalizeNumber(n: string): string {
  return n.replace(/[,\s]/g, "").replace(/\.$/, "").toLowerCase();
}

function normalizePhrase(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Proper-noun-like phrases, ignoring the capital that starts a sentence:
 * "Built Go services" is not the name "Built Go".
 */
export function properNouns(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(PROPER_NOUN_RE)) {
    let words = match[1].split(/\s+/);
    const preceding = text.slice(0, match.index).trimEnd();
    if (preceding === "" || /[.!?:;]$/.test(preceding)) words = words.slice(1);
    if (words.length >= 2) out.push(words.join(" "));
  }
  return out;
}

function plain(markdown: string): string {
  return inlineText(parseInline(markdown));
}

export function verifyChange(
  change: Omit<TailoredChange, "flags">,
  sourceText: string,
  job: JobAnalysis,
): ChangeFlag[] {
  if (!change.after) return [];
  const text = plain(change.after);
  const flags: ChangeFlag[] = [];

  const sourceNumbers = new Set((sourceText.match(NUMBER_RE) ?? []).map(normalizeNumber));
  for (const raw of new Set(text.match(NUMBER_RE) ?? [])) {
    const n = normalizeNumber(raw);
    if (n && !sourceNumbers.has(n)) {
      flags.push({ kind: "number", value: raw.trim(), message: `"${raw.trim()}" doesn't appear in your original resume. Confirm the number is accurate.` });
    }
  }

  const sourcePhrases = normalizePhrase(sourceText);
  for (const m of new Set(properNouns(text))) {
    const p = normalizePhrase(m);
    if (p && !sourcePhrases.includes(p)) {
      flags.push({ kind: "name", value: m, message: `"${m}" is a new name. Check that it belongs on your resume.` });
    }
  }

  for (const req of job.requirements) {
    const terms = [req.label, ...req.aliases].filter((t) => t.trim());
    const inNew = terms.some((t) => termPattern(t).test(text));
    const inSource = terms.some((t) => termPattern(t).test(sourceText));
    if (inNew && !inSource) {
      flags.push({
        kind: "skill",
        value: req.label,
        message: `Claims ${req.label}, which your original resume never mentions. Keep it only if it's true.`,
      });
    }
  }

  // A phrase can trip several checks; keep one flag per value.
  const seen = new Set<string>();
  return flags.filter((f) => {
    const key = f.value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
