import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { jobDescriptions as jobs, resumes, scans } from "@/lib/db/schema";
import type { MatchReport } from "@/lib/report/report";
import type { DocumentContent } from "@/lib/schemas/document";

const uuid = z.uuid();
const owned = (userId: string, id: string) => and(eq(scans.user_id, userId), eq(scans.id, id));
const ownJob = and(eq(jobs.id, scans.job_description_id), eq(jobs.user_id, scans.user_id));

export interface NewScan {
  resumeId: string | null;
  resumeLabel: string;
  resumeText: string;
  resumeContent: DocumentContent;
  jobDescriptionId: string;
  report: MatchReport;
}

export async function createScan(userId: string, scan: NewScan) {
  const [row] = await db.insert(scans).values({
    user_id: userId,
    resume_id: scan.resumeId,
    resume_label: scan.resumeLabel,
    resume_text: scan.resumeText,
    resume_content: scan.resumeContent,
    job_description_id: scan.jobDescriptionId,
    report: scan.report,
    match_rate: scan.report.matchRate,
  }).returning({ id: scans.id });
  return row.id;
}

const summary = {
  id: scans.id,
  matchRate: scans.match_rate,
  createdAt: scans.created_at,
  resumeId: scans.resume_id,
  resumeLabel: scans.resume_label,
  jobId: jobs.id,
  jobTitle: jobs.job_title,
  company: jobs.company,
};
export type ScanSummary = Awaited<ReturnType<typeof listScans>>[number];

/** Newest first. */
export async function listScans(userId: string, limit = 200) {
  return db.select(summary).from(scans).innerJoin(jobs, ownJob).where(eq(scans.user_id, userId))
    .orderBy(desc(scans.created_at), desc(scans.id)).limit(limit);
}

export async function getScan(userId: string, id: string) {
  if (!uuid.safeParse(id).success) return undefined;
  const [row] = await db.select({
    ...summary,
    report: sql<MatchReport>`${scans.report}`,
    resumeContent: scans.resume_content,
    resumeText: scans.resume_text,
    // The resume may have been deleted since; its id is then cleared by the foreign key.
    resumeTitle: resumes.title,
    jobText: jobs.raw_text,
    jobUrl: jobs.source_url,
    tracked: sql<boolean>`${jobs.tracker_stage} is not null`,
  }).from(scans).innerJoin(jobs, ownJob)
    .leftJoin(resumes, and(eq(resumes.id, scans.resume_id), eq(resumes.user_id, scans.user_id)))
    .where(owned(userId, id));
  return row;
}

export async function deleteScan(userId: string, id: string) {
  if (!uuid.safeParse(id).success) return undefined;
  const [row] = await db.delete(scans).where(owned(userId, id)).returning({ id: scans.id });
  return row;
}

/** Save an editable copy once, even when the same report is opened concurrently. */
export async function saveScannedResume(userId: string, id: string, values: Omit<typeof resumes.$inferInsert, "user_id">) {
  if (!uuid.safeParse(id).success) return undefined;
  return db.transaction(async (tx) => {
    const [scan] = await tx.select({ resumeId: scans.resume_id }).from(scans).where(owned(userId, id)).for("update");
    if (!scan || scan.resumeId) return scan?.resumeId ?? undefined;
    const [resume] = await tx.insert(resumes).values({ ...values, user_id: userId }).returning({ id: resumes.id });
    await tx.update(scans).set({ resume_id: resume.id }).where(owned(userId, id));
    return resume.id;
  });
}
