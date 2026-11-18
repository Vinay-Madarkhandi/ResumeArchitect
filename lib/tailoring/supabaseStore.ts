import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PipelineStore } from "./pipeline";

/** PipelineStore backed by Supabase, acting as the signed-in user (RLS applies). */
export function supabasePipelineStore(
  supabase: SupabaseClient<Database>,
  ctx: { userId: string; sourceResumeId: string; sourceTitle: string; designSourcePath: string | null; jobDescriptionId: string },
): PipelineStore {
  return {
    async createSession({ sourceSnapshot, model }) {
      const { data, error } = await supabase
        .from("tailoring_sessions")
        .insert({
          user_id: ctx.userId,
          source_resume_id: ctx.sourceResumeId,
          source_resume_title_snapshot: ctx.sourceTitle,
          job_description_id: ctx.jobDescriptionId,
          status: "pending",
          source_snapshot: sourceSnapshot,
          gemini_model: model,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error || !data) throw new Error("Couldn't create a tailoring session.");
      return data.id;
    },

    async updateSession(sessionId, patch) {
      const { error } = await supabase.from("tailoring_sessions").update(patch).eq("id", sessionId);
      if (error) throw new Error("Couldn't update the tailoring session.");
    },

    async createTailoredResume({ sessionId, title, content, jobTitle, company }) {
      const id = crypto.randomUUID();
      const { error } = await supabase.from("resumes").insert({
        id,
        user_id: ctx.userId,
        kind: "tailored",
        title,
        content,
        status: "draft",
        is_default: false,
        source_resume_id: ctx.sourceResumeId,
        source_resume_title_snapshot: ctx.sourceTitle,
        job_description_id: ctx.jobDescriptionId,
        job_title_snapshot: jobTitle,
        job_company_snapshot: company,
        tailoring_session_id: sessionId,
        design_source_path: ctx.designSourcePath,
      });
      if (error) throw new Error("Couldn't save the tailored resume.");
      return id;
    },

    async deleteResume(resumeId) {
      await supabase.from("resumes").delete().eq("id", resumeId);
    },
  };
}
