import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
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
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "unauthorized", "Sign in to continue.");

  const form = await request.formData().catch(() => null);
  if (!form) return fail(400, "no_file", "Upload a file or paste your resume.");
  const file = form.get("file");
  const pasted = form.get("text");

  const key = await loadGeminiKey(supabase, user.id);
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
      const { error: uploadError } = await supabase.storage
        .from(RESUME_UPLOADS_BUCKET)
        .upload(storagePath, buffer, { contentType: file.type || "application/octet-stream", upsert: false });
      if (uploadError) storagePath = null; // Keeping the original is a convenience, not a requirement.

      result = await importResume({ kind, buffer }, apiKey);
    } else if (typeof pasted === "string" && pasted.trim()) {
      if (pasted.length > MAX_PASTE_CHARS) return fail(400, "too_long", "That's longer than a resume. Paste just your resume text.");
      result = await importResume({ kind: "text", text: pasted }, apiKey);
    } else {
      return fail(400, "no_file", "Upload a file or paste your resume.");
    }

    const { error } = await supabase.from("resumes").insert({
      id: resumeId,
      user_id: user.id,
      kind: "master",
      title: result.title,
      content: result.content,
      status: "draft",
      is_default: false,
      original_file_storage_path: storagePath,
      original_file_name: fileName,
      design_source_path: result.keepsDesign ? storagePath : null,
    });
    if (error) throw new Error("insert failed");

    // Drop earlier drafts that were never reviewed, so abandoned uploads don't pile up.
    const { data: stale } = await supabase
      .from("resumes")
      .select("id, original_file_storage_path")
      .eq("user_id", user.id)
      .eq("kind", "master")
      .eq("status", "draft")
      .eq("is_default", false)
      .neq("id", resumeId);
    if (stale?.length) {
      const paths = stale.map((r) => r.original_file_storage_path).filter((p): p is string => !!p);
      if (paths.length) await supabase.storage.from(RESUME_UPLOADS_BUCKET).remove(paths);
      await supabase.from("resumes").delete().in("id", stale.map((r) => r.id));
    }

    return NextResponse.json({ resumeId, usedAi: result.usedAi, keepsDesign: result.keepsDesign && !!storagePath });
  } catch (error) {
    if (storagePath) await supabase.storage.from(RESUME_UPLOADS_BUCKET).remove([storagePath]);
    if (error instanceof ImportError) return fail(422, "parse_failed", error.message);
    return fail(500, "save_failed", "Couldn't save your resume. Try again.");
  }
}
