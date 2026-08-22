import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { tailorResume } from "@/lib/gemini/prompts/tailorResume";
import { TAILOR_MODEL } from "@/lib/gemini/config";
import { findFabricatedCompanies } from "./fabricationGuardrail";
import type { ResumeContent } from "@/lib/schemas/resume";

export interface RunTailoringSessionInput {
  supabase: SupabaseClient<Database>;
  userId: string;
  apiKey: string;
  sourceResume: { id: string; title: string; content: ResumeContent };
  jobDescriptionId: string;
  jobDescriptionText: string;
  jobTitle: string | null;
  company: string | null;
}

export type SessionErrorCode = NonNullable<Database["public"]["Tables"]["tailoring_sessions"]["Row"]["error_code"]>;

export type RunTailoringSessionResult =
  | { ok: true; sessionId: string; resumeId: string; changes: unknown }
  | { ok: false; sessionId: string; errorCode: SessionErrorCode; errorMessage: string };

/** Shared by the initial POST /api/tailoring and its retry endpoint — every
 * attempt (first try or retry) creates its own new session row, so history
 * is immutable and a failed attempt never gets silently overwritten. */
export async function runTailoringSession(input: RunTailoringSessionInput): Promise<RunTailoringSessionResult> {
  const { supabase, userId, apiKey, sourceResume, jobDescriptionId, jobDescriptionText, jobTitle, company } = input;

  const { data: session, error: sessionError } = await supabase
    .from("tailoring_sessions")
    .insert({
      user_id: userId,
      source_resume_id: sourceResume.id,
      source_resume_title_snapshot: sourceResume.title,
      job_description_id: jobDescriptionId,
      status: "analyzing",
      gemini_model: TAILOR_MODEL,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    throw new Error("Couldn't create a tailoring session.");
  }
  const sessionId = session.id;

  async function fail(errorCode: SessionErrorCode, errorMessage: string): Promise<RunTailoringSessionResult> {
    await supabase
      .from("tailoring_sessions")
      .update({ status: "failed", error_code: errorCode, error_message: errorMessage, completed_at: new Date().toISOString() })
      .eq("id", sessionId);
    return { ok: false, sessionId, errorCode, errorMessage };
  }

  const tailorResult = await tailorResume(apiKey, sourceResume.content, jobDescriptionText);
  if (!tailorResult.ok) {
    return fail(tailorResult.errorCode, tailorResult.message);
  }

  const fabricated = findFabricatedCompanies(sourceResume.content, tailorResult.result.resume);
  if (fabricated.length > 0) {
    return fail(
      "fabrication_detected",
      "The generated resume introduced a company that wasn't in your original resume, so it was discarded. Please try again.",
    );
  }

  const resumeId = crypto.randomUUID();
  const title = jobTitle && company ? `${jobTitle} — ${company}` : jobTitle || company || `Tailored from ${sourceResume.title}`;

  const { error: insertError } = await supabase.from("resumes").insert({
    id: resumeId,
    user_id: userId,
    kind: "tailored",
    title,
    content: tailorResult.result.resume,
    status: "draft",
    is_default: false,
    source_resume_id: sourceResume.id,
    source_resume_title_snapshot: sourceResume.title,
    job_description_id: jobDescriptionId,
    job_title_snapshot: jobTitle,
    job_company_snapshot: company,
    tailoring_session_id: sessionId,
    low_confidence_fields: [],
  });

  if (insertError) {
    return fail("unknown", "Couldn't save the tailored resume. Please try again.");
  }

  await supabase
    .from("tailoring_sessions")
    .update({
      status: "completed",
      result_resume_id: resumeId,
      result_resume_title_snapshot: title,
      change_explanations: tailorResult.result.changes,
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  return { ok: true, sessionId, resumeId, changes: tailorResult.result.changes };
}
