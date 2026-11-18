import { NextResponse } from "next/server";
import { documentToMarkdown } from "@/lib/documentMarkdown";
import { resolveDocument } from "@/lib/documentConversion";
import { AiError, geminiModel, type JsonModel } from "@/lib/gemini/model";
import { analyzeJob } from "@/lib/gemini/prompts/analyzeJob";
import { analyzeRole } from "@/lib/gemini/prompts/analyzeRole";
import { createJobDescription, getJobDescription } from "@/lib/data/job-descriptions";
import { getDefaultMaster, getResume } from "@/lib/data/resumes";
import { getTailoringSession } from "@/lib/data/tailoring";
import { loadGeminiKey } from "@/lib/server/geminiKey";
import { limitAi } from "@/lib/server/rateLimit";
import type { TargetInput } from "@/lib/schemas/career";
import { JobAnalysisSchema, type JobAnalysis } from "@/lib/schemas/jobAnalysis";

/** A job (or role) a career tool measures against, resolved to its analysis. */
export interface Target {
  label: string;
  job: JobAnalysis;
  jobText: string | null;
  jobDescriptionId: string | null;
  /** The tailored resume, when the target is a saved application. */
  resumeId: string | null;
}

export type Outcome<T> = { ok: true; value: T } | { ok: false; response: Response };

const fail = (error: string, status = 400): Outcome<never> => ({ ok: false, response: NextResponse.json({ error }, { status }) });

export function targetLabel(job: JobAnalysis): string {
  return job.company ? `${job.title} at ${job.company}` : job.title;
}

/**
 * Gives a route the user's Gemini model, after the per-user AI rate limit.
 * Every AI call goes through this, so a missing key reads the same everywhere.
 */
export async function aiModel(userId: string, kind: string, limit?: number): Promise<Outcome<JsonModel>> {
  const limited = await limitAi(userId, kind, limit);
  if (limited) return { ok: false, response: limited };
  const key = await loadGeminiKey(userId);
  if (!key.ok) return { ok: false, response: NextResponse.json({ error: key.message, code: key.code }, { status: 400 }) };
  return { ok: true, value: geminiModel(key.apiKey, userId) };
}

export function aiFailure(error: unknown, fallback: string): Response {
  return NextResponse.json({ error: error instanceof AiError ? error.message : fallback }, { status: 422 });
}

async function applicationTarget(userId: string, resumeId: string): Promise<Outcome<Target>> {
  const resume = await getResume(userId, resumeId);
  if (!resume || resume.kind !== "tailored" || !resume.tailoring_session_id) return fail("That application wasn't found.", 404);
  const [session, jd] = await Promise.all([
    getTailoringSession(userId, resume.tailoring_session_id),
    resume.job_description_id ? getJobDescription(userId, resume.job_description_id) : undefined,
  ]);
  const job = JobAnalysisSchema.safeParse(session?.job_analysis);
  if (!job.success) return fail("That application has no job analysis. Tailor it again first.");
  return {
    ok: true,
    value: { label: targetLabel(job.data), job: job.data, jobText: jd?.raw_text ?? null, jobDescriptionId: jd?.id ?? null, resumeId: resume.id },
  };
}

/**
 * Resolves what the user picked. A saved application reuses its stored
 * analysis without an AI call; a pasted post is analyzed once and saved as a
 * job description; a role title gets the role's typical requirements.
 */
export async function resolveTarget(
  userId: string,
  input: Exclude<TargetInput, { kind: "none" }>,
  kind: string,
  existing?: JsonModel,
): Promise<Outcome<Target>> {
  if (input.kind === "application") return applicationTarget(userId, input.resumeId);

  const model: Outcome<JsonModel> = existing ? { ok: true, value: existing } : await aiModel(userId, kind);
  if (!model.ok) return model;
  try {
    if (input.kind === "role") {
      const job = await analyzeRole(model.value, input.role);
      return { ok: true, value: { label: job.title, job, jobText: null, jobDescriptionId: null, resumeId: null } };
    }
    const job = await analyzeJob(model.value, input.text);
    const jobDescriptionId = await createJobDescription(userId, { raw_text: input.text, job_title: job.title, company: job.company });
    return { ok: true, value: { label: targetLabel(job), job, jobText: input.text, jobDescriptionId, resumeId: null } };
  } catch (error) {
    return { ok: false, response: aiFailure(error, "Couldn't read that job. Try again.") };
  }
}

/** The resume a tool grounds its AI in: the application's tailored copy, or the master. */
export async function groundingResume(userId: string, resumeId: string | null): Promise<Outcome<{ id: string; markdown: string }>> {
  const resume = resumeId ? await getResume(userId, resumeId) : await getDefaultMaster(userId);
  const doc = resume ? resolveDocument(resume.content) : null;
  if (!resume || !doc) return fail("Add a master resume first.");
  return { ok: true, value: { id: resume.id, markdown: documentToMarkdown(doc) } };
}
