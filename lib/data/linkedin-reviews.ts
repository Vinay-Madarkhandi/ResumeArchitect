import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { linkedinReviews } from "@/lib/db/schema";
import type { LinkedInSuggestions } from "@/lib/schemas/career";

type Insert = Omit<typeof linkedinReviews.$inferInsert, "user_id" | "id" | "created_at">;
const owned = (userId: string, id: string) => and(eq(linkedinReviews.user_id, userId), eq(linkedinReviews.id, id));

export async function createLinkedInReview(userId: string, values: Insert) {
  const [row] = await db.insert(linkedinReviews).values({ ...values, user_id: userId }).returning({ id: linkedinReviews.id });
  return row.id;
}

export async function getLinkedInReview(userId: string, id: string) {
  if (!z.uuid().safeParse(id).success) return undefined;
  const [row] = await db.select().from(linkedinReviews).where(owned(userId, id));
  return row;
}

export async function listLinkedInReviews(userId: string, limit = 20) {
  return db.select({
    id: linkedinReviews.id, target_label: linkedinReviews.target_label, score: linkedinReviews.score, created_at: linkedinReviews.created_at,
  }).from(linkedinReviews).where(eq(linkedinReviews.user_id, userId)).orderBy(desc(linkedinReviews.created_at)).limit(limit);
}

export async function saveLinkedInSuggestions(userId: string, id: string, suggestions: LinkedInSuggestions) {
  const [row] = await db.update(linkedinReviews).set({ suggestions }).where(owned(userId, id)).returning({ id: linkedinReviews.id });
  return Boolean(row);
}
