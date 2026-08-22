import { Type, type Schema } from "@google/genai";

/**
 * Hand-authored mirror of TailoringResultSchema (lib/schemas/tailoring.ts) in
 * Gemini's own schema dialect — not JSON Schema, so there's no reliable
 * auto-converter from the Zod schema. Keep this in sync by hand whenever the
 * Zod schema changes; the route handler always re-validates Gemini's actual
 * response through TailoringResultSchema.safeParse() regardless, so drift
 * here fails safe (a schema-validation error) rather than silently.
 */

const linkSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    label: { type: Type.STRING },
    url: { type: Type.STRING },
  },
  required: ["label", "url"],
};

const bulletSchema: Schema = {
  type: Type.OBJECT,
  description: "Preserve the input bullet's `id` verbatim if this bullet already existed; omit `id` only for a newly added bullet.",
  properties: {
    id: { type: Type.STRING },
    text: { type: Type.STRING },
  },
  required: ["id", "text"],
};

const personalInfoSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    fullName: { type: Type.STRING },
    headline: { type: Type.STRING, nullable: true },
    email: { type: Type.STRING, nullable: true },
    phone: { type: Type.STRING, nullable: true },
    location: { type: Type.STRING, nullable: true },
    links: { type: Type.ARRAY, items: linkSchema },
  },
  required: ["fullName", "links"],
};

const experienceEntrySchema: Schema = {
  type: Type.OBJECT,
  description: "Preserve the input entry's `id` verbatim — never generate a new one for an entry that already existed.",
  properties: {
    id: { type: Type.STRING },
    company: { type: Type.STRING },
    role: { type: Type.STRING },
    location: { type: Type.STRING, nullable: true },
    startDate: { type: Type.STRING, nullable: true },
    endDate: { type: Type.STRING, nullable: true },
    isCurrent: { type: Type.BOOLEAN },
    bullets: { type: Type.ARRAY, items: bulletSchema },
  },
  required: ["id", "company", "role", "isCurrent", "bullets"],
};

const projectEntrySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    name: { type: Type.STRING },
    description: { type: Type.STRING, nullable: true },
    url: { type: Type.STRING, nullable: true },
    technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
    bullets: { type: Type.ARRAY, items: bulletSchema },
  },
  required: ["id", "name", "bullets"],
};

const educationEntrySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    institution: { type: Type.STRING },
    degree: { type: Type.STRING, nullable: true },
    fieldOfStudy: { type: Type.STRING, nullable: true },
    startDate: { type: Type.STRING, nullable: true },
    endDate: { type: Type.STRING, nullable: true },
    gpa: { type: Type.STRING, nullable: true },
    honors: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["id", "institution"],
};

const skillGroupSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    category: { type: Type.STRING },
    items: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["id", "category", "items"],
};

const certificationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    name: { type: Type.STRING },
    issuer: { type: Type.STRING, nullable: true },
    date: { type: Type.STRING, nullable: true },
    url: { type: Type.STRING, nullable: true },
  },
  required: ["id", "name"],
};

const resumeContentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    personalInfo: personalInfoSchema,
    summary: { type: Type.STRING, nullable: true },
    experience: { type: Type.ARRAY, items: experienceEntrySchema },
    projects: { type: Type.ARRAY, items: projectEntrySchema },
    education: { type: Type.ARRAY, items: educationEntrySchema },
    skills: { type: Type.ARRAY, items: skillGroupSchema },
    certifications: { type: Type.ARRAY, items: certificationSchema },
  },
  required: ["personalInfo", "experience", "projects", "education", "skills", "certifications"],
};

const changeExplanationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    section: {
      type: Type.STRING,
      enum: ["personalInfo", "summary", "experience", "projects", "education", "skills", "certifications"],
    },
    targetId: {
      type: Type.STRING,
      nullable: true,
      description: "The `id` of the specific entry this change applies to, if any.",
    },
    whatChanged: { type: Type.STRING },
    why: { type: Type.STRING, description: "Tie this to a specific requirement in the job description — never a score." },
  },
  required: ["section", "whatChanged", "why"],
};

export const tailoringResultGeminiSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    resume: resumeContentSchema,
    changes: { type: Type.ARRAY, items: changeExplanationSchema },
  },
  required: ["resume", "changes"],
};
