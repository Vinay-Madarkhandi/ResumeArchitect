export const RESUME_UPLOADS_BUCKET = "resume-uploads";
/** v1 stored generated PDFs here; exports are now streamed, so it is only cleaned up. */
export const RESUME_EXPORTS_BUCKET = "resume-exports";

export function originalResumePath(userId: string, resumeId: string, extension: "pdf" | "docx" | "txt") {
  return `${userId}/${resumeId}/source.${extension}`;
}

export const MAX_RESUME_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
