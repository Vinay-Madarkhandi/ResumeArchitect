import { z } from "zod";
import { DocumentContentSchema } from "@/lib/schemas/document";
import { JobAnalysisSchema } from "@/lib/schemas/jobAnalysis";

/**
 * Something in an AI edit the candidate should look at: a claim the source
 * resume can't back up, a detail the rewrite lost, or added padding. Flags never
 * block: they are shown on the change for the candidate to confirm or revert.
 */
export const ChangeFlagSchema = z.object({
  kind: z.enum(["number", "name", "skill", "dropped", "filler"]),
  value: z.string(),
  message: z.string(),
});
export type ChangeFlag = z.infer<typeof ChangeFlagSchema>;

/** One applied AI edit, stored with its application so the review can explain it. */
export const TailoredChangeSchema = z.object({
  id: z.string(),
  op: z.enum(["rewrite", "insert_after", "remove"]),
  /** Original line as inline Markdown; null for insertions. */
  before: z.string().nullable(),
  /** New line as inline Markdown; null for removals. */
  after: z.string().nullable(),
  reason: z.string(),
  requirementIds: z.array(z.string()).default([]),
  flags: z.array(ChangeFlagSchema).default([]),
});
export type TailoredChange = z.infer<typeof TailoredChangeSchema>;

export const PIPELINE_STAGES = ["copy", "markup", "set", "proof", "lockup"] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const TailoringErrorCode = z.enum([
  "missing_api_key",
  "invalid_api_key",
  "invalid_jd",
  "source_not_found",
  "rate_limited",
  "gemini_error",
  "schema_validation_failed",
  "timeout",
  "unknown",
]);
export type TailoringErrorCodeT = z.infer<typeof TailoringErrorCode>;

/** Events streamed (as NDJSON) from POST /api/tailoring while the pipeline runs. */
export type PipelineEvent =
  | { type: "session"; sessionId: string }
  | { type: "stage"; stage: PipelineStage; status: "running" | "done"; note?: string }
  | { type: "done"; sessionId: string; resumeId: string }
  | { type: "error"; code: TailoringErrorCodeT; message: string; sessionId?: string; stage?: PipelineStage };

/** What the workspace needs from a completed session. Parsed defensively from the DB row. */
export const SessionArtifactsSchema = z.object({
  jobAnalysis: JobAnalysisSchema,
  sourceSnapshot: DocumentContentSchema,
  changes: z.array(TailoredChangeSchema),
  summary: z.string().nullable(),
  scoreBefore: z.number().nullable(),
});
export type SessionArtifacts = z.infer<typeof SessionArtifactsSchema>;

export const MIN_JOB_DESCRIPTION_LENGTH = 60;
export const MAX_JOB_DESCRIPTION_LENGTH = 20_000;
