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
const PROPER_NOUN_RE = /\b([A-Z][a-zA-Z0-9&/-]*(?:\s+[A-Z][a-zA-Z0-9&/-]*){1,4})\b/g;

/** Puffery that replaces a fact with an adjective; recruiters read it as padding. */
const FILLER = [
  "robust", "comprehensive", "enhanced", "enhancing", "proven", "track record", "adept", "demonstrating",
  "leveraging", "leveraged", "spearheaded", "cutting-edge", "seamless", "seamlessly", "synergy",
  "passionate", "results-driven", "dynamic", "world-class", "best-in-class", "innovative",
];

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

/**
 * Concrete details in a line: a run of tokens that carry a capital past the
 * first letter of the line, a digit, or a dot inside ("Next.js"). Losing one
 * of these in a rewrite (a version, a database, a state name) usually makes
 * the line vaguer, so it's surfaced like an invented claim.
 */
export function specifics(text: string): string[] {
  const out: string[] = [];
  let run: string[] = [];
  const flush = () => {
    if (run.length) out.push(run.join(" "));
    run = [];
  };
  text.split(/\s+/).forEach((raw, i) => {
    const word = raw.replace(/^[^\w]+|[^\w+#]+$/g, "");
    const specific =
      word.length > 0 &&
      (/\d/.test(word) || /\w\.\w/.test(word) || /[A-Z]/.test(word.slice(1)) || (i > 0 && /^[A-Z]/.test(word)));
    if (specific) run.push(word);
    else flush();
    if (/[,;:)(]$/.test(raw)) flush();
  });
  flush();
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

  if (change.before) {
    const afterWords = text.toLowerCase().split(/[^\w.+#]+/).filter((w) => w.length >= 2);
    // A single word survives as its short form too: "Golang" → "Go".
    const kept = (d: string) =>
      text.toLowerCase().includes(d.toLowerCase()) ||
      (!d.includes(" ") && afterWords.some((w) => d.toLowerCase().startsWith(w) || w.startsWith(d.toLowerCase())));
    const lost = specifics(plain(change.before)).filter((d) => !kept(d));
    if (lost.length) {
      const list = lost.join(", ");
      flags.push({
        kind: "dropped",
        value: list,
        message: `Drops ${list} from your original. Specifics are what make a line credible; put them back if they matter.`,
      });
    }
  }

  const lower = text.toLowerCase();
  const beforeLower = change.before ? plain(change.before).toLowerCase() : "";
  const filler = FILLER.filter((w) => new RegExp(`\\b${w}\\b`).test(lower) && !new RegExp(`\\b${w}\\b`).test(beforeLower));
  if (filler.length) {
    const list = filler.map((w) => `"${w}"`).join(", ");
    flags.push({
      kind: "filler",
      value: filler.join(", "),
      message: `Adds ${list}, which reads as padding. Replace it with what actually happened, or cut it.`,
    });
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
