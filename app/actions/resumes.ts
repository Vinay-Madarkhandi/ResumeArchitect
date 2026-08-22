"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { RESUME_EXPORTS_BUCKET, RESUME_UPLOADS_BUCKET } from "@/lib/storage/paths";
import type { ActionResult } from "./onboarding";

async function requireUser() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function renameResume(resumeId: string, title: string): Promise<ActionResult> {
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Title can't be empty." };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("resumes")
    .update({ title: trimmed })
    .eq("id", resumeId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/library");
  return { ok: true };
}

export async function duplicateResume(resumeId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: original, error: fetchError } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", resumeId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !original) return { ok: false, error: "That resume could not be found." };

  const { error: insertError } = await supabase.from("resumes").insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    kind: "tailored",
    title: `${original.title} (Copy)`,
    content: original.content,
    status: "draft",
    is_default: false,
    source_resume_id: original.kind === "master" ? original.id : original.source_resume_id,
    source_resume_title_snapshot: original.kind === "master" ? original.title : original.source_resume_title_snapshot,
    job_description_id: original.job_description_id,
    job_title_snapshot: original.job_title_snapshot,
    job_company_snapshot: original.job_company_snapshot,
    low_confidence_fields: [],
  });

  if (insertError) return { ok: false, error: insertError.message };
  revalidatePath("/library");
  return { ok: true };
}

export async function deleteResume(resumeId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: resume, error: fetchError } = await supabase
    .from("resumes")
    .select("id, user_id, is_default, kind, original_file_storage_path, pdf_storage_path")
    .eq("id", resumeId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !resume) return { ok: false, error: "That resume could not be found." };
  if (resume.is_default) {
    return {
      ok: false,
      error: "This is your active master resume — replace it instead of deleting it.",
    };
  }

  const objectsToRemove: { bucket: string; path: string }[] = [];
  if (resume.original_file_storage_path) {
    objectsToRemove.push({ bucket: RESUME_UPLOADS_BUCKET, path: resume.original_file_storage_path });
  }
  if (resume.pdf_storage_path) {
    objectsToRemove.push({ bucket: RESUME_EXPORTS_BUCKET, path: resume.pdf_storage_path });
  }

  const { error: deleteError } = await supabase.from("resumes").delete().eq("id", resumeId);
  if (deleteError) return { ok: false, error: deleteError.message };

  for (const { bucket, path } of objectsToRemove) {
    await supabase.storage.from(bucket).remove([path]);
  }

  revalidatePath("/library");
  return { ok: true };
}
