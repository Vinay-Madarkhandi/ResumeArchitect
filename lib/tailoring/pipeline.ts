import { analyzeJob } from "@/lib/gemini/prompts/analyzeJob";
import { tailorLines } from "@/lib/gemini/prompts/tailorLines";
import { AiError, type JsonModel } from "@/lib/gemini/model";
import type { DocumentContent } from "@/lib/schemas/document";
import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";
import type { PipelineEvent, PipelineStage, TailoredChange, TailoringErrorCodeT } from "@/lib/schemas/tailoring";
import { scoreResume } from "@/lib/scoring/score";
import { fromUnits, toUnits } from "@/lib/resume/units";
import { applyEdits } from "./applyEdits";
import { verifyChange } from "@/lib/grounding/tailoring";
import { buildSourceIndex } from "@/lib/grounding";

/**
 * The tailoring run as five visible stages, named after a compositor's
 * workflow:
 *   copy    – read the job description (AI)
 *   markup  – measure the resume against it (deterministic score)
 *   set     – rewrite lines for the job (AI)
 *   proof   – check every edit against the original (deterministic)
 *   lockup  – score the result and save it
 * Every stage reports progress as an event, and the session row records
 * the stage reached, so a failure says exactly where it happened.
 */

export interface SessionPatch {
  stage?: PipelineStage;
  status?: "analyzing" | "generating" | "completed" | "failed";
  job_analysis?: JobAnalysis;
  score_before?: number;
  score_after?: number;
  changes?: TailoredChange[];
  summary?: string;
  error_code?: TailoringErrorCodeT;
  error_message?: string;
  result_resume_id?: string;
  result_resume_title_snapshot?: string;
  completed_at?: string;
  usage?: Record<string, { prompt: number; output: number; total: number }>;
}

/** Persistence the pipeline needs, kept behind an interface so tests can run it in memory. */
export interface PipelineStore {
  createSession(input: { sourceSnapshot: DocumentContent; model: string }): Promise<string>;
  updateSession(sessionId: string, patch: SessionPatch): Promise<void>;
  createTailoredResume(input: {
    sessionId: string;
    title: string;
    content: DocumentContent;
    jobTitle: string;
    company: string | null;
  }): Promise<string>;
  /** Compensates a resume insert when the run can't be completed. */
  deleteResume(resumeId: string): Promise<void>;
}

export interface PipelineInput {
  source: { title: string; content: DocumentContent };
  jobDescription: string;
  /** Optional overrides typed by the user; the analysis fills in what's missing. */
  jobTitle?: string | null;
  company?: string | null;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export async function* runPipeline(
  deps: { model: JsonModel; store: PipelineStore },
  input: PipelineInput,
): AsyncGenerator<PipelineEvent> {
  const { model, store } = deps;
  const sessionId = await store.createSession({ sourceSnapshot: input.source.content, model: model.name });
  yield { type: "session", sessionId };

  let stage: PipelineStage = "copy";
  try {
    // copy
    yield { type: "stage", stage, status: "running" };
    await store.updateSession(sessionId, { stage, status: "analyzing" });
    const analysis = await analyzeJob(model, input.jobDescription);
    const job: JobAnalysis = {
      ...analysis,
      title: input.jobTitle?.trim() || analysis.title,
      company: input.company?.trim() || analysis.company,
    };
    await store.updateSession(sessionId, { job_analysis: job });
    const mustCount = job.requirements.filter((r) => r.importance === "must").length;
    yield {
      type: "stage",
      stage,
      status: "done",
      note: `${job.title}${job.company ? ` at ${job.company}` : ""} · ${plural(mustCount, "must-have")}`,
    };

    // markup
    stage = "markup";
    yield { type: "stage", stage, status: "running" };
    const before = scoreResume(input.source.content, job);
    const missing = before.requirements.filter((r) => !r.matched && r.importance === "must").length;
    await store.updateSession(sessionId, { stage, score_before: before.total });
    yield {
      type: "stage",
      stage,
      status: "done",
      note: `Starting score ${before.total} · ${missing === 0 ? "every must-have shown" : `${plural(missing, "must-have")} not shown`}`,
    };

    // set
    stage = "set";
    yield { type: "stage", stage, status: "running" };
    await store.updateSession(sessionId, { stage, status: "generating" });
    const sourceUnits = toUnits(input.source.content);
    const response = await tailorLines(model, { units: sourceUnits, job, before });
    // Proof the proposal before it can enter the persisted document.
    const sourceText = sourceUnits.map((u) => u.markdown).join("\n");
    const sourceIndex = buildSourceIndex([sourceText]);
    const applied = applyEdits(sourceUnits, response.edits, (change, anchor) => {
      // Copying a true claim into a different role can still change its meaning.
      const flags = verifyChange(change, sourceText, job, sourceUnits[anchor]?.markdown, sourceIndex);
      const unverified = flags.some((flag) => flag.kind !== "dropped" && flag.kind !== "filler");
      const requirementIds = change.requirementIds.filter((id) => job.requirements.some((r) => r.id === id));
      const reason = unverified
        ? "Replace this placeholder with details you can verify, or revert the change."
        : requirementIds.length
          ? "Addresses a requirement in the job posting."
          : "Suggested wording change for this application.";
      return {
        ...change, reason, requirementIds, flags,
        after: unverified ? [change.before, `[Verify claim ${change.id.slice(1)}]`].filter(Boolean).join(" ") : change.after,
      };
    });
    const rewrites = applied.changes.filter((c) => c.op === "rewrite").length;
    const inserts = applied.changes.filter((c) => c.op === "insert_after").length;
    const removals = applied.changes.filter((c) => c.op === "remove").length;
    yield {
      type: "stage",
      stage,
      status: "done",
      note: [plural(rewrites, "line") + " rewritten", inserts && `${inserts} added`, removals && `${removals} removed`]
        .filter(Boolean)
        .join(" · "),
    };

    // proof
    stage = "proof";
    yield { type: "stage", stage, status: "running" };
    await store.updateSession(sessionId, { stage });
    const { changes } = applied;
    const flagged = changes.filter((c) => c.flags.length > 0).length;
    yield {
      type: "stage",
      stage,
      status: "done",
      note: flagged === 0 ? "No claims flagged" : `${plural(flagged, "change")} to verify`,
    };

    // lockup
    stage = "lockup";
    yield { type: "stage", stage, status: "running" };
    const tailored = fromUnits(applied.units);
    const after = scoreResume(tailored, job);
    const title = `${job.title}${job.company ? ` — ${job.company}` : ""}`;
    // Artifacts first, so a resume never exists without the session that explains it.
    await store.updateSession(sessionId, { stage, score_after: after.total, changes, summary: flagged ? `${plural(flagged, "change")} to review.` : "Review the proposed changes before submitting." });
    const resumeId = await store.createTailoredResume({
      sessionId,
      title,
      content: tailored,
      jobTitle: job.title,
      company: job.company,
    });
    try {
      await store.updateSession(sessionId, {
        status: "completed",
        usage: model.usage,
        result_resume_id: resumeId,
        result_resume_title_snapshot: title,
        completed_at: new Date().toISOString(),
      });
    } catch (error) {
      await store.deleteResume(resumeId).catch(() => {});
      throw error;
    }
    yield { type: "stage", stage, status: "done", note: `Score ${before.total} → ${after.total}` };
    yield { type: "done", sessionId, resumeId };
  } catch (error) {
    const code: TailoringErrorCodeT = error instanceof AiError ? error.code : "unknown";
    const message =
      error instanceof AiError ? error.message : "Something unexpected went wrong. Your resume wasn't changed; try again.";
    await store
      .updateSession(sessionId, {
        status: "failed",
        stage,
        error_code: code,
        error_message: message,
        usage: model.usage,
        completed_at: new Date().toISOString(),
      })
      .catch(() => {});
    yield { type: "error", code, message, sessionId, stage };
  }
}
