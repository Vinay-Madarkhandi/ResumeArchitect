import { z } from "zod";

/**
 * Response shape for job-match analysis (select "Check job match" in the
 * editor for a tailored resume — see app/api/resumes/[id]/match-analysis).
 * Deliberately asks Gemini for only `requiredSkills` and `missingSkills`,
 * not a score or a `matchedSkills` list directly: `matchedSkills` is
 * derived in the route handler as the set difference, and the match
 * percentage is computed from that count in application code — a real,
 * reproducible ratio of listed items, never a number the model invents
 * out of thin air. That's what "transparent match score" means here: you
 * can always see the exact list of requirements behind the number.
 */
export const MatchAnalysisResultSchema = z.object({
  requiredSkills: z.array(z.string()).min(1),
  missingSkills: z.array(z.string()),
  summary: z.string(),
});
export type MatchAnalysisResult = z.infer<typeof MatchAnalysisResultSchema>;

export interface MatchAnalysis {
  matchScore: number | null;
  requiredSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  summary: string;
}
