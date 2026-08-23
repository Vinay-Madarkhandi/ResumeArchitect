export const RESUME_UPLOADS_BUCKET = "resume-uploads";
export const RESUME_EXPORTS_BUCKET = "resume-exports";

export function originalResumePath(userId: string, resumeId: string) {
  return `${userId}/${resumeId}/source.pdf`;
}

export function exportedPdfPath(userId: string, resumeId: string) {
  return `${userId}/${resumeId}/export.pdf`;
}

export const MAX_RESUME_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
