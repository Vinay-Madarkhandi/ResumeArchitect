import { limitAi } from "@/lib/server/rateLimit";
import { deleteObjects, putObject } from "@/lib/storage";
import { referencedObjects, replaceImportDraft } from "@/lib/data/resumes";
import { logger } from "@/lib/logger";
import { checkOrigin } from "@/lib/auth/guards";
import { currentUser } from "@/lib/auth/current-user";
import { NextResponse } from "next/server";
import { loadGeminiKey } from "@/lib/server/geminiKey";
import { ImportError, importResume, MAX_RESUME_CHARS, MAX_UPLOAD_FORM_BYTES, readResumeUpload } from "@/lib/server/importResume";
import { ParseBusyError } from "@/lib/report/inspectBudget";
import { BodyTooLarge, readFormData } from "@/lib/server/request-body";
import { RESUME_UPLOADS_BUCKET, originalResumePath } from "@/lib/storage/paths";

export const runtime = "nodejs";
export const maxDuration = 120;

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ errorCode: code, errorMessage: message }, { status });
}

/**
 * Imports a resume as a draft master. Accepts multipart form data with either
 * `file` (PDF, DOCX, TXT) or `text` (pasted). The draft becomes the user's
 * master only after they review it (finalizeMasterResume).
 */
export async function POST(request: Request) {
  const originError = checkOrigin(request);
  if (originError) return originError;
  const user = await currentUser();
  if (!user) return fail(401, "unauthorized", "Sign in to continue.");

  let form: FormData | null;
  try {
    form = await readFormData(request, MAX_UPLOAD_FORM_BYTES);
  } catch (error) {
    if (error instanceof BodyTooLarge) return fail(413, "file_too_large", "That file is over 8 MB. Upload a smaller one.");
    throw error;
  }
  if (!form) return fail(400, "no_file", "Upload a file or paste your resume.");
  const file = form.get("file");
  const pasted = form.get("text");

  if (await limitAi(user.id, "resume-import")) return fail(429, "rate_limited", "Too many imports. Try again later.");
  const key = await loadGeminiKey(user.id);
  const apiKey = key.ok ? key.apiKey : null;
  const resumeId = crypto.randomUUID();
  let storagePath: string | null = null;
  let fileName: string | null = null;

  try {
    let result;
    let detectedTemplate: import("@/lib/resume/templates").TemplateId = "classic";
    if (file instanceof File && file.size > 0) {
      const { kind, facts, resume } = await readResumeUpload(file);
      storagePath = originalResumePath(user.id, resumeId, kind === "text" ? "txt" : kind);
      fileName = file.name;
      const { detectResumeTemplate } = await import("@/lib/resume/detectTemplate");
      detectedTemplate = detectResumeTemplate(facts);
      try {
        await putObject(user.id, RESUME_UPLOADS_BUCKET, storagePath, Buffer.from(await file.arrayBuffer()), file.type || "application/octet-stream");
      } catch {
        logger.warn({ userId: user.id, resumeId }, "Could not keep original resume upload");
        storagePath = null;
      }

      result = await importResume(user.id, resume, apiKey);
    } else if (typeof pasted === "string" && pasted.trim()) {
      if (pasted.length > MAX_RESUME_CHARS) return fail(400, "too_long", "That's longer than a resume. Paste just your resume text.");
      result = await importResume(user.id, { source: "text", text: pasted, parsed: null }, apiKey);
    } else {
      return fail(400, "no_file", "Upload a file or paste your resume.");
    }

    const stale = await replaceImportDraft(user.id, {
      id: resumeId,
      kind: "master",
      title: result.title,
      content: result.content,
      status: "draft",
      is_default: false,
      original_file_storage_path: storagePath,
      original_file_name: fileName,
      design_source_path: result.keepsDesign ? storagePath : null,
      template: detectedTemplate,
    });
    const referenced = await referencedObjects(user.id, RESUME_UPLOADS_BUCKET, stale).catch(() => new Set(stale));
    await deleteObjects(user.id, RESUME_UPLOADS_BUCKET, stale.filter((path) => !referenced.has(path)))
      .catch(() => logger.warn({ userId: user.id }, "Could not remove stale uploads"));

    return NextResponse.json({
      resumeId,
      usedAi: result.usedAi,
      keepsDesign: result.keepsDesign && !!storagePath,
      template: detectedTemplate,
    });
  } catch (error) {
    if (storagePath) await deleteObjects(user.id, RESUME_UPLOADS_BUCKET, [storagePath]).catch(() => {});
    if (error instanceof ParseBusyError) {
      return NextResponse.json(
        { errorCode: "busy", errorMessage: error.message, error: error.message },
        { status: 429, headers: { "Retry-After": String(error.retryAfter) } },
      );
    }
    if (error instanceof ImportError) return fail(422, "parse_failed", error.message);
    return fail(500, "save_failed", "Couldn't save your resume. Try again.");
  }
}
