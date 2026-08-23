import { z } from "zod";

/**
 * Canonical resume content shape. This is the single source of truth used by:
 * the heuristic PDF parser's output, the document editor's state, the
 * tailoring prompt's input/output, and the PDF template's props.
 *
 * Every leaf field the parser/tailoring step can't confidently populate is
 * left empty/null rather than guessed — never fabricated.
 */

export const LinkSchema = z.object({
  label: z.string(),
  url: z.string(),
});
export type Link = z.infer<typeof LinkSchema>;

export const PersonalInfoSchema = z.object({
  fullName: z.string(),
  headline: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.array(LinkSchema).default([]),
});
export type PersonalInfo = z.infer<typeof PersonalInfoSchema>;

export const BulletSchema = z.object({
  id: z.string(),
  text: z.string(),
});
export type Bullet = z.infer<typeof BulletSchema>;

export const ExperienceEntrySchema = z.object({
  id: z.string(),
  company: z.string(),
  role: z.string(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().default(null),
  isCurrent: z.boolean().default(false),
  bullets: z.array(BulletSchema).default([]),
});
export type ExperienceEntry = z.infer<typeof ExperienceEntrySchema>;

export const ProjectEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  url: z.string().optional(),
  technologies: z.array(z.string()).default([]),
  bullets: z.array(BulletSchema).default([]),
});
export type ProjectEntry = z.infer<typeof ProjectEntrySchema>;

export const EducationEntrySchema = z.object({
  id: z.string(),
  institution: z.string(),
  degree: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  gpa: z.string().optional(),
  honors: z.array(z.string()).default([]),
});
export type EducationEntry = z.infer<typeof EducationEntrySchema>;

export const SkillGroupSchema = z.object({
  id: z.string(),
  category: z.string(),
  items: z.array(z.string()).default([]),
});
export type SkillGroup = z.infer<typeof SkillGroupSchema>;

export const CertificationSchema = z.object({
  id: z.string(),
  name: z.string(),
  issuer: z.string().optional(),
  date: z.string().optional(),
  url: z.string().optional(),
});
export type Certification = z.infer<typeof CertificationSchema>;

export const ResumeContentSchema = z.object({
  personalInfo: PersonalInfoSchema,
  summary: z.string().nullable().default(null),
  experience: z.array(ExperienceEntrySchema).default([]),
  projects: z.array(ProjectEntrySchema).default([]),
  education: z.array(EducationEntrySchema).default([]),
  skills: z.array(SkillGroupSchema).default([]),
  certifications: z.array(CertificationSchema).default([]),
});
export type ResumeContent = z.infer<typeof ResumeContentSchema>;

export function emptyResumeContent(): ResumeContent {
  return {
    personalInfo: { fullName: "", links: [] },
    summary: null,
    experience: [],
    projects: [],
    education: [],
    skills: [],
    certifications: [],
  };
}

/** Section keys used for low-confidence-field paths and change explanations. */
export const RESUME_SECTIONS = [
  "personalInfo",
  "summary",
  "experience",
  "projects",
  "education",
  "skills",
  "certifications",
] as const;
export type ResumeSection = (typeof RESUME_SECTIONS)[number];
