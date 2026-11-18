"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth/current-user";
import { getJobDescription } from "@/lib/data/job-descriptions";
import { trackJobDescription } from "@/lib/data/jobs";
import { getResume } from "@/lib/data/resumes";
import { deleteScan, getScan, saveScannedResume } from "@/lib/data/scans";
import { resolveDocument } from "@/lib/documentConversion";
import { markdownToDocument } from "@/lib/documentMarkdown";
import { scanResume } from "@/lib/server/scan";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function deleteScanAction(id: string): Promise<Result> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Sign in to continue." };
  if (!(await deleteScan(user.id, id))) return { ok: false, error: "That scan wasn't found." };
  revalidatePath("/scans");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Scans the resume as it is now (or the scanned text, if it was never saved) against the same job. */
export async function rescanAction(id: string): Promise<Result<{ id: string }>> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Sign in to continue." };
  const scan = await getScan(user.id, id);
  const job = scan && await getJobDescription(user.id, scan.jobId);
  if (!scan || !job) return { ok: false, error: "That scan wasn't found." };

  const saved = scan.resumeId ? await getResume(user.id, scan.resumeId) : undefined;
  const content = resolveDocument(saved?.content ?? scan.resumeContent) ?? (scan.resumeText ? markdownToDocument(scan.resumeText) : null);
  if (!content) return { ok: false, error: "The scanned resume is gone. Start a new scan." };

  const result = await scanResume(user.id, { id: saved?.id ?? null, label: saved?.title ?? scan.resumeLabel, content, file: null }, job);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/scans");
  return { ok: true, id: result.value };
}

/**
 * The saved resume behind a scan. Pasted or uploaded text is saved the first
 * time it's opened, as a resume for this job, and the scan points at it.
 */
export async function scanResumeAction(id: string): Promise<Result<{ resumeId: string; jobId: string }>> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Sign in to continue." };
  const scan = await getScan(user.id, id);
  if (!scan) return { ok: false, error: "That scan wasn't found." };
  if (scan.resumeId) return { ok: true, resumeId: scan.resumeId, jobId: scan.jobId };

  const content = resolveDocument(scan.resumeContent) ?? (scan.resumeText ? markdownToDocument(scan.resumeText) : null);
  if (!content) return { ok: false, error: "The scanned resume is gone. Start a new scan." };
  const resumeId = await saveScannedResume(user.id, id, {
    kind: "tailored",
    title: scan.jobTitle ? `${scan.resumeLabel} · ${scan.jobTitle}` : scan.resumeLabel,
    content,
    job_description_id: scan.jobId,
    job_title_snapshot: scan.jobTitle,
    job_company_snapshot: scan.company,
  });
  if (!resumeId) return { ok: false, error: "That scan wasn't found." };
  revalidatePath("/dashboard");
  return { ok: true, resumeId, jobId: scan.jobId };
}

export async function trackScannedJob(id: string): Promise<Result> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Sign in to continue." };
  const scan = await getScan(user.id, id);
  if (!scan) return { ok: false, error: "That scan wasn't found." };
  await trackJobDescription(user.id, scan.jobId);
  revalidatePath("/tracker");
  revalidatePath(`/scan/${id}`);
  return { ok: true };
}
