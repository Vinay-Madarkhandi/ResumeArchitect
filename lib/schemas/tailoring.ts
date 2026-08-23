import { z } from "zod";

/**
 * Shape Gemini's tailoring call must return. Re-validated with
 * `TailoringResultSchema.safeParse()` on every response before anything is
 * persisted — this guards against SDK/schema drift and semantically-wrong
 * output the model's own declared schema wouldn't catch.
 *
 * Tailoring now operates on the freeform document (as Markdown, see
 * lib/documentMarkdown.ts) rather than typed ResumeContent fields, so a
 * "change" no longer names a fixed section — it carries a short quoted
 * snippet instead, for the UI to show what changed. A "flagged" entry is
 * not a change explanation at all: it's a proper-noun-like phrase that
 * appeared in the tailored text but not the source, surfaced for the user
 * to double-check rather than auto-rejecting the whole result (see
 * lib/tailoring/fabricationGuardrail.ts).
 */
export const ChangeExplanationSchema = z.object({
  kind: z.enum(["change", "flagged"]).default("change"),
  quote: z.string().nullable().default(null),
  whatChanged: z.string(),
  why: z.string(),
});
export type ChangeExplanation = z.infer<typeof ChangeExplanationSchema>;

export const TailoringResultSchema = z.object({
  markdown: z.string(),
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
