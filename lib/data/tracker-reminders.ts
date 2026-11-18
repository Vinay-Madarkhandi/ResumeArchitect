import { and, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobDescriptions as jobs, profiles, users } from "@/lib/db/schema";

const eligible = (day: string) => and(
  isNotNull(jobs.tracker_stage), isNull(jobs.archived_at),
  eq(profiles.tracker_reminders, true), isNull(users.banned_at), isNotNull(users.email_verified_at),
  or(eq(jobs.follow_up_date, day), sql`${jobs.interview_dates} @> array[${day}]::date[]`),
);

export async function setTrackerReminders(userId: string, enabled: boolean) {
  await db.update(profiles).set({ tracker_reminders: enabled }).where(eq(profiles.id, userId));
}

export async function listReminderRecipients(day: string) {
  return db.selectDistinct({ id: jobs.user_id }).from(jobs)
    .innerJoin(profiles, eq(profiles.id, jobs.user_id))
    .innerJoin(users, eq(users.id, jobs.user_id))
    .where(eligible(day));
}

export async function getTrackerDigest(userId: string, day: string) {
  const rows = await db.select({
    id: jobs.id, title: jobs.job_title, company: jobs.company, to: users.email,
    followUp: jobs.follow_up_date, interviews: jobs.interview_dates,
  }).from(jobs).innerJoin(profiles, eq(profiles.id, jobs.user_id)).innerJoin(users, eq(users.id, jobs.user_id))
    .where(and(eq(jobs.user_id, userId), eligible(day))).orderBy(jobs.job_title, jobs.id);
  if (rows.length === 0) return;
  return {
    to: rows[0].to,
    items: rows.map(({ id, title, company, followUp, interviews }) => ({
      id, title: title ?? "Untitled job", company,
      due: [followUp === day && "Follow-up", interviews.includes(day) && "Interview"].filter(Boolean).join(" and "),
    })),
  };
}
