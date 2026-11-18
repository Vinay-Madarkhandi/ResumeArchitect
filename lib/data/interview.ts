import { and, asc, count, desc, eq, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { interviewAnswers, interviewSessions } from "@/lib/db/schema";

type SessionInsert = Omit<typeof interviewSessions.$inferInsert, "user_id" | "id" | "created_at">;
type AnswerInsert = Omit<typeof interviewAnswers.$inferInsert, "user_id" | "id" | "created_at" | "session_id">;
const uuid = z.uuid();

export async function createInterviewSession(userId: string, values: SessionInsert) {
  const [row] = await db.insert(interviewSessions).values({ ...values, user_id: userId }).returning({ id: interviewSessions.id });
  return row.id;
}

export async function getInterviewSession(userId: string, id: string) {
  if (!uuid.safeParse(id).success) return undefined;
  const [row] = await db.select().from(interviewSessions)
    .where(and(eq(interviewSessions.user_id, userId), eq(interviewSessions.id, id)));
  return row;
}

export async function listInterviewSessions(userId: string, limit = 20) {
  return db.select({
    id: interviewSessions.id, target_label: interviewSessions.target_label, created_at: interviewSessions.created_at,
    answers: count(interviewAnswers.id), best: max(interviewAnswers.score),
  }).from(interviewSessions)
    .leftJoin(interviewAnswers, eq(interviewAnswers.session_id, interviewSessions.id))
    .where(eq(interviewSessions.user_id, userId))
    .groupBy(interviewSessions.id)
    .orderBy(desc(interviewSessions.created_at)).limit(limit);
}

/** Stores a practice answer, only on a session this user owns. */
export async function addInterviewAnswer(userId: string, sessionId: string, values: AnswerInsert) {
  if (!(await getInterviewSession(userId, sessionId))) return undefined;
  const [row] = await db.insert(interviewAnswers).values({ ...values, user_id: userId, session_id: sessionId })
    .returning({ id: interviewAnswers.id, created_at: interviewAnswers.created_at });
  return row;
}

export async function listInterviewAnswers(userId: string, sessionId: string) {
  if (!uuid.safeParse(sessionId).success) return [];
  return db.select().from(interviewAnswers)
    .where(and(eq(interviewAnswers.user_id, userId), eq(interviewAnswers.session_id, sessionId)))
    .orderBy(asc(interviewAnswers.created_at));
}
