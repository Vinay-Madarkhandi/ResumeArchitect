import { z } from "zod";
import { RESUME_SECTIONS, ResumeContentSchema } from "./resume";

/**
 * Shape Gemini's tailoring call must return. Re-validated with
 * `TailoringResultSchema.safeParse()` on every response before anything is
 * persisted — this guards against SDK/schema drift and semantically-wrong
 * output the model's own declared schema wouldn't catch.
 */
export const ChangeExplanationSchema = z.object({
  section: z.enum(RESUME_SECTIONS),
  targetId: z.string().nullable().default(null),
  whatChanged: z.string(),
  why: z.string(),
});
export type ChangeExplanation = z.infer<typeof ChangeExplanationSchema>;

export const TailoringResultSchema = z.object({
  resume: ResumeContentSchema,
  changes: z.array(ChangeExplanationSchema).default([]),
});
export type TailoringResult = z.infer<typeof TailoringResultSchema>;

export const TailoringErrorCode = z.enum([
  "missing_api_key",
  "invalid_api_key",
  "invalid_jd",
  "source_not_found",
  "gemini_error",
  "schema_validation_failed",
  "fabrication_detected",
  "timeout",
  "unknown",
]);
export type TailoringErrorCodeT = z.infer<typeof TailoringErrorCode>;

export const TailoringSessionStatus = z.enum([
  "pending",
  "analyzing",
  "generating",
  "completed",
  "failed",
]);
export type TailoringSessionStatusT = z.infer<typeof TailoringSessionStatus>;

export const MIN_JOB_DESCRIPTION_LENGTH = 60;
