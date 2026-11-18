import { z } from "zod";
import { ChangeFlagSchema, MAX_JOB_DESCRIPTION_LENGTH, MIN_JOB_DESCRIPTION_LENGTH } from "@/lib/schemas/tailoring";

/**
 * Shapes shared by the career tools (LinkedIn review, cover letter scan,
 * interview practice). Reports are computed in code from the job's analysis,
 * stored as JSON, and parsed with these schemas again when they are read.
 */

const ApplicationTarget = z.object({ kind: z.literal("application"), resumeId: z.uuid() });
const PostingTarget = z.object({
  kind: z.literal("posting"),
  text: z.string().trim().min(MIN_JOB_DESCRIPTION_LENGTH, "Paste the full job post, including the requirements.")
    .max(MAX_JOB_DESCRIPTION_LENGTH, "That job post is too long. Trim it to the role details."),
});
const RoleTarget = z.object({ kind: z.literal("role"), role: z.string().trim().min(2, "Name the role.").max(120) });

/** What a tool measures against: a saved application, a pasted posting, or just a role title. */
export const TargetInputSchema = z.discriminatedUnion("kind", [z.object({ kind: z.literal("none") }), ApplicationTarget, PostingTarget, RoleTarget]);
/** A cover letter is written to one job, so it needs a real posting. */
export const JobTargetSchema = z.discriminatedUnion("kind", [ApplicationTarget, PostingTarget], { error: "Pick an application or paste the job post." });
export const InterviewTargetSchema = z.discriminatedUnion("kind", [ApplicationTarget, PostingTarget, RoleTarget], {
  error: "Pick an application, paste a job post, or name a role.",
});
export type TargetInput = z.infer<typeof TargetInputSchema>;

export const CheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  passed: z.boolean(),
  detail: z.string(),
});
export type Check = z.infer<typeof CheckSchema>;

export const KeywordHitSchema = z.object({
  term: z.string(),
  kind: z.enum(["must", "nice", "keyword"]),
  found: z.boolean(),
  /** Sections the term was found in, e.g. ["headline", "skills"]. */
  where: z.array(z.string()),
});
export type KeywordHit = z.infer<typeof KeywordHitSchema>;

/** One weighted part of a score, shown as `points / weight` in the breakdown. */
export const ScorePartSchema = z.object({
  id: z.string(),
  label: z.string(),
  /** Share of the total, 0–1, after parts with nothing to measure hand theirs to the rest. */
  weight: z.number(),
  /** How much of this part was earned, 0–1. */
  ratio: z.number(),
  detail: z.string(),
});
export type ScorePart = z.infer<typeof ScorePartSchema>;

export const ScoreSchema = z.object({ total: z.number().int().min(0).max(100), parts: z.array(ScorePartSchema) });
export type Score = z.infer<typeof ScoreSchema>;

const section = (max: number) => z.string().trim().max(max).default("");

export const LinkedInProfileSchema = z.object({
  headline: section(400),
  about: section(5_000),
  experience: section(20_000),
  skills: section(5_000),
  url: section(300),
}).refine((p) => p.headline || p.about || p.experience || p.skills, "Paste at least one section of your profile.");
export type LinkedInProfile = z.infer<typeof LinkedInProfileSchema>;

export const LinkedInReportSchema = z.object({
  score: ScoreSchema,
  checks: z.array(CheckSchema),
  keywords: z.array(KeywordHitSchema).nullable(),
});
export type LinkedInReport = z.infer<typeof LinkedInReportSchema>;

/** What Gemini returns for a LinkedIn profile. Validated, then each line is proofed against the resume. */
export const LinkedInDraftSchema = z.object({
  headlines: z.array(z.string().trim().min(1).max(220)).min(1).max(5),
  about: z.string().trim().min(1).max(2_600),
  notes: z.array(z.string()).max(6).default([]),
});

const VerifiedDraft = z.object({ text: z.string(), flags: z.array(ChangeFlagSchema) });
export const LinkedInSuggestionsSchema = z.object({
  headlines: z.array(VerifiedDraft),
  about: VerifiedDraft,
  notes: z.array(z.union([VerifiedDraft, z.string()])),
  grounded: z.literal(true).optional(),
});
export type LinkedInSuggestions = z.infer<typeof LinkedInSuggestionsSchema>;

export const CoverLetterReportSchema = z.object({
  score: ScoreSchema,
  checks: z.array(CheckSchema),
  keywords: z.array(KeywordHitSchema),
  cliches: z.array(z.string()),
  words: z.number().int(),
});
export type CoverLetterReport = z.infer<typeof CoverLetterReportSchema>;

export const MAX_LETTER_LENGTH = 12_000;
export const MAX_ANSWER_LENGTH = 6_000;

export const QUESTION_CATEGORIES = ["behavioral", "technical", "role"] as const;

export const InterviewQuestionSchema = z.object({
  id: z.string(),
  category: z.enum(QUESTION_CATEGORIES),
  question: z.string().min(1),
  /** What the interviewer is listening for, in one or two sentences. */
  assessing: z.string().min(1),
  /** The job requirement this question probes, when there is one. */
  requirement: z.string().nullable().default(null),
  grounded: z.literal(true).optional(),
});
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;

export const InterviewQuestionSetSchema = z.object({ questions: z.array(InterviewQuestionSchema).min(3).max(15) });

/** Gemini's read of one practice answer. The score is computed from these ratings in code. */
export const AnswerRatingSchema = z.object({
  star: z.object({
    situation: z.boolean(),
    task: z.boolean(),
    action: z.boolean(),
    result: z.boolean(),
  }),
  /** 1 = vague generalities, 5 = concrete actions, names, and numbers from their own work. */
  specificity: z.int().min(1).max(5),
  /** 1 = doesn't answer the question, 5 = answers it directly and ties to the job. */
  relevance: z.int().min(1).max(5),
  strengths: z.array(z.string()).max(4).default([]),
  improvements: z.array(z.string()).max(4).default([]),
});
export type AnswerRating = z.infer<typeof AnswerRatingSchema>;

export const AnswerFeedbackSchema = z.object({
  score: ScoreSchema,
  rating: AnswerRatingSchema,
  words: z.number().int(),
  measurable: z.boolean(),
  grounded: z.literal(true).optional(),
});
export type AnswerFeedback = z.infer<typeof AnswerFeedbackSchema>;
