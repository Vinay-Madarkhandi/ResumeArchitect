import { and, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { currentUser, requestDetails, sessionToken } from "@/lib/auth/current-user";
import { hashToken } from "@/lib/auth/secrets";
import { sessions, users } from "@/lib/db/schema";
import type { Transaction } from "@/lib/db";
import { isAdmin } from "./policy";

export async function requireAdmin() {
  const user = await currentUser();
  if (!isAdmin(user)) notFound();
  return user;
}

export async function adminActor() {
  const user = await requireAdmin();
  const token = await sessionToken();
  if (!token) notFound();
  const { ip } = await requestDetails();
  return { id: user.id, ip, sessionId: hashToken(token) };
}

export type AdminActor = Awaited<ReturnType<typeof adminActor>>;

export async function lockAdminSession(tx: Transaction, actor: AdminActor) {
  const [user] = await tx.select({ id: users.id }).from(users).where(and(
    eq(users.id, actor.id), eq(users.role, "admin"), isNull(users.banned_at), isNotNull(users.email_verified_at),
  )).for("update");
  if (!user) notFound();

  const [session] = await tx.select({ userId: sessions.user_id }).from(sessions).where(and(
    eq(sessions.id, actor.sessionId), eq(sessions.user_id, actor.id), gt(sessions.expires_at, sql`now()`),
  )).for("update");
  if (!session) notFound();
}
