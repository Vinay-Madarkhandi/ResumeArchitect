import { and, desc, eq, getTableColumns, inArray, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { jobDescriptions, profiles, resumes } from "@/lib/db/schema";
import type { ApplicationStatus } from "@/lib/tracker/stages";
import { moveJob } from "./jobs";
import type { DocumentContent } from "@/lib/schemas/document";
import { RESUME_UPLOADS_BUCKET } from "@/lib/storage/paths";

type Insert = Omit<typeof resumes.$inferInsert, "user_id">;
type Patch = Partial<Pick<Insert,
  "title" | "content" | "template" | "reviewed_change_ids" | "application_status" | "application_status_updated_at" | "cover_letter">>;

const uuid = z.uuid();
const owned = (userId: string, resumeId: string) => and(eq(resumes.user_id, userId), eq(resumes.id, resumeId));

const joinedJob = and(eq(jobDescriptions.id, resumes.job_description_id), eq(jobDescriptions.user_id, resumes.user_id));
const stage = sql<ApplicationStatus>`coalesce(${jobDescriptions.tracker_stage}::text, ${resumes.application_status})`;

export async function getResume(userId: string, resumeId: string) {
  if (!uuid.safeParse(resumeId).success) return undefined;
  const [resume] = await db.select({ ...getTableColumns(resumes), application_status: stage })
    .from(resumes).leftJoin(jobDescriptions, joinedJob).where(owned(userId, resumeId));
  return resume;
}

export async function listResumes(userId: string, onlyDrafts = false) {
  return db.select({
    id: resumes.id, kind: resumes.kind, title: resumes.title, status: resumes.status, is_default: resumes.is_default,
    updated_at: resumes.updated_at, job_title_snapshot: resumes.job_title_snapshot,
    job_company_snapshot: resumes.job_company_snapshot, tailoring_session_id: resumes.tailoring_session_id,
    application_status: stage,
  }).from(resumes).leftJoin(jobDescriptions, joinedJob).where(and(eq(resumes.user_id, userId), onlyDrafts ? eq(resumes.status, "draft") : undefined))
    .orderBy(desc(resumes.updated_at));
}

export async function createResume(userId: string, values: Insert) {
  const [resume] = await db.insert(resumes).values({ ...values, user_id: userId }).returning({ id: resumes.id });
  return resume.id;
}

export async function replaceImportDraft(userId: string, values: Insert) {
  return db.transaction(async (tx) => {
    await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, userId)).for("update");
    const deleted = await tx.delete(resumes).where(and(
      eq(resumes.user_id, userId), eq(resumes.kind, "master"), eq(resumes.status, "draft"), eq(resumes.is_default, false),
    )).returning({ path: resumes.original_file_storage_path });
    await tx.insert(resumes).values({ ...values, user_id: userId });
    return deleted.flatMap(({ path }) => path ? [path] : []);
  });
}

export async function updateResume(userId: string, resumeId: string, patch: Patch) {
  if (!uuid.safeParse(resumeId).success) return undefined;
  if (!patch.application_status) {
    const [row] = await db.update(resumes).set(patch).where(owned(userId, resumeId)).returning({ updated_at: resumes.updated_at });
    return row;
  }
  const next = patch.application_status;
  return db.transaction(async (tx) => {
    const [row] = await tx.update(resumes).set(patch).where(owned(userId, resumeId))
      .returning({ updated_at: resumes.updated_at, jobId: resumes.job_description_id, kind: resumes.kind });
    if (row?.kind === "tailored" && row.jobId) await moveJob(userId, row.jobId, next, tx);
    return row;
  });
}

export async function removeResume(userId: string, resumeId: string) {
  if (!uuid.safeParse(resumeId).success) return undefined;
  const [row] = await db.delete(resumes).where(and(owned(userId, resumeId), eq(resumes.is_default, false))).returning();
  return row;
}

export async function promoteMaster(userId: string, resumeId: string, content: DocumentContent, title: string) {
  if (!uuid.safeParse(resumeId).success) return false;
  return db.transaction(async (tx) => {
    await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, userId)).for("update");
    const [candidate] = await tx.select({ id: resumes.id }).from(resumes)
      .where(and(owned(userId, resumeId), eq(resumes.kind, "master"))).for("update");
    if (!candidate) return false;
    await tx.update(resumes).set({ is_default: false, status: "archived" }).where(and(
      eq(resumes.user_id, userId), eq(resumes.kind, "master"), eq(resumes.is_default, true), ne(resumes.id, resumeId),
    ));
    await tx.update(resumes).set({ content, title, is_default: true, status: "draft" }).where(owned(userId, resumeId));
    await tx.update(profiles).set({ default_resume_id: resumeId, onboarding_completed_at: new Date().toISOString() })
      .where(eq(profiles.id, userId));
    return true;
  });
}

/** Build a master in the same transaction that makes it the onboarding default. */
export async function createBuiltMaster(userId: string, values: Pick<Insert, "title" | "content" | "template">) {
  return db.transaction(async (tx) => {
    const [profile] = await tx.select({ id: profiles.id }).from(profiles)
      .where(eq(profiles.id, userId)).for("update");
    if (!profile) return undefined;

    await tx.update(resumes).set({ is_default: false, status: "archived" }).where(and(
      eq(resumes.user_id, userId), eq(resumes.kind, "master"), eq(resumes.is_default, true),
    ));
    const [resume] = await tx.insert(resumes).values({
      ...values, user_id: userId, kind: "master", is_default: true,
    }).returning({ id: resumes.id });
    await tx.update(profiles).set({ default_resume_id: resume.id, onboarding_completed_at: new Date().toISOString() })
      .where(eq(profiles.id, userId));
    return resume.id;
  });
}

export async function referencedObjects(userId: string, bucket: string, keys: string[]) {
  if (!keys.length || !uuid.safeParse(userId).success) return new Set<string>();
  if (bucket === RESUME_UPLOADS_BUCKET) {
    const rows = await db.select({
      original: resumes.original_file_storage_path, design: resumes.design_source_path,
    }).from(resumes).where(and(eq(resumes.user_id, userId),
      or(inArray(resumes.original_file_storage_path, keys), inArray(resumes.design_source_path, keys))));
    return new Set(rows.flatMap(({ original, design }) => [original, design].filter((key): key is string => Boolean(key))));
  }
  const rows = await db.select({ pdf: resumes.pdf_storage_path }).from(resumes)
    .where(and(eq(resumes.user_id, userId), inArray(resumes.pdf_storage_path, keys)));
  return new Set(rows.flatMap(({ pdf }) => pdf ? [pdf] : []));
}

/** Tailored applications with their job, for the career tools' target pickers. */
export async function listApplications(userId: string) {
  return db.select({
    id: resumes.id, title: resumes.title, job_title: resumes.job_title_snapshot, company: resumes.job_company_snapshot,
    cover_letter: resumes.cover_letter,
  }).from(resumes).where(and(eq(resumes.user_id, userId), eq(resumes.kind, "tailored"), eq(resumes.status, "draft")))
    .orderBy(desc(resumes.updated_at));
}

export async function getDefaultMaster(userId: string) {
  const [row] = await db.select().from(resumes)
    .where(and(eq(resumes.user_id, userId), eq(resumes.kind, "master"), eq(resumes.is_default, true)));
  return row;
}
