import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { coverLetterScans } from "@/lib/db/schema";

type Insert = Omit<typeof coverLetterScans.$inferInsert, "user_id" | "id" | "created_at">;

export async function createCoverLetterScan(userId: string, values: Insert) {
  const [row] = await db.insert(coverLetterScans).values({ ...values, user_id: userId }).returning({ id: coverLetterScans.id });
  return row.id;
}

export async function getCoverLetterScan(userId: string, id: string) {
  if (!z.uuid().safeParse(id).success) return undefined;
  const [row] = await db.select().from(coverLetterScans).where(and(eq(coverLetterScans.user_id, userId), eq(coverLetterScans.id, id)));
  return row;
}

export async function listCoverLetterScans(userId: string, limit = 20) {
  return db.select({
    id: coverLetterScans.id, target_label: coverLetterScans.target_label, score: coverLetterScans.score, created_at: coverLetterScans.created_at,
  }).from(coverLetterScans).where(eq(coverLetterScans.user_id, userId)).orderBy(desc(coverLetterScans.created_at)).limit(limit);
}
