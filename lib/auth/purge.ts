import { and, exists, gt, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { authTokens, sessions, users } from "@/lib/db/schema";
import { clearSessionCache } from "./sessions";

const GRACE = sql`interval '7 days'`;

// Expired links are kept for the grace period because they date the last
// sign-up attempt: an address nobody proved within it is released.
export async function purgeExpiredAuth() {
  const recentLink = db.select({ id: authTokens.id }).from(authTokens)
    .where(and(sql`${authTokens.user_id} = ${users.id}`, gt(authTokens.expires_at, sql`now() - ${GRACE}`)));
  await db.delete(users).where(and(
    isNull(users.email_verified_at), lt(users.created_at, sql`now() - ${GRACE}`), sql`not ${exists(recentLink)}`,
  ));
  await db.delete(authTokens).where(lt(authTokens.expires_at, sql`now() - ${GRACE}`));
  const expired = await db.delete(sessions).where(lt(sessions.expires_at, sql`now()`)).returning({ id: sessions.id });
  await clearSessionCache(expired.map(({ id }) => id));
}
