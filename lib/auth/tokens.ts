import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db, type Transaction } from "@/lib/db";
import { authTokens } from "@/lib/db/schema";
import { hashToken, isToken, newToken } from "./secrets";

type Purpose = typeof authTokens.$inferInsert.purpose;

export const tokenLifetime = (purpose: Purpose) => (purpose === "reset_password" ? 1 : 24) * 3_600_000;

export async function issueToken(tx: Transaction, userId: string, purpose: Purpose, payload?: { email: string }) {
  const token = newToken();
  const id = hashToken(token);
  await tx.insert(authTokens).values({
    id, user_id: userId, purpose, payload,
    expires_at: new Date(Date.now() + tokenLifetime(purpose)).toISOString(),
  });
  return { token, id };
}

function usable(token: string, purpose: Purpose) {
  return and(eq(authTokens.id, hashToken(token)), eq(authTokens.purpose, purpose),
    gt(authTokens.expires_at, sql`now()`), isNull(authTokens.used_at));
}

export async function findToken(token: string, purpose: Purpose) {
  if (!isToken(token)) return undefined;
  const [row] = await db.select({ userId: authTokens.user_id }).from(authTokens).where(usable(token, purpose));
  return row;
}

export async function consumeToken(tx: Transaction, token: string, purpose: Purpose, userId: string) {
  if (!isToken(token)) return undefined;
  const [row] = await tx.update(authTokens).set({ used_at: sql`now()` })
    .where(and(usable(token, purpose), eq(authTokens.user_id, userId))).returning();
  return row;
}
