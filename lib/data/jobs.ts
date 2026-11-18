import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { jobDescriptions as jobs, resumes, scans } from "@/lib/db/schema";
import { jobSchema, type JobClip, type JobInput, type JobRecord, type StageChange } from "@/lib/tracker/schema";
import type { ApplicationStatus } from "@/lib/tracker/stages";

const owned = (userId: string, id: string) => and(eq(jobs.user_id, userId), eq(jobs.id, id));
const tracked = (userId: string, id: string) => and(owned(userId, id), isNotNull(jobs.tracker_stage));

export type TrackerJob = JobRecord & { id: string; resumeId: string | null; reportId: string | null };

function toRecord(row: typeof jobs.$inferSelect): JobRecord {
  return {
    title: row.job_title ?? "Untitled job",
    company: row.company ?? "",
    location: row.location ?? "",
    salary: row.salary ?? "",
    url: row.source_url ?? "",
    description: row.raw_text,
    stage: row.tracker_stage ?? "saved",
    notes: row.notes,
    contacts: row.contacts,
    interviews: row.interview_dates,
    followUp: row.follow_up_date,
    excitement: row.excitement,
    archived: Boolean(row.archived_at),
    history: row.tracker_history.map((change) => ({ ...change, at: new Date(change.at).toISOString() })),
    updatedAt: new Date(row.tracker_updated_at ?? row.created_at).toISOString(),
  };
}

function details(input: Omit<JobInput, "stage">) {
  return {
    job_title: input.title,
    company: input.company || null,
    location: input.location || null,
    salary: input.salary || null,
    source_url: input.url || null,
    raw_text: input.description,
    notes: input.notes,
    contacts: input.contacts,
    interview_dates: input.interviews,
    follow_up_date: input.followUp,
    excitement: input.excitement,
  };
}

export async function listJobs(userId: string): Promise<TrackerJob[]> {
  const latestResume = db.select({ id: resumes.id }).from(resumes).where(and(
    eq(resumes.user_id, userId), eq(resumes.job_description_id, jobs.id), eq(resumes.kind, "tailored"),
  )).orderBy(desc(resumes.created_at), desc(resumes.id)).limit(1).as("latest_resume");
  const latestReport = db.select({ id: scans.id }).from(scans).where(and(
    eq(scans.user_id, userId), eq(scans.job_description_id, jobs.id),
  )).orderBy(desc(scans.created_at), desc(scans.id)).limit(1).as("latest_report");

  const rows = await db.select({ job: jobs, resumeId: latestResume.id, reportId: latestReport.id }).from(jobs)
    .leftJoinLateral(latestResume, sql`true`)
    .leftJoinLateral(latestReport, sql`true`)
    .where(and(eq(jobs.user_id, userId), isNotNull(jobs.tracker_stage)))
    .orderBy(desc(jobs.tracker_updated_at), desc(jobs.id));
  return rows.map(({ job, ...links }) => ({ ...toRecord(job), id: job.id, ...links }));
}

export async function getTrackedJob(userId: string, id: string) {
  if (!z.uuid().safeParse(id).success) return;
  const [row] = await db.select().from(jobs).where(tracked(userId, id));
  return row ? { ...toRecord(row), id: row.id } : undefined;
}

export async function getJobReport(userId: string, id: string) {
  if (!z.uuid().safeParse(id).success) return;
  const [row] = await db.select({
    report: scans.report, matchRate: scans.match_rate, resumeId: scans.resume_id,
    title: jobs.job_title, jobId: jobs.id, createdAt: scans.created_at,
  }).from(scans).innerJoin(jobs, and(eq(jobs.id, scans.job_description_id), eq(jobs.user_id, userId)))
    .where(and(eq(scans.id, id), eq(scans.user_id, userId)));
  return row;
}

export async function addJobs(userId: string, input: Array<JobInput & { history?: StageChange[]; archived?: boolean }>) {
  if (input.length === 0) return [];
  const now = new Date().toISOString();
  return db.insert(jobs).values(input.map((job) => ({
    ...details(job), user_id: userId, tracker_stage: job.stage, tracker_updated_at: now,
    tracker_history: job.history ?? [{ stage: job.stage, at: now }],
    archived_at: job.archived ? now : null,
  }))).returning({ id: jobs.id });
}

export async function clipJob(userId: string, input: JobClip) {
  const [job] = await addJobs(userId, [jobSchema.parse(input)]);
  return job;
}

export async function editJob(userId: string, id: string, input: Omit<JobInput, "stage">) {
  const [row] = await db.update(jobs).set({ ...details(input), tracker_updated_at: sql`now()` })
    .where(tracked(userId, id)).returning({ id: jobs.id });
  return row;
}

export async function archiveJob(userId: string, id: string, archived: boolean) {
  const [row] = await db.update(jobs).set({ archived_at: archived ? sql`now()` : null, tracker_updated_at: sql`now()` })
    .where(tracked(userId, id)).returning({ id: jobs.id });
  return row;
}

export async function moveJob(userId: string, id: string, stage: ApplicationStatus, tx: Pick<typeof db, "update"> = db) {
  const [row] = await tx.update(jobs).set({
    tracker_stage: stage,
    tracker_history: sql`case when ${jobs.tracker_stage} = ${stage}::application_stage then ${jobs.tracker_history}
      else ${jobs.tracker_history} || jsonb_build_array(jsonb_build_object('stage', ${stage}::text, 'at', clock_timestamp())) end`,
    tracker_updated_at: sql`now()`,
  }).where(tracked(userId, id)).returning({ id: jobs.id });
  return row;
}

export async function registerTailoredJob(userId: string, id: string, resumeId: string, tx: Pick<typeof db, "update">) {
  await tx.update(jobs).set({
    tracker_stage: "saved",
    tracker_updated_at: sql`now()`,
    tracker_history: sql`jsonb_build_array(jsonb_build_object('stage', 'saved', 'at', now()))`,
    job_title: sql`coalesce(nullif(${jobs.job_title}, ''), (select coalesce(${resumes.job_title_snapshot}, ${resumes.title})
      from ${resumes} where ${resumes.id} = ${resumeId} and ${resumes.user_id} = ${userId}))`,
    company: sql`coalesce(${jobs.company}, (select ${resumes.job_company_snapshot}
      from ${resumes} where ${resumes.id} = ${resumeId} and ${resumes.user_id} = ${userId}))`,
  }).where(and(owned(userId, id), isNull(jobs.tracker_stage)));
}
