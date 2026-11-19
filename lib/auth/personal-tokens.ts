import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { personalTokens, users } from "@/lib/db/schema";
import { hashToken, isToken, newToken } from "./secrets";

const prefix = "ra_pat_";

export async function createPersonalToken(userId: string, name: string) {
  const token = prefix + newToken();
  await db.insert(personalTokens).values({ user_id: userId, name, token_hash: hashToken(token) });
  return token;
}

export function listPersonalTokens(userId: string) {
  return db.select({
    id: personalTokens.id, name: personalTokens.name, createdAt: personalTokens.created_at,
    lastUsedAt: personalTokens.last_used_at,
  }).from(personalTokens).where(eq(personalTokens.user_id, userId)).orderBy(desc(personalTokens.created_at), desc(personalTokens.id));
}

export async function revokePersonalToken(userId: string, id: string) {
  if (!z.uuid().safeParse(id).success) return false;
  const [row] = await db.delete(personalTokens).where(and(eq(personalTokens.user_id, userId), eq(personalTokens.id, id)))
    .returning({ id: personalTokens.id });
  return Boolean(row);
}

export function readBearer(header: string | null) {
  const match = /^Bearer (\S+)$/i.exec(header ?? "");
  const token = match?.[1];
  return token?.startsWith(prefix) && isToken(token.slice(prefix.length)) ? token : null;
}

export async function authenticatePersonalToken(token: string) {
  if (!token.startsWith(prefix) || !isToken(token.slice(prefix.length))) return;
  const [user] = await db.update(personalTokens).set({ last_used_at: sql`clock_timestamp()` }).from(users)
    .where(and(
      eq(personalTokens.token_hash, hashToken(token)), eq(users.id, personalTokens.user_id),
      isNotNull(users.email_verified_at), isNotNull(users.password_set_at), isNull(users.banned_at),
    )).returning({ id: users.id, email: users.email });
  return user;
}
