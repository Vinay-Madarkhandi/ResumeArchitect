import { and, desc, eq, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { jobDescriptions } from "@/lib/db/schema";
import type { JobFacts } from "@/lib/schemas/jobFacts";

const owned = (userId: string, id: string) => and(eq(jobDescriptions.user_id, userId), eq(jobDescriptions.id, id));

export async function getJobDescription(userId: string, id: string) {
  if (!z.uuid().safeParse(id).success) return undefined;
  const [row] = await db.select().from(jobDescriptions).where(owned(userId, id));
  return row;
}

export async function createJobDescription(userId: string, values: Omit<typeof jobDescriptions.$inferInsert, "user_id">) {
  const [row] = await db.insert(jobDescriptions).values({ ...values, user_id: userId }).returning({ id: jobDescriptions.id });
  return row.id;
}

/** The newest saved copy of exactly this posting, so pasting it again reuses its facts instead of reading it again. */
export async function findJobDescriptionByText(userId: string, rawText: string) {
  const [row] = await db.select().from(jobDescriptions)
    .where(and(eq(jobDescriptions.user_id, userId), eq(jobDescriptions.raw_text, rawText)))
    .orderBy(desc(jobDescriptions.created_at)).limit(1);
  return row;
}

/** Stores the facts read from the posting, and names an untitled job after the title they found. */
export async function saveJobFacts(userId: string, id: string, facts: JobFacts, rawText?: string) {
  await db.update(jobDescriptions).set({
    job_facts: facts,
    job_title: sql`coalesce(nullif(${jobDescriptions.job_title}, ''), ${facts.title})`,
  }).where(and(owned(userId, id), rawText === undefined ? undefined : eq(jobDescriptions.raw_text, rawText)));
}

export type ScanTarget = Awaited<ReturnType<typeof listScanTargets>>[number];

/** Jobs a resume can be measured against: tracked ones still in play, and any posting already read for a scan. */
export async function listScanTargets(userId: string) {
  return db.select({
    id: jobDescriptions.id,
    title: sql<string>`coalesce(nullif(${jobDescriptions.job_title}, ''), 'Untitled job')`,
    company: jobDescriptions.company,
    hasFacts: sql<boolean>`${jobDescriptions.job_facts} is not null`,
  }).from(jobDescriptions).where(and(
    eq(jobDescriptions.user_id, userId),
    ne(jobDescriptions.raw_text, ""),
    or(and(isNotNull(jobDescriptions.tracker_stage), isNull(jobDescriptions.archived_at)), isNotNull(jobDescriptions.job_facts)),
  )).orderBy(desc(sql`coalesce(${jobDescriptions.tracker_updated_at}, ${jobDescriptions.created_at})`), desc(jobDescriptions.id)).limit(100);
}
