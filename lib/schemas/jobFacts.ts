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

export const JobSkillSchema = z.object({
  /** The skill as the posting writes it. */
  term: z.string().trim().min(1),
  importance: ImportanceSchema,
});
export type JobSkill = z.infer<typeof JobSkillSchema>;

export const PredictedSkillSchema = z.object({
  term: z.string().trim().min(1),
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
  education: EducationRequirementSchema.nullable().default(null),
  /** Minimum years of experience the posting asks for. */
  yearsRequired: z.number().int().min(0).max(40).nullable().default(null),
  /** Skills the role usually needs that the posting does not name. */
  predictedSkills: z.array(PredictedSkillSchema).default([]),
});
export type JobFacts = z.infer<typeof JobFactsSchema>;
