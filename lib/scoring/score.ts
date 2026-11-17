import type { DocumentContent } from "@/lib/schemas/document";
import type { JobAnalysis, Requirement } from "@/lib/schemas/jobAnalysis";
import { toUnits, type Unit } from "@/lib/resume/units";

/**
 * Deterministic, explainable match score. The AI never produces a number:
 * it extracts the job's requirements once (lib/schemas/jobAnalysis.ts), and
 * this module measures any version of the resume against them. That keeps
 * before/after comparisons fair, makes the score move live as the user edits,
 * and lets every point be traced to a line in the breakdown.
 */

export interface AtsCheck {
  id: "name" | "contact" | "sections" | "length" | "quantified" | "bullets";
  label: string;
  passed: boolean;
  detail: string;
}

export interface RequirementMatch {
  id: string;
  label: string;
  importance: Requirement["importance"];
  matched: boolean;
  /** The resume line that satisfied it, for the "why" tooltip. */
  evidence: string | null;
}

export interface ScoreComponent {
  id: "must" | "nice" | "keywords" | "ats";
  label: string;
  /** Share of the total this component is worth, 0–1 (after redistribution). */
  weight: number;
  /** How much of this component the resume earns, 0–1. */
  ratio: number;
  detail: string;
}

export interface ScoreReport {
  total: number;
  components: ScoreComponent[];
  requirements: RequirementMatch[];
  keywords: Array<{ term: string; matched: boolean }>;
  ats: AtsCheck[];
}

const BASE_WEIGHTS: Record<ScoreComponent["id"], number> = {
  must: 0.5,
  nice: 0.15,
  keywords: 0.2,
  ats: 0.15,
};

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

function findEvidence(units: Unit[], terms: string[]): string | null {
  const patterns = terms.filter((t) => t.trim().length > 0).map(termPattern);
  for (const unit of units) {
    if (patterns.some((p) => p.test(unit.text))) return unit.text;
  }
  return null;
}

const EMAIL_RE = /[\w.+-]+@[\w-]+(\.[\w-]+)*\.[a-z]{2,}/i;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/;
const SECTION_WORDS = ["experience", "education", "skills", "projects", "summary", "certifications"];
const NUMBER_RE = /\d/;

export function atsChecks(units: Unit[]): AtsCheck[] {
  const allText = units.map((u) => u.text).join("\n");
  const words = allText.split(/\s+/).filter(Boolean).length;
  const first = units.find((u) => u.text.length > 0);
  const hasName = !!first && first.kind === "heading" && first.text.split(/\s+/).length <= 6;
  const hasEmail = EMAIL_RE.test(allText);
  const hasPhone = PHONE_RE.test(allText);
  const sectionHeadings = units
    .filter((u) => u.kind === "heading" && (u.level ?? 1) >= 2)
    .map((u) => u.text.toLowerCase());
  const sections = SECTION_WORDS.filter((w) => sectionHeadings.some((h) => h.includes(w)));
  const bullets = units.filter((u) => u.kind === "bullet" || u.kind === "numbered");
  const quantified = bullets.filter((b) => NUMBER_RE.test(b.text)).length;
  const longBullets = bullets.filter((b) => b.text.split(/\s+/).length > 40).length;

  return [
    {
      id: "name",
      label: "Name leads the page",
      passed: hasName,
      detail: hasName
        ? `"${first!.text}" is the first heading.`
        : "Put your name as the first heading so ATS parsers read it as the candidate name.",
    },
    {
      id: "contact",
      label: "Email and phone",
      passed: hasEmail && hasPhone,
      detail:
        hasEmail && hasPhone
          ? "Both an email address and a phone number were found."
          : hasEmail
            ? "Add a phone number; only an email address was found."
            : hasPhone
              ? "Add an email address; only a phone number was found."
              : "No email address or phone number was found.",
    },
    {
      id: "sections",
      label: "Standard section headings",
      passed: sections.includes("experience") && sections.length >= 2,
      detail:
        sections.length > 0
          ? `Recognized: ${sections.join(", ")}.`
          : 'Use standard headings such as "Experience", "Education", and "Skills".',
    },
    {
      id: "length",
      label: "Scannable length",
      passed: words >= 200 && words <= 1100,
      detail:
        words < 200
          ? `${words} words. Most competitive resumes run 350–900 words.`
          : words > 1100
            ? `${words} words. Trim toward 900 so recruiters can scan it.`
            : `${words} words.`,
    },
    {
      id: "quantified",
      label: "Results are quantified",
      passed: bullets.length === 0 ? false : quantified / bullets.length >= 0.3,
      detail:
        bullets.length === 0
          ? "No bullet points found. Describe experience as bullets with outcomes."
          : `${quantified} of ${bullets.length} bullets include a number.`,
    },
    {
      id: "bullets",
      label: "Bullets stay concise",
      passed: longBullets === 0,
      detail:
        longBullets === 0
          ? "Every bullet is under 40 words."
          : `${longBullets} bullet${longBullets === 1 ? " runs" : "s run"} over 40 words.`,
    },
  ];
}

function pct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function scoreResume(doc: DocumentContent, job: JobAnalysis): ScoreReport {
  const units = toUnits(doc);

  const requirements: RequirementMatch[] = job.requirements.map((r) => {
    const evidence = findEvidence(units, [r.label, ...r.aliases]);
    return { id: r.id, label: r.label, importance: r.importance, matched: evidence !== null, evidence };
  });
  const keywords = job.keywords.map((k) => ({
    term: k.term,
    matched: findEvidence(units, [k.term, ...k.aliases]) !== null,
  }));
  const ats = atsChecks(units);

  const must = requirements.filter((r) => r.importance === "must");
  const nice = requirements.filter((r) => r.importance === "nice");
  const ratio = (xs: Array<{ matched: boolean }>) => xs.filter((x) => x.matched).length / xs.length;

  const raw: Array<Omit<ScoreComponent, "weight"> & { base: number; present: boolean }> = [
    {
      id: "must",
      label: "Must-have requirements",
      base: BASE_WEIGHTS.must,
      present: must.length > 0,
      ratio: must.length ? ratio(must) : 0,
      detail: `${must.filter((r) => r.matched).length} of ${must.length} found in your resume`,
    },
    {
      id: "nice",
      label: "Nice-to-have requirements",
      base: BASE_WEIGHTS.nice,
      present: nice.length > 0,
      ratio: nice.length ? ratio(nice) : 0,
      detail: `${nice.filter((r) => r.matched).length} of ${nice.length} found`,
    },
    {
      id: "keywords",
      label: "Role keywords",
      base: BASE_WEIGHTS.keywords,
      present: keywords.length > 0,
      ratio: keywords.length ? ratio(keywords) : 0,
      detail: `${keywords.filter((k) => k.matched).length} of ${keywords.length} recruiter search terms present`,
    },
    {
      id: "ats",
      label: "ATS readability",
      base: BASE_WEIGHTS.ats,
      present: true,
      ratio: ratio(ats.map((c) => ({ matched: c.passed }))),
      detail: `${ats.filter((c) => c.passed).length} of ${ats.length} checks pass`,
    },
  ];

  // Components with nothing to measure hand their weight to the rest, so a
  // posting with no "nice to have" list doesn't cap the score below 100.
  const live = raw.filter((c) => c.present);
  const totalBase = live.reduce((s, c) => s + c.base, 0);
  const components: ScoreComponent[] = live.map((c) => ({
    id: c.id,
    label: c.label,
    weight: c.base / totalBase,
    ratio: c.ratio,
    detail: `${c.detail} (${pct(c.ratio)})`,
  }));
  const total = Math.round(components.reduce((s, c) => s + c.weight * c.ratio, 0) * 100);

  return { total, components, requirements, keywords, ats };
}

/** Points each component contributes, for the "explain the number" breakdown. */
export function componentPoints(c: ScoreComponent): number {
  return Math.round(c.weight * c.ratio * 100);
}
