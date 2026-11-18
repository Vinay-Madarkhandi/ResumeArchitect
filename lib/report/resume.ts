import type { BlockNode, DocumentContent, InlineNode } from "@/lib/schemas/document";
import { toUnits, type Unit } from "@/lib/resume/units";

/**
 * A resume read the way an ATS reads one: a header (name, contact line),
 * then sections filed under their headings. Every check works from this one
 * reading, so "where is the Experience section" has a single answer.
 */

export type SectionKind =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "awards"
  | "volunteer"
  | "publications"
  | "languages"
  | "interests"
  | "references";

/** Heading names ATS parsers recognize, after lower-casing and dropping punctuation. */
const SECTION_NAMES: ReadonlyArray<[SectionKind, RegExp]> = [
  ["summary", /^((professional|career|executive|personal) )?(summary|profile|objective|overview)$|^about( me)?$|^summary of qualifications$/],
  [
    "experience",
    /^((professional|work|relevant|career|employment|industry) )?(experience|history)$|^employment( history)?$|^work history$|^experience$/,
  ],
  ["education", /^education( and (training|certifications?|qualifications))?$|^academic (background|history|qualifications)$/],
  [
    "skills",
    /^((technical|core|key|professional|relevant) )?(skills|competencies|expertise|proficiencies)( and [a-z ]+)?$|^technologies$|^tech(nical)? stack$|^tools( and technologies)?$/,
  ],
  ["projects", /^((personal|selected|key|academic|side|relevant) )?projects$/],
  ["certifications", /^(certifications?|licenses?|licenses? and certifications?|certifications? and (licenses?|training))$/],
  ["awards", /^(awards|honors|honours|achievements|accomplishments)( and [a-z]+)?$/],
  ["volunteer", /^(volunteer(ing)?( experience| work)?|community (involvement|service))$/],
  ["publications", /^(publications|research|presentations|patents)$/],
  ["languages", /^languages$/],
  ["interests", /^(interests|hobbies)( and [a-z]+)?$/],
  ["references", /^(professional |personal )?references$/],
];

function normalizeHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sectionKind(heading: string): SectionKind | null {
  const name = normalizeHeading(heading);
  return SECTION_NAMES.find(([, re]) => re.test(name))?.[0] ?? null;
}

export interface ResumeSection {
  heading: string;
  /** Null when the heading is a name an ATS won't recognize ("Where I've Been"). */
  kind: SectionKind | null;
  units: Unit[];
}

export interface ResumeModel {
  units: Unit[];
  /** Every line, joined by newlines. */
  text: string;
  /** Link targets from the document, e.g. a "LinkedIn" label's URL. */
  links: string[];
  /** Lines before the first section heading: name, contact, sometimes an untitled summary. */
  header: Unit[];
  sections: ResumeSection[];
  contact: { units: Unit[]; text: string; links: string[] };
}

/**
 * A known section name on its own line is a heading however it's styled. A
 * level 1–2 heading with an unknown name is still a section (a creative one);
 * level 3 is a role or school line inside a section.
 */
function isSectionHeading(unit: Unit, index: number): boolean {
  const known = unit.text.split(/\s+/).length <= 5 && sectionKind(unit.text) !== null;
  if (unit.kind === "paragraph" || index === 0) return known;
  return unit.kind === "heading" && (known || (unit.level ?? 1) <= 2);
}

function linksIn(blocks: BlockNode[]): string[] {
  const fromInline = (nodes: InlineNode[]) =>
    nodes.flatMap((n) => (n.type === "text" ? (n.marks ?? []).flatMap((m) => (m.type === "link" ? [m.attrs.href] : [])) : []));
  return blocks.flatMap((b) =>
    b.type === "heading" || b.type === "paragraph" ? fromInline(b.content) : b.content.flatMap((item) => linksIn(item.content)),
  );
}

export function readResume(doc: DocumentContent): ResumeModel {
  const units = toUnits(doc).filter((u) => u.text.length > 0);
  const header: Unit[] = [];
  const sections: ResumeSection[] = [];
  units.forEach((unit, i) => {
    if (isSectionHeading(unit, i)) sections.push({ heading: unit.text, kind: sectionKind(unit.text), units: [] });
    else if (sections.length > 0) sections[sections.length - 1].units.push(unit);
    else header.push(unit);
  });
  const contactUnits = header.slice(0, 6);
  const bodyStart = contactUnits.findIndex((unit) =>
    unit.node.type === "listItem" || /^(?:professional |personal )?references?\b/i.test(unit.text) ||
    (wordCount(unit.text) > 12 && !findEmail(unit.text) && !findPhone(unit.text) && !findLinkedIn({ text: unit.text, links: [] })),
  );
  if (bodyStart >= 0) contactUnits.splice(bodyStart);
  const contact = {
    units: contactUnits,
    text: contactUnits.map((unit) => unit.text).join("\n"),
    links: linksIn(contactUnits.flatMap((unit) => unit.node.type === "listItem" ? [] : [unit.node])),
  };
  return { units, text: units.map((u) => u.text).join("\n"), links: linksIn(doc.content), header, sections, contact };
}

/** Text of every section of a kind, or null when the resume has none. */
export function sectionText(resume: ResumeModel, kind: SectionKind): string | null {
  const matching = resume.sections.filter((s) => s.kind === kind);
  return matching.length > 0 ? matching.flatMap((s) => s.units.map((u) => u.text)).join("\n") : null;
}

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)*\.[a-z]{2,}/i;
const PHONE_CANDIDATE = /\+?\(?\d[\d\s().-]{7,}\d/g;
const LINKEDIN_URL = /linkedin\.com\/(in|pub)\/[\w%-]+/i;
const PROFILE_SITES = /\b(github\.com|gitlab\.com|behance\.net|dribbble\.com|kaggle\.com|medium\.com|stackoverflow\.com|bitbucket\.org|codepen\.io|huggingface\.co)\/\S+/gi;
const GENERIC_URL = /\b(https?:\/\/|www\.)[^\s|,;)]+/gi;

export function findEmail(text: string): string | null {
  return EMAIL.exec(text)?.[0] ?? null;
}

/** A phone number has 10–15 digits; fewer is a date range or an ID. */
export function findPhone(text: string): string | null {
  for (const m of text.matchAll(PHONE_CANDIDATE)) {
    const digits = m[0].replace(/\D/g, "").length;
    if (digits >= 10 && digits <= 15) return m[0].trim();
  }
  return null;
}

export function findLinkedIn(resume: { text: string; links: string[] }): string | null {
  return [resume.text, ...resume.links].map((t) => LINKEDIN_URL.exec(t)?.[0]).find(Boolean) ?? null;
}

/** LinkedIn, GitHub, portfolio, and other personal links, as written. */
export function webProfiles(resume: { text: string; links: string[] }): string[] {
  const linkedIn = findLinkedIn(resume);
  const found = [resume.text, ...resume.links].flatMap((t) => [
    ...Array.from(t.matchAll(PROFILE_SITES), (m) => m[0]),
    ...Array.from(t.matchAll(GENERIC_URL), (m) => m[0]).filter((u) => !/linkedin\.com/i.test(u)),
  ]);
  if (linkedIn) found.unshift(linkedIn);
  const unique = new Map<string, string>();
  for (const url of found) {
    const key = url.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
    if (!unique.has(key)) unique.set(key, url);
  }
  return [...unique.values()];
}

const NOT_A_NAME = /^(resume|résumé|curriculum vitae|cv)$/i;

/** The candidate's name: the first line, when it reads like a name. */
export function findName(resume: ResumeModel): string | null {
  const first = resume.contact.units.find((u) => !NOT_A_NAME.test(u.text));
  if (!first) return null;
  const words = first.text.split(/\s+/);
  const looksLikeName =
    words.length <= 5 && !/[\d@|/:•·]/.test(first.text) && /^[\p{L}][\p{L}.'\- ]*$/u.test(first.text) && sectionKind(first.text) === null;
  return looksLikeName ? first.text : null;
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
