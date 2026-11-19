import { db } from "@/lib/db";
import { aiCalls } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

export async function recordAiCall(userId: string, call: Omit<typeof aiCalls.$inferInsert, "user_id" | "id" | "at">) {
  try {
    await db.insert(aiCalls).values({ ...call, user_id: userId });
  } catch {
    logger.warn({ kind: call.kind }, "Could not record AI call");
  }
}
