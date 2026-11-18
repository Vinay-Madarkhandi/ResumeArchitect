import { and, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { cache } from "@/lib/cache";
import { db, type Transaction } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { hashToken, isToken, newToken } from "./secrets";

const DAY = 86_400_000;
const cacheKey = (id: string) => `session:${id}`;
// Session ids are never reused, so a revocation marker acts as that session's
// epoch: a lookup that read Postgres before the revocation cannot cache it after.
const revokedKey = (id: string) => `session-revoked:${id}`;
const REVOKED_TTL = 900;
const cacheUnlessRevoked = `
if redis.call('EXISTS', KEYS[2]) == 0 then redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2]) end
`;

export async function createSession(tx: Transaction, userId: string, ip: string | null, userAgent: string | null) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + 30 * DAY).toISOString();
  await tx.insert(sessions).values({ id: hashToken(token), user_id: userId, expires_at: expiresAt, ip, user_agent: userAgent });
  return { token, expiresAt };
}

export async function validateSession(token: string, renew = false) {
  if (!isToken(token)) return null;
  const id = hashToken(token);
  const owner = await cache().get(cacheKey(id)).catch(() => null);

  // Verify liveness and account state in Postgres even on a cache hit. A
  // concurrent revocation, ban, or failed Redis invalidation cannot revive a session.
  const [row] = await db.select({
    id: users.id, email: users.email, role: users.role, twoFactor: users.totp_enabled_at, expiresAt: sessions.expires_at,
  }).from(sessions).innerJoin(users, eq(users.id, sessions.user_id)).where(and(
    eq(sessions.id, id), owner ? eq(users.id, owner) : undefined,
    gt(sessions.expires_at, sql`now()`), isNull(users.banned_at), isNotNull(users.email_verified_at),
  ));
  if (!row) return null;
  if (!owner) await cache().eval(cacheUnlessRevoked, 2, cacheKey(id), revokedKey(id), row.id, 300).catch(() => {});

  if (renew && Date.parse(row.expiresAt) - Date.now() < 15 * DAY) {
    const expiresAt = new Date(Date.now() + 30 * DAY).toISOString();
    const [updated] = await db.update(sessions).set({ expires_at: expiresAt })
      .where(and(eq(sessions.id, id), eq(sessions.user_id, row.id), gt(sessions.expires_at, sql`now()`))).returning({ id: sessions.id });
    if (!updated) return null;
    row.expiresAt = expiresAt;
  }
  return row;
}

export async function removeSessions(tx: Transaction, userId: string) {
  const removed = await tx.delete(sessions).where(eq(sessions.user_id, userId)).returning({ id: sessions.id });
  return removed.map(({ id }) => id);
}

// Postgres deletes a banned user's session rows from a trigger, so collect the
// ids first; the caller clears their cache keys once the transaction commits.
export async function banUser(tx: Transaction, userId: string, reason: string) {
  const ids = await removeSessions(tx, userId);
  await tx.update(users).set({ banned_at: sql`now()`, ban_reason: reason }).where(eq(users.id, userId));
  return ids;
}

export async function clearSessionCache(ids: string[]) {
  if (!ids.length) return;
  const revoke = cache().multi();
  for (const id of ids) revoke.set(revokedKey(id), "1", "EX", REVOKED_TTL).del(cacheKey(id));
  await revoke.exec().catch(() => {});
}

export async function revokeSession(token: string) {
  if (!isToken(token)) return;
  const id = hashToken(token);
  await db.delete(sessions).where(eq(sessions.id, id));
  await clearSessionCache([id]);
}
