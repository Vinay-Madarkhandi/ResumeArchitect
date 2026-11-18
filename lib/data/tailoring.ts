import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { tailoringSessions } from "@/lib/db/schema";

import { registerTailoredJob } from "./jobs";

type Insert = Omit<typeof tailoringSessions.$inferInsert, "user_id">;
const owned = (userId: string, id: string) => and(eq(tailoringSessions.user_id, userId), eq(tailoringSessions.id, id));

export async function getTailoringSession(userId: string, id: string) {
  if (!z.uuid().safeParse(id).success) return undefined;
  const [row] = await db.select().from(tailoringSessions).where(owned(userId, id));
  return row;
}

export async function getTailoringScores(userId: string, ids: string[]) {
  if (!ids.length) return [];
  return db.select({
    id: tailoringSessions.id, score_before: tailoringSessions.score_before,
    score_after: tailoringSessions.score_after, changes: tailoringSessions.changes,
  }).from(tailoringSessions).where(and(eq(tailoringSessions.user_id, userId), inArray(tailoringSessions.id, ids)));
}

export async function latestFailedTailoring(userId: string, since: string) {
  const [row] = await db.select({ id: tailoringSessions.id, error_message: tailoringSessions.error_message })
    .from(tailoringSessions).where(and(
      eq(tailoringSessions.user_id, userId), eq(tailoringSessions.status, "failed"), gte(tailoringSessions.created_at, since),
    )).orderBy(desc(tailoringSessions.created_at)).limit(1);
  return row;
}

export async function createTailoringSession(userId: string, values: Insert) {
  const [row] = await db.insert(tailoringSessions).values({ ...values, user_id: userId }).returning({ id: tailoringSessions.id });
  return row.id;
}

export async function updateTailoringSession(userId: string, id: string, patch: Partial<Omit<Insert, "id">>) {
  await db.transaction(async (tx) => {
    const [row] = await tx.update(tailoringSessions).set(patch).where(owned(userId, id))
      .returning({ jobId: tailoringSessions.job_description_id, resumeId: tailoringSessions.result_resume_id });
    if (!row) throw new Error("Couldn't update the tailoring session.");
    if (patch.status === "completed" && row.jobId && row.resumeId) await registerTailoredJob(userId, row.jobId, row.resumeId, tx);
  });
}
