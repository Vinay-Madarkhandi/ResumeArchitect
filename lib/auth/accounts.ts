import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { db, type Transaction } from "@/lib/db";
import { authTokens, profiles, recoveryCodes, users } from "@/lib/db/schema";
import { appUrl, adminEmails } from "./config";
import { issueToken, tokenLifetime } from "./tokens";
import { emailQueue } from "@/lib/queue";
import { verifyPassword } from "./password";
import { checkSecondFactor } from "./totp";

export type Account = typeof users.$inferSelect;

export async function lockAccount(tx: Transaction, userId: string) {
  const [user] = await tx.select().from(users).where(and(eq(users.id, userId), isNull(users.banned_at))).for("update");
  return user;
}

export async function accountByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user;
}

export async function register(email: string, passwordHash: string) {
  return db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({
      email, password_hash: passwordHash, role: adminEmails().includes(email) ? "admin" : "user",
    }).onConflictDoNothing({ target: users.email }).returning();
    if (user) await tx.insert(profiles).values({ id: user.id });
    return user;
  });
}

const emailDetails = {
  verify_email: { template: "verify", path: "/verify-email" },
  reset_password: { template: "reset", path: "/reset-password" },
  change_email: { template: "changeEmail", path: "/verify-email" },
} as const;

export async function sendAccountLink(
  userId: string,
  purpose: keyof typeof emailDetails,
  options?: { recipient: string; authorize: (tx: Transaction, account: Account) => Promise<boolean> },
) {
  const result = await db.transaction(async (tx) => {
    const user = await lockAccount(tx, userId);
    if (!user || (purpose === "verify_email" ? user.email_verified_at : !user.email_verified_at)) return;
    if (options && !await options.authorize(tx, user)) return;
    const recipient = options?.recipient;
    const scope = and(eq(authTokens.user_id, userId), eq(authTokens.purpose, purpose), isNull(authTokens.used_at));
    const [recent] = await tx.select({ id: authTokens.id }).from(authTokens).where(and(
      scope, gt(authTokens.expires_at, new Date(Date.now() + tokenLifetime(purpose) - 20_000).toISOString()),
      recipient ? sql`${authTokens.payload}->>'email' = ${recipient}` : undefined,
    )).limit(1);
    if (recent) return { queued: true } as const;
    await tx.delete(authTokens).where(scope);
    return { ...await issueToken(tx, userId, purpose, recipient ? { email: recipient } : undefined), to: recipient ?? user.email };
  });
  if (!result) return false;
  if ("queued" in result) return true;

  const { template, path } = emailDetails[purpose];
  const link = new URL(path, appUrl());
  link.searchParams.set("token", result.token);
  if (purpose === "change_email") link.searchParams.set("change", "1");
  try {
    // BullMQ reserves colons as separators in custom job IDs.
    await emailQueue().add(template, { template, to: result.to, data: { link: link.href } }, {
      jobId: `${template}-${userId}-${result.id}`,
    });
  } catch (error) {
    await db.delete(authTokens).where(and(eq(authTokens.user_id, userId), eq(authTokens.id, result.id)));
    throw error;
  }
  return true;
}

export async function confirmCredentials(tx: Transaction, user: Account, password: string, code: string) {
  if (!await verifyPassword(password, user.password_hash)) return false;
  return !user.totp_enabled_at || checkSecondFactor(tx, user.id, user.email, user.totp_secret_ciphertext, code);
}

export async function seedAdmins() {
  const emails = adminEmails();
  if (emails.length) await db.update(users).set({ role: "admin" }).where(inArray(users.email, emails));
}

export async function disableTotp(tx: Transaction, userId: string) {
  await tx.update(users).set({ totp_enabled_at: null, totp_secret_ciphertext: null }).where(eq(users.id, userId));
  await tx.delete(recoveryCodes).where(eq(recoveryCodes.user_id, userId));
}

export async function invalidateLinks(tx: Transaction, userId: string, purposes: (keyof typeof emailDetails)[]) {
  await tx.update(authTokens).set({ used_at: sql`now()` })
    .where(and(eq(authTokens.user_id, userId), inArray(authTokens.purpose, purposes), isNull(authTokens.used_at)));
}
