import { createResume, removeResume } from "@/lib/data/resumes";
import { createTailoringSession, updateTailoringSession } from "@/lib/data/tailoring";
import type { PipelineStore } from "./pipeline";

export function postgresPipelineStore(
  userId: string,
  ctx: { sourceResumeId: string; sourceTitle: string; designSourcePath: string | null; jobDescriptionId: string },
): PipelineStore {
  const source = {
    source_resume_id: ctx.sourceResumeId,
    source_resume_title_snapshot: ctx.sourceTitle,
    job_description_id: ctx.jobDescriptionId,
  };
  return {
    createSession: ({ sourceSnapshot, model }) => createTailoringSession(userId, {
      ...source, source_snapshot: sourceSnapshot, gemini_model: model, started_at: new Date().toISOString(),
    }),
    updateSession: (id, patch) => updateTailoringSession(userId, id, patch),
    createTailoredResume: ({ sessionId, title, content, jobTitle, company }) => createResume(userId, {
      ...source, kind: "tailored", title, content, job_title_snapshot: jobTitle, job_company_snapshot: company,
      tailoring_session_id: sessionId, design_source_path: ctx.designSourcePath,
    }),
    async deleteResume(id) {
      await removeResume(userId, id);
    },
  };
}
