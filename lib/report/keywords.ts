import type { JobSkill, PredictedSkill } from "@/lib/schemas/jobFacts";
import type { PredictedSkillMatch, SkillMatch, TermMatch } from "./report";
import { formKey, type Lexicon, type SynonymGroup } from "./synonyms";

/**
 * Finds a job's skills in a resume the way an ATS keyword search does:
 * whole words, flexible separators ("CI/CD" = "CI CD"), plurals, and the
 * synonym table. Counting is deterministic so the same text always gets
 * the same report.
 */

/**
 * Product names that are also everyday words. They match only when
 * capitalized, so "excel at" or "react quickly" doesn't count as a skill.
 */
const CAPITALIZED_ONLY = new Set([
  "Access", "Ant", "Bootstrap", "Chef", "Consul", "Dart", "Excel", "Express", "Go", "Helm", "Julia",
  "Maven", "Outlook", "Puppet", "Rails", "React", "Ruby", "Rust", "Shell", "Spark", "Spring", "Swift",
  "Teams", "Unity", "Vault", "Word",
]);

function caseSensitive(form: string): boolean {
  const letters = form.replace(/[^A-Za-z]/g, "");
  const acronym = letters.length <= 5 && letters === letters.toUpperCase() && /[A-Z]{2}/.test(letters);
  return CAPITALIZED_ONLY.has(form) || form.length <= 2 || acronym;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formPattern(form: string): RegExp {
  const parts = form.trim().split(/[\s\-_/.,]+/).filter(Boolean).map(escapeRegExp);
  const plural = /[A-Za-z]$/.test(form) ? "(?:e?s)?" : "";
  const body = parts.join("[\\s\\-_/.]*");
  return new RegExp(`(?<![A-Za-z0-9])${body}${plural}(?![A-Za-z0-9])`, caseSensitive(form) ? "g" : "gi");
}

interface Span {
  start: number;
  end: number;
  text: string;
}

/** Mentions of any of `forms`, overlapping hits ("REST" inside "REST API") counted once. */
function mentions(forms: readonly string[], text: string): Span[] {
  const spans = forms
    .flatMap((form) => Array.from(text.matchAll(formPattern(form)), (m) => ({ start: m.index, end: m.index + m[0].length, text: m[0] })))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: Span[] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span.start < last.end) continue;
    merged.push(span);
  }
  return merged;
}

/** The short and long form side by side, the way Jobscan advises writing them. */
function bothForms(a: string, b: string): string {
  const [long, short] = a.length >= b.length ? [a, b] : [b, a];
  return `${long} (${short})`;
}

function synonymAdvice(term: string, used: string, group: SynonymGroup): string {
  return group.kind === "abbreviation"
    ? `Your resume says "${used}" but the posting says "${term}". Write both, e.g. "${bothForms(term, used)}", so a search for either finds you.`
    : `Your resume says "${used}" but the posting says "${term}". Use the posting's spelling at least once.`;
}

function unusedPostingForm(group: SynonymGroup, jobText: string, resumeText: string): string | null {
  if (group.kind !== "abbreviation") return null;
  const resumeKeys = new Set(group.forms.filter((f) => mentions([f], resumeText).length > 0).map(formKey));
  for (const form of group.forms) {
    if (resumeKeys.has(formKey(form))) continue;
    const [inPosting] = mentions([form], jobText);
    if (inPosting) return inPosting.text;
  }
  return null;
}

export interface MatchContext {
  resumeText: string;
  jobText: string;
  lexicon: Lexicon;
}

export function matchTerm(term: string, { resumeText, jobText, lexicon }: MatchContext): TermMatch {
  const group = lexicon(term);
  const key = formKey(term);
  const forms = group?.forms ?? [];
  const exact = mentions([term, ...forms.filter((f) => formKey(f) === key)], resumeText);
  const other = mentions(
    forms.filter((f) => formKey(f) !== key),
    resumeText,
  ).filter((s) => !exact.some((e) => s.start < e.end && e.start < s.end));
  const resumeCount = exact.length + other.length;

  if (exact.length > 0) {
    const missing = group && unusedPostingForm(group, jobText, resumeText);
    return {
      status: "found",
      resumeCount,
      matchedForm: exact[0].text,
      advice: missing
        ? `The posting also says "${missing}". Write both forms, e.g. "${bothForms(exact[0].text, missing)}".`
        : null,
    };
  }
  if (group && other.length > 0) {
    return { status: "synonym", resumeCount, matchedForm: other[0].text, advice: synonymAdvice(term, other[0].text, group) };
  }
  return { status: "missing", resumeCount: 0, matchedForm: null, advice: null };
}

/** Mentions of the term or any synonym in the posting; at least 1, since the posting asked for it. */
export function postingCount(term: string, { jobText, lexicon }: MatchContext): number {
  return Math.max(1, mentions([term, ...(lexicon(term)?.forms ?? [])], jobText).length);
}

const IMPORTANCE_RANK = { high: 0, medium: 1, low: 2 } as const;

/** Every job skill with its status, most important first, then most repeated in the posting. */
export function matchSkills(skills: JobSkill[], ctx: MatchContext): SkillMatch[] {
  return skills
    .map((s) => ({ ...matchTerm(s.term, ctx), term: s.term, importance: s.importance, jdCount: postingCount(s.term, ctx) }))
    .sort((a, b) => IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance] || b.jdCount - a.jdCount);
}

export function matchPredictedSkills(skills: PredictedSkill[], ctx: MatchContext): PredictedSkillMatch[] {
  return skills.map((s) => ({ ...matchTerm(s.term, ctx), term: s.term, reason: s.reason }));
}
