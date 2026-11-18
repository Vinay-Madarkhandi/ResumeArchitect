import { limitAi } from "@/lib/server/rateLimit";
import { deleteObjects, putObject } from "@/lib/storage";
import { referencedObjects, replaceImportDraft } from "@/lib/data/resumes";
import { logger } from "@/lib/logger";
import { checkOrigin } from "@/lib/auth/guards";
import { currentUser } from "@/lib/auth/current-user";
import { NextResponse } from "next/server";
import { loadGeminiKey } from "@/lib/server/geminiKey";
import { detectKind, ImportError, importResume } from "@/lib/server/importResume";
import { MAX_RESUME_UPLOAD_BYTES, RESUME_UPLOADS_BUCKET, originalResumePath } from "@/lib/storage/paths";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_PASTE_CHARS = 40_000;

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

  const form = await request.formData().catch(() => null);
  if (!form) return fail(400, "no_file", "Upload a file or paste your resume.");
  const file = form.get("file");
  const pasted = form.get("text");

  const key = await loadGeminiKey(user.id);
  if (key.ok) {
    const limited = await limitAi(user.id, "resume-import");
    if (limited) return fail(429, "rate_limited", "Too many imports. Try again later.");
  }
  const apiKey = key.ok ? key.apiKey : null;
  const resumeId = crypto.randomUUID();
  let storagePath: string | null = null;
  let fileName: string | null = null;

  try {
    let result;
    if (file instanceof File && file.size > 0) {
      const kind = detectKind(file);
      if (!kind) return fail(400, "invalid_file_type", "Upload a PDF, Word (.docx), or text file.");
      if (file.size > MAX_RESUME_UPLOAD_BYTES) return fail(400, "file_too_large", "That file is over 10 MB. Upload a smaller one.");
      const buffer = await file.arrayBuffer();

      storagePath = originalResumePath(user.id, resumeId, kind === "text" ? "txt" : kind);
      fileName = file.name;
      try {
        await putObject(user.id, RESUME_UPLOADS_BUCKET, storagePath, Buffer.from(buffer), file.type || "application/octet-stream");
      } catch {
        logger.warn({ userId: user.id, resumeId }, "Could not keep original resume upload");
        storagePath = null;
      }

      result = await importResume({ kind, buffer }, apiKey);
    } else if (typeof pasted === "string" && pasted.trim()) {
      if (pasted.length > MAX_PASTE_CHARS) return fail(400, "too_long", "That's longer than a resume. Paste just your resume text.");
      result = await importResume({ kind: "text", text: pasted }, apiKey);
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
    });
    const referenced = await referencedObjects(user.id, RESUME_UPLOADS_BUCKET, stale).catch(() => new Set(stale));
    await deleteObjects(user.id, RESUME_UPLOADS_BUCKET, stale.filter((path) => !referenced.has(path)))
      .catch(() => logger.warn({ userId: user.id }, "Could not remove stale uploads"));

    return NextResponse.json({ resumeId, usedAi: result.usedAi, keepsDesign: result.keepsDesign && !!storagePath });
  } catch (error) {
    if (storagePath) await deleteObjects(user.id, RESUME_UPLOADS_BUCKET, [storagePath]).catch(() => {});
    if (error instanceof ImportError) return fail(422, "parse_failed", error.message);
    return fail(500, "save_failed", "Couldn't save your resume. Try again.");
  }
}
