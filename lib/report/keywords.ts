import type { JobSkill, PredictedSkill } from "@/lib/schemas/jobFacts";
import { sectionKind } from "./resume";
import type { PredictedSkillMatch, SkillMatch, TermMatch } from "./report";
import { formKey, type Lexicon, type SynonymGroup } from "./synonyms";

/**
 * Finds a job's skills in a resume the way an ATS keyword search does:
 * whole words, flexible separators ("CI/CD" = "CI CD"), plurals, and the
 * synonym table. Counting is deterministic so the same text always gets
 * the same report.
 */

/** Bare forms of these names need their usual spelling and nearby evidence of the skill. */
const AMBIGUOUS = new Map([
  ["Go", /\b(language|programming|golang|backend|services?|microservices?|software|code|apis?|python|java|rust|postgres(?:ql)?|kubernetes)\b/i],
  ["R", /\b(language|programming|rstudio|tidyverse|ggplot2|python|statistics|statistical|modeling|analytics|data science)\b/i],
  ["C", /\b(language|programming|embedded|firmware|drivers?|compiler|kernel|pointers?|assembly|rust)\b/i],
  ["React", /\b(components?|front[- ]?end|javascript|typescript|redux|jsx|hooks|next\.js|apps?|framework|library|native)\b/i],
  ["Swift", /\b(language|programming|ios|macos|xcode|apple|swiftui|uikit|objective-c|apps?)\b/i],
  ["Rust", /\b(language|programming|cargo|crates?|compiler|tokio|wasm|webassembly|embedded|systems|code)\b/i],
  ["Spark", /\b(apache|pyspark|databricks|hadoop|etl|data pipelines?|workloads?|clusters?|scala|distributed)\b/i],
]);

const CANONICAL_CASE = new Map([
  "Access", "Ant", "Bootstrap", "Chef", "Consul", "Dart", "Excel", "Express", "Helm", "Julia", "Maven",
  "Outlook", "Puppet", "Rails", "Ruby", "Shell", "Spring", "Teams", "Unity", "Vault", "Word", ...AMBIGUOUS.keys(),
].map((name) => [formKey(name), name]));

const WORD = "\\p{L}\\p{N}\\p{M}\\p{Pc}";

function caseSensitive(form: string): boolean {
  const letters = form.replace(/[^A-Za-z]/g, "");
  const acronym = letters.length <= 5 && letters === letters.toUpperCase() && /[A-Z]{2}/.test(letters);
  return CANONICAL_CASE.has(formKey(form)) || (letters.length > 0 && form.length <= 2) || acronym;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** "payments" → "payment", so the plural suffix below matches both. Product names ("Kubernetes", "Teams") keep their s. */
function singular(word: string): string {
  return /^[a-z]{4,}s$/.test(word) && !/(ss|us|is)$/.test(word) ? word.slice(0, -1) : word;
}

export function formPattern(input: string): RegExp {
  const form = CANONICAL_CASE.get(formKey(input)) ?? input.trim();
  const words = form.split(/[\s\-_/.,]+/).filter(Boolean);
  if (words.length === 0) return /(?!)/gu;
  const fixed = CANONICAL_CASE.has(formKey(form)) || form.length <= 2;
  const parts = words.map((w, i) => escapeRegExp(!fixed && i === words.length - 1 ? singular(w) : w));
  const plural = !fixed && /\p{L}$/u.test(form) ? "(?:e?s)?" : "";
  const body = parts.join("[ \\t\\-_/.,]*");
  const prefix = form === "C" ? "(?<!Objective-)" : form === "R" ? "(?<![A-Za-z]/)" : "";
  const suffix = form === "C" ? "(?![+#])" : form === "R" ? "(?!&[A-Z])" : "";
  return new RegExp(`(?<![${WORD}])${prefix}${body}${plural}${suffix}(?![${WORD}])`, caseSensitive(form) ? "gu" : "giu");
}

const SKILL_QUALIFIER = /\b(?:experience with|proficien(?:t|cy) in|competence in|written in|coded in) +$/i;
const SKILL_LABEL = /^\s*(?:(?:technical|core|key|relevant) +)?(?:skills|technologies|languages|requirements|qualifications) *: */i;

function skillLines(text: string): Set<number> {
  const starts = new Set<number>();
  let inSkills = false;
  let offset = 0;
  for (const line of text.split("\n")) {
    const heading = line.trim().replace(/^#{1,6} +/, "").replace(/:$/, "");
    const kind = sectionKind(heading);
    if (kind || /^\s*#{1,6} /.test(line)) inSkills = kind === "skills";
    if (inSkills || SKILL_LABEL.test(line)) starts.add(offset);
    offset += line.length + 1;
  }
  return starts;
}

function everydayUse(form: string, left: string, right: string): boolean {
  switch (form) {
    case "Go": return /^ *(?:to\b|live\b|ahead\b|back\b|down\b|through\b|over\b|with\b)/i.test(right);
    case "React": return /^ *(?:to\b|\p{L}+ly\b)/iu.test(right);
    case "Swift": return /^ *(?:action|response|recovery|decision)\b/i.test(right);
    case "Rust": return /^ *removal\b/i.test(right);
    case "Spark": return /^ *(?:an? |the )?(?:interest|conversation|debate|change|joy)\b/i.test(right);
    case "C": return /(?:vitamin|grade|type) +$/i.test(left);
    case "Excel": return /^ *at\b/i.test(right);
    default: return false;
  }
}

interface Span {
  start: number;
  end: number;
  text: string;
}

/** Mentions of any of `forms`, overlapping hits ("REST" inside "REST API") counted once. */
function mentions(forms: readonly string[], text: string): Span[] {
  let skillStarts: Set<number> | undefined;
  const spans = forms.flatMap((form) => {
    const canonical = CANONICAL_CASE.get(formKey(form)) ?? form;
    const technical = AMBIGUOUS.get(canonical);
    return Array.from(text.matchAll(formPattern(form))).flatMap((m) => {
      const start = m.index;
      const end = start + m[0].length;
      if (CANONICAL_CASE.has(formKey(canonical))) {
        const lineStart = text.lastIndexOf("\n", start - 1) + 1;
        const nextLine = text.indexOf("\n", end);
        const left = text.slice(Math.max(lineStart, start - 45), start);
        const right = text.slice(end, Math.min(nextLine < 0 ? text.length : nextLine, end + 45));
        if (everydayUse(canonical, left, right)) return [];
        if (technical && !technical.test(`${left} ${right}`) && !SKILL_QUALIFIER.test(left)) {
          if (!(skillStarts ??= skillLines(text)).has(lineStart)) return [];
        }
      }
      return [{ start, end, text: m[0] }];
    });
  }).sort((a, b) => a.start - b.start || b.end - a.end);
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
