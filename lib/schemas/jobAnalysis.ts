import { z } from "zod";

/**
 * What the AI extracts from a job description. It is produced once per
 * application and stored with it, so the same yardstick scores the resume
 * before tailoring, after tailoring, and after every manual edit.
 */
export const RequirementSchema = z.object({
  id: z.string(),
  label: z.string(),
  /** Other spellings that count as the same requirement ("JS" for "JavaScript"). */
  aliases: z.array(z.string()).default([]),
  importance: z.enum(["must", "nice"]),
  category: z.enum(["skill", "tool", "domain", "qualification", "soft"]).default("skill"),
});
export type Requirement = z.infer<typeof RequirementSchema>;

export const KeywordSchema = z.object({
  term: z.string(),
  aliases: z.array(z.string()).default([]),
});
export type Keyword = z.infer<typeof KeywordSchema>;

export const JobAnalysisSchema = z.object({
  title: z.string(),
  company: z.string().nullable().default(null),
  seniority: z.string().nullable().default(null),
  /** Two-sentence plain-language read of what the role is really about. */
  summary: z.string(),
  requirements: z.array(RequirementSchema).min(1),
  /** Responsibility and domain phrases an ATS or recruiter scans for. */
  keywords: z.array(KeywordSchema).default([]),
});
export type JobAnalysis = z.infer<typeof JobAnalysisSchema>;
