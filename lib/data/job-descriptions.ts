import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { jobDescriptions } from "@/lib/db/schema";

export async function getJobDescription(userId: string, id: string) {
  if (!z.uuid().safeParse(id).success) return undefined;
  const [row] = await db.select().from(jobDescriptions).where(and(eq(jobDescriptions.user_id, userId), eq(jobDescriptions.id, id)));
  return row;
}

export async function createJobDescription(userId: string, values: Omit<typeof jobDescriptions.$inferInsert, "user_id">) {
  const [row] = await db.insert(jobDescriptions).values({ ...values, user_id: userId }).returning({ id: jobDescriptions.id });
  return row.id;
}
