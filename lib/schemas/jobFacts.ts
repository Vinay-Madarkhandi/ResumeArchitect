import { z } from "zod";

/**
 * What Gemini reads out of a job posting for the Match Report
 * (lib/report). Extracted once per posting and stored, so every version of
 * the resume is scored against the same facts.
 */

export const ImportanceSchema = z.enum(["high", "medium", "low"]);
export type Importance = z.infer<typeof ImportanceSchema>;

export const JobLevelSchema = z.enum(["entry", "mid", "senior", "executive"]);
export type JobLevel = z.infer<typeof JobLevelSchema>;

/** Ordered lowest to highest, so a resume's degree compares with `>=`. */
export const DEGREES = ["high_school", "associate", "bachelor", "master", "doctorate"] as const;
export const DegreeSchema = z.enum(DEGREES);
export type Degree = z.infer<typeof DegreeSchema>;

const SkillTermSchema = z.string().trim().min(1).max(80)
  .refine((term) => /[\p{L}\p{N}]/u.test(term), "A skill must contain a letter or digit.");

export const JobSkillSchema = z.object({
  /** The skill as the posting writes it. */
  term: SkillTermSchema,
  importance: ImportanceSchema,
});
export type JobSkill = z.infer<typeof JobSkillSchema>;

export const PredictedSkillSchema = z.object({
  term: SkillTermSchema,
  /** Why the role likely needs it, in one short sentence. */
  reason: z.string().trim().default(""),
});
export type PredictedSkill = z.infer<typeof PredictedSkillSchema>;

export const EducationRequirementSchema = z.object({
  degree: DegreeSchema,
  /** Fields of study the posting names ("Computer Science"); empty when any field will do. */
  fields: z.array(z.string().trim().min(1)).default([]),
  /** The posting accepts equivalent experience instead of the degree. */
  equivalentExperience: z.boolean().default(false),
});
export type EducationRequirement = z.infer<typeof EducationRequirementSchema>;

export const JobFactsSchema = z.object({
  title: z.string().trim().min(1),
  level: JobLevelSchema,
  hardSkills: z.array(JobSkillSchema),
  softSkills: z.array(JobSkillSchema).default([]),
  /** Explicit posting terms that describe the industry or work without naming a skill. */
  otherKeywords: z.array(JobSkillSchema).optional(),
  education: EducationRequirementSchema.nullable().default(null),
  /** Minimum years of experience the posting asks for. */
  yearsRequired: z.number().int().min(0).max(40).nullable().default(null),
  /** Skills the role usually needs that the posting does not name. */
  predictedSkills: z.array(PredictedSkillSchema).default([]),
});
export type JobFacts = z.infer<typeof JobFactsSchema>;

/**
 * Gemini's reply: the facts' shape, with each list's entries left unchecked,
 * so one bad entry is dropped by `readJobFactsReply` instead of failing the
 * whole read. The model is still asked for `JobFactsSchema`.
 */
const unchecked = z.array(z.unknown()).default([]);
export const JobFactsReplySchema = JobFactsSchema.extend({
  hardSkills: unchecked,
  softSkills: unchecked,
  otherKeywords: unchecked,
  predictedSkills: unchecked,
});
export type JobFactsReply = z.infer<typeof JobFactsReplySchema>;

type ListName = "hardSkills" | "softSkills" | "otherKeywords" | "predictedSkills";

/** The reply's valid entries, and how many entries of each list were dropped. */
export function readJobFactsReply(reply: JobFactsReply): { facts: JobFacts; dropped: Record<ListName, number> } {
  const dropped: Record<ListName, number> = { hardSkills: 0, softSkills: 0, otherKeywords: 0, predictedSkills: 0 };
  const keep = <T>(list: ListName, schema: z.ZodType<T>): T[] => reply[list].flatMap((entry) => {
    const parsed = schema.safeParse(entry);
    if (parsed.success) return [parsed.data];
    dropped[list]++;
    return [];
  });
  const facts: JobFacts = {
    ...reply,
    hardSkills: keep("hardSkills", JobSkillSchema),
    softSkills: keep("softSkills", JobSkillSchema),
    otherKeywords: keep("otherKeywords", JobSkillSchema),
    predictedSkills: keep("predictedSkills", PredictedSkillSchema),
  };
  return { facts, dropped };
}
