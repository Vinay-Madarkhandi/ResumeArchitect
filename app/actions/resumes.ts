"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth/current-user";
import { createResume, getResume, referencedObjects, removeResume, updateResume } from "@/lib/data/resumes";
import { deleteObjects, resumeBuckets } from "@/lib/storage";
import { RESUME_UPLOADS_BUCKET } from "@/lib/storage/paths";
import { logger } from "@/lib/logger";
import type { ActionResult } from "./onboarding";

export async function renameResume(resumeId: string, title: string): Promise<ActionResult> {
  const trimmed = title.trim().slice(0, 160);
  if (!trimmed) return { ok: false, error: "Title can't be empty." };
  const user = await currentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const saved = await updateResume(user.id, resumeId, { title: trimmed }).catch(() => null);
  if (!saved) return { ok: false, error: "Couldn't rename that resume." };
  revalidatePath("/dashboard");
  revalidatePath("/resumes");
  return { ok: true };
}

export async function duplicateResume(resumeId: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const original = await getResume(user.id, resumeId);
  if (!original) return { ok: false, error: "That resume could not be found." };
  const id = await createResume(user.id, {
    kind: "tailored",
    title: `${original.title} (Copy)`,
    content: original.content,
    template: original.template,
    source_resume_id: original.kind === "master" ? original.id : original.source_resume_id,
    source_resume_title_snapshot: original.kind === "master" ? original.title : original.source_resume_title_snapshot,
    job_description_id: original.job_description_id,
    job_title_snapshot: original.job_title_snapshot,
    job_company_snapshot: original.job_company_snapshot,
    design_source_path: original.design_source_path,
  }).catch(() => null);
  if (!id) return { ok: false, error: "Couldn't duplicate that resume." };
  revalidatePath("/dashboard");
  revalidatePath("/resumes");
  return { ok: true };
}

export async function deleteResume(resumeId: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const original = await getResume(user.id, resumeId);
  if (!original) return { ok: false, error: "That resume could not be found." };
  if (original.is_default) return { ok: false, error: "This is your active master resume. Replace it to remove it." };

  const resume = await removeResume(user.id, resumeId).catch(() => null);
  if (!resume) return { ok: false, error: "Couldn't delete that resume." };
  for (const bucket of resumeBuckets) {
    const paths = [...new Set(bucket === RESUME_UPLOADS_BUCKET
      ? [resume.original_file_storage_path, resume.design_source_path] : [resume.pdf_storage_path])]
      .filter((path): path is string => Boolean(path));
    try {
      const inUse = await referencedObjects(user.id, bucket, paths);
      await deleteObjects(user.id, bucket, paths.filter((path) => !inUse.has(path)));
    } catch {
      logger.warn({ resumeId }, "Could not remove deleted resume objects");
    }
  }
  revalidatePath("/dashboard");
  revalidatePath("/resumes");
  return { ok: true };
}
