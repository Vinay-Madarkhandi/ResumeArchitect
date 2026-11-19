import { z } from "zod";
import type { BlockNode, DocumentContent, InlineNode } from "@/lib/schemas/document";
import { TEMPLATE_IDS } from "@/lib/resume/templates";

/**
 * The guided builder's form state: fixed fields per section, which
 * `draftToDocument` sets as an ordinary resume document (standard headings,
 * one column). After that the result is a normal master resume and the
 * structured form is no longer needed.
 */
const line = (max = 200) => z.string().max(max).default("");

export const ExperienceSchema = z.object({
  id: z.string().max(40),
  title: line(),
  company: line(),
  location: line(),
  start: line(40),
  end: line(40),
  /** The user's own words about the job, which AI assist turns into bullets. */
  notes: line(2_000),
  bullets: z.array(z.string().max(400)).max(30).default([]),
});

export const EducationSchema = z.object({
  id: z.string().max(40),
  degree: line(),
  school: line(),
  location: line(),
  start: line(40),
  end: line(40),
  details: line(600),
});

export const ProjectSchema = z.object({
  id: z.string().max(40),
  name: line(),
  link: line(300),
  notes: line(2_000),
  bullets: z.array(z.string().max(400)).max(20).default([]),
});

export const CertificationSchema = z.object({
  id: z.string().max(40),
  name: line(),
  issuer: line(),
  year: line(20),
});

export const DraftSchema = z.object({
  name: line(120),
  email: line(),
  phone: line(60),
  location: line(),
  links: z.array(z.string().max(300)).max(5).default([]),
  targetRole: line(),
  summary: line(1_500),
  experience: z.array(ExperienceSchema).max(20).default([]),
  education: z.array(EducationSchema).max(10).default([]),
  skills: line(1_500),
  projects: z.array(ProjectSchema).max(15).default([]),
  certifications: z.array(CertificationSchema).max(20).default([]),
  template: z.enum(TEMPLATE_IDS).default("classic"),
});

export type Draft = z.infer<typeof DraftSchema>;
export type Experience = Draft["experience"][number];
export type Education = Draft["education"][number];
export type Project = Draft["projects"][number];
export type Certification = Draft["certifications"][number];

export function emptyDraft(): Draft {
  return DraftSchema.parse({});
}

const newId = () => Math.random().toString(36).slice(2, 10);
export const blankExperience = (): Experience => ExperienceSchema.parse({ id: newId() });
export const blankEducation = (): Education => EducationSchema.parse({ id: newId() });
export const blankProject = (): Project => ProjectSchema.parse({ id: newId() });
export const blankCertification = (): Certification => CertificationSchema.parse({ id: newId() });

/** "[X%]", "[number of users]": spots the user still has to fill with a real figure. */
const PLACEHOLDER = /\[[^\]\n]{1,40}\]/g;

export function placeholdersIn(text: string): string[] {
  return text.match(PLACEHOLDER) ?? [];
}

/** Every unfilled placeholder in the draft, with where it is, in reading order. */
export function draftPlaceholders(d: Draft): { where: string; placeholder: string }[] {
  const out: { where: string; placeholder: string }[] = [];
  const scan = (where: string, text: string) => placeholdersIn(text).forEach((placeholder) => out.push({ where, placeholder }));
  scan("Summary", d.summary);
  d.experience.forEach((e) => e.bullets.forEach((b) => scan(e.title || e.company || "Experience", b)));
  d.projects.forEach((p) => p.bullets.forEach((b) => scan(p.name || "Projects", b)));
  d.education.forEach((e) => scan(e.degree || e.school || "Education", e.details));
  scan("Skills", d.skills);
  return out;
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const text = (s: string): InlineNode[] => (clean(s) ? [{ type: "text", text: clean(s) }] : []);
const joined = (parts: string[], sep: string) => parts.map(clean).filter(Boolean).join(sep);
const dates = (start: string, end: string) => joined([start, end], " – ");

function href(link: string): string {
  const l = clean(link);
  if (/^mailto:|^https?:\/\//i.test(l)) return l;
  return `https://${l.replace(/^\/+/, "")}`;
}

const heading = (level: 1 | 2 | 3, s: string): BlockNode => ({ type: "heading", attrs: { level }, content: text(s) });
const paragraph = (content: InlineNode[]): BlockNode => ({ type: "paragraph", content });
const bullets = (items: string[]): BlockNode[] => {
  const kept = items.map(clean).filter(Boolean);
  return kept.length
    ? [{ type: "bulletList", content: kept.map((b) => ({ type: "listItem", content: [paragraph(text(b))] })) }]
    : [];
};

function contactLine(d: Draft): InlineNode[] {
  const parts: InlineNode[][] = [
    ...[d.email, d.phone, d.location].map(text),
    ...d.links.map((l): InlineNode[] => (clean(l) ? [{ type: "text", text: clean(l), marks: [{ type: "link", attrs: { href: href(l) } }] }] : [])),
  ].filter((p) => p.length > 0);
  return parts.flatMap((p, i) => (i === 0 ? p : [{ type: "text", text: " · " } as InlineNode, ...p]));
}

function section(title: string, blocks: BlockNode[]): BlockNode[] {
  return blocks.length ? [heading(2, title), ...blocks] : [];
}

/** The draft as a resume document: name, contact line, then the standard sections that have content. */
export function draftToDocument(d: Draft): DocumentContent {
  const contact = contactLine(d);
  const experience = d.experience.flatMap((e) => {
    const title = joined([e.title, e.company], " — ");
    const meta = joined([e.location, dates(e.start, e.end)], " · ");
    const body = bullets(e.bullets);
    if (!title && !meta && !body.length) return [];
    return [...(title ? [heading(3, title)] : []), ...(meta ? [paragraph(text(meta))] : []), ...body];
  });
  const education = d.education.flatMap((e) => {
    const title = joined([e.degree, e.school], " — ");
    const meta = joined([e.location, dates(e.start, e.end)], " · ");
    if (!title && !meta && !clean(e.details)) return [];
    return [
      ...(title ? [heading(3, title)] : []),
      ...(meta ? [paragraph(text(meta))] : []),
      ...(clean(e.details) ? [paragraph(text(e.details))] : []),
    ];
  });
  const projects = d.projects.flatMap((p) => {
    const body = bullets(p.bullets);
    if (!clean(p.name) && !clean(p.link) && !body.length) return [];
    return [
      ...(clean(p.name) ? [heading(3, p.name)] : []),
      ...(clean(p.link) ? [paragraph([{ type: "text", text: clean(p.link), marks: [{ type: "link", attrs: { href: href(p.link) } }] }])] : []),
      ...body,
    ];
  });
  const skills = d.skills.split(/[,\n]/).map(clean).filter(Boolean);
  const certifications = bullets(d.certifications.map((c) => joined([c.name, joined([c.issuer, c.year], ", ")], " — ")));

  const content: BlockNode[] = [
    ...(clean(d.name) ? [heading(1, d.name)] : []),
    ...(contact.length ? [paragraph(contact)] : []),
    ...section("Summary", clean(d.summary) ? [paragraph(text(d.summary))] : []),
    ...section("Experience", experience),
    ...section("Education", education),
    ...section("Skills", skills.length ? [paragraph(text(skills.join(", ")))] : []),
    ...section("Projects", projects),
    ...section("Certifications", certifications),
  ];
  return { type: "doc", content: content.length ? content : [paragraph([])] };
}

/** What the builder asks for before it can finish. */
export function draftProblems(d: Draft): string[] {
  const problems: string[] = [];
  if (!clean(d.name)) problems.push("Add your name on the Contact step.");
  if (!clean(d.email) && !clean(d.phone)) problems.push("Add an email or phone number so employers can reach you.");
  const filled = draftPlaceholders(d);
  if (filled.length) {
    problems.push(`Replace or delete ${filled.length === 1 ? "the placeholder" : `${filled.length} placeholders`} like ${filled[0].placeholder} with your real figures.`);
  }
  return problems;
}

export function draftTitle(d: Draft): string {
  return joined([d.name, d.targetRole], " — ").slice(0, 160) || "Master resume";
}
