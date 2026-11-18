import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";
import type { Check, CoverLetterReport } from "@/lib/schemas/career";
import { termPattern } from "@/lib/scoring/score";
import { keywordRatio, matchKeywords } from "./keywords";
import { hasMeasurableResult, share, weightedScore, wordCount } from "./score";

/** Stock phrases hiring managers skim past. Matched case-insensitively as whole phrases. */
export const CLICHES = [
  "i am writing to express my interest",
  "i am writing to apply",
  "to whom it may concern",
  "dear sir or madam",
  "team player",
  "hard worker",
  "hardworking",
  "go-getter",
  "self-starter",
  "think outside the box",
  "results-driven",
  "detail-oriented",
  "passionate about",
  "synergy",
  "perfect candidate",
  "perfect fit",
  "great fit",
  "best of breed",
  "fast-paced environment",
  "wear many hats",
  "thank you for your time and consideration",
] as const;

export const IDEAL_WORDS = { min: 250, max: 400 } as const;
const SENIORITY = /^(?:senior|sr\.?|junior|jr\.?|lead|staff|principal|head of|associate)\s+/i;
const COMPANY_SUFFIX = /[,\s]+(?:inc\.?|llc|ltd\.?|limited|corp\.?|corporation|gmbh|plc|co\.?)$/i;
const GENERIC_GREETING = /\b(?:to whom it may concern|dear sir(?:\s*(?:or|\/)\s*madam)?)\b/i;
const GREETING = /^\s*(?:dear|hello|hi|greetings)\b/im;

function paragraphs(text: string): string[] {
  const blocks = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return blocks.length > 1 ? blocks : text.split("\n").map((p) => p.trim()).filter(Boolean);
}

export function findCliches(text: string): string[] {
  const lower = text.toLowerCase().replace(/[’']/g, "'");
  return CLICHES.filter((phrase) => new RegExp(`(?<![a-z])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])`).test(lower));
}

const GENERIC_FIRST_WORDS = new Set(["global", "first", "united", "american", "national", "general", "digital", "international"]);

const anyMatch = (text: string, variants: string[]) =>
  variants.map((v) => v.trim()).filter((v) => v.length >= 2).some((v) => termPattern(v).test(text));

export function namesRole(text: string, title: string): boolean {
  return anyMatch(text, [title, title.replace(SENIORITY, "")]);
}

export function namesCompany(text: string, company: string): boolean {
  const stripped = company.replace(COMPANY_SUFFIX, "").trim();
  // Letters use a company's short name: "Northwind" for "Northwind Payments".
  const first = stripped.split(/\s+/)[0];
  const short = stripped.includes(" ") && first.length >= 5 && !GENERIC_FIRST_WORDS.has(first.toLowerCase()) ? first : "";
  return anyMatch(text, [company, stripped, short]);
}

export function scanCoverLetter(letter: string, job: JobAnalysis): CoverLetterReport {
  const words = wordCount(letter);
  const paras = paragraphs(letter);
  const keywords = matchKeywords(job, { letter });
  const cliches = findCliches(letter);

  const role = namesRole(letter, job.title);
  const checks: Check[] = [
    {
      id: "length",
      label: "Length",
      passed: words >= IDEAL_WORDS.min && words <= IDEAL_WORDS.max,
      detail: words < IDEAL_WORDS.min
        ? `${words} words. Aim for ${IDEAL_WORDS.min}–${IDEAL_WORDS.max}: room for two concrete examples.`
        : words > IDEAL_WORDS.max
          ? `${words} words. Trim toward ${IDEAL_WORDS.max}; most readers skim past one screen.`
          : `${words} words, inside the ${IDEAL_WORDS.min}–${IDEAL_WORDS.max} range.`,
    },
    {
      id: "paragraphs",
      label: "Paragraphs",
      passed: paras.length >= 3 && paras.length <= 6,
      detail: paras.length < 3
        ? `${paras.length} paragraph${paras.length === 1 ? "" : "s"}. Split it into an opening, one or two examples, and a close.`
        : paras.length > 6
          ? `${paras.length} paragraphs. Merge related points so it reads as one argument.`
          : `${paras.length} paragraphs.`,
    },
    {
      id: "role",
      label: "Names the role",
      passed: role,
      detail: role
        ? `Mentions "${job.title}".`
        : `Say which role you're applying for: "${job.title}".`,
    },
  ];

  if (job.company) {
    const named = namesCompany(letter, job.company);
    checks.push({
      id: "company",
      label: "Names the company",
      passed: named,
      detail: named ? `Mentions ${job.company}.` : `${job.company} isn't named. A letter that could go to any company reads like one.`,
    });
  }

  const generic = GENERIC_GREETING.test(letter);
  const greeted = GREETING.test(letter);
  checks.push(
    {
      id: "greeting",
      label: "Personal greeting",
      passed: greeted && !generic,
      detail: generic
        ? "Replace the generic greeting with the hiring manager's name, or \"Dear Hiring Manager\" if you can't find it."
        : greeted
          ? "Opens with a direct greeting."
          : "Open with a greeting, ideally to a named person.",
    },
    {
      id: "measurable",
      label: "Measurable results",
      passed: hasMeasurableResult(letter),
      detail: hasMeasurableResult(letter)
        ? "Backs at least one claim with a number."
        : "No numbers. Add one result from your resume (a percentage, amount, or count) to make a claim concrete.",
    },
    {
      id: "cliches",
      label: "No clichés",
      passed: cliches.length === 0,
      detail: cliches.length === 0
        ? "No stock phrases found."
        : `Rewrite ${cliches.map((c) => `"${c}"`).join(", ")} with what you actually did.`,
    },
  );

  const found = keywords.filter((k) => k.found).length;
  const score = weightedScore([
    {
      id: "keywords",
      label: "Job keywords",
      base: 0.45,
      ratio: keywordRatio(keywords),
      detail: `${found} of ${keywords.length} requirements and keywords appear`,
    },
    {
      id: "checks",
      label: "Letter checks",
      base: 0.55,
      ratio: share(checks, (c) => c.passed),
      detail: `${checks.filter((c) => c.passed).length} of ${checks.length} checks pass`,
    },
  ]);

  return { score, checks, keywords, cliches, words };
}
