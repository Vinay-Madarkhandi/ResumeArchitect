"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { countOtherActiveAdmins, lockAdminMembership } from "@/lib/auth/admin-membership";
import { users } from "@/lib/db/schema";
import { rateLimit, rateLimitWait } from "@/lib/cache/rateLimit";
import { hashPassword, passwordError, verifyPassword } from "@/lib/auth/password";
import { normalizeEmail } from "@/lib/auth/config";
import { accountByEmail, confirmCredentials, disableTotp, invalidateLinks, lockAccount, register, roleFor, sendAccountLink } from "@/lib/auth/accounts";
import { clearSessionCookie, currentUser, requestDetails, sessionToken, writeSession } from "@/lib/auth/current-user";
import { clearSessionCache, createSession, removeSessions, revokeSession } from "@/lib/auth/sessions";
import { consumeToken, findToken } from "@/lib/auth/tokens";
import { hashToken } from "@/lib/auth/secrets";
import { authenticator, checkSecondFactor, protectTotp, replaceRecoveryCodes } from "@/lib/auth/totp";
import { logger } from "@/lib/logger";

const HOUR = 3_600_000;
const invalidCredentials = "That email and password don't match an account.";
const invalidLink = "This link has expired or has already been used.";
const fail = (error: string) => ({ error });
const validEmail = (email: string) => z.email().max(254).safeParse(email).success;
const credentialLimit = (userId: string) => rateLimit("credentials", userId, 5, HOUR / 4);
const tooManySignIns = "Too many sign-in attempts. Try again in a few minutes.";
// Failed guesses per address across all clients. The window slides, so the
// backoff ends an hour after guessing stops.
const signInBackoff = (email: string) => rateLimitWait("sign-in-failures", email, 20, HOUR);
const recordSignInFailure = (email: string) => rateLimit("sign-in-failures", email, 20, HOUR);

export async function signUp(rawEmail: string, password: string): Promise<{ error?: string }> {
  const email = normalizeEmail(rawEmail);
  const error = passwordError(password);
  if (error) return fail(error);
  if (!validEmail(email)) return fail("Enter a valid email address.");
  const { ip } = await requestDetails();
  if (await rateLimit("sign-up", ip ?? "unknown", 5, HOUR)) return fail("Too many sign-up attempts. Try again later.");

  const pending = await register(email, await hashPassword(password));
  if (pending) await sendAccountLink(pending.id, "verify_email");
  return {};
}

export async function signIn(rawEmail: string, password: string, code: string): Promise<{ error?: string; needsCode?: boolean }> {
  const email = normalizeEmail(rawEmail);
  const { ip, userAgent } = await requestDetails();
  if (!validEmail(email) || password.length > 1024) return fail(invalidCredentials);
  if (await rateLimit("sign-in", JSON.stringify([email, ip]), 5, HOUR / 4)) return fail(tooManySignIns);
  if (await signInBackoff(email)) return fail(tooManySignIns);
  const rejected = async () => {
    await recordSignInFailure(email);
    return fail(invalidCredentials);
  };
  const candidate = await accountByEmail(email);
  // A missing account also pays the password hashing cost.
  if (!candidate) {
    await hashPassword(password);
    return rejected();
  }
  if (!await verifyPassword(password, candidate.password_hash)) return rejected();
  if (candidate.banned_at) return fail("This account is suspended.");
  if (!candidate.email_verified_at) return fail("Verify your email before signing in. Sign up again to get a fresh link.");
  if (!candidate.password_set_at) return fail("Choose a new password with “Forgot password?” before signing in.");

  const result = await db.transaction(async (tx) => {
    const user = await lockAccount(tx, candidate.id);
    if (!user || user.email !== email || user.password_hash !== candidate.password_hash || !user.password_set_at) return;
    if (user.totp_enabled_at && (!code || !await confirmCredentials(tx, user, password, code))) return { needsCode: true } as const;
    await tx.update(users).set({ last_sign_in_at: sql`now()` }).where(eq(users.id, user.id));
    return createSession(tx, user.id, ip, userAgent);
  });
  if (!result) return fail(invalidCredentials);
  if ("needsCode" in result) {
    if (code) await recordSignInFailure(email);
    return { needsCode: true, error: code ? "That code couldn't be verified." : undefined };
  }
  const previous = await sessionToken();
  if (previous) await revokeSession(previous);
  await writeSession(result);
  return {};
}

export async function signOut() {
  const token = await sessionToken();
  if (token) await revokeSession(token);
  await clearSessionCookie();
}

export async function signOutEverywhere() {
  const user = await currentUser();
  if (user) {
    const ids = await db.transaction(async (tx) => {
      if (!await lockAccount(tx, user.id)) return [];
      return removeSessions(tx, user.id);
    });
    await clearSessionCache(ids);
  }
  await clearSessionCookie();
}

// The link proves control of the inbox, so a new account takes the password
// typed here rather than one an earlier, unproven sign-up chose.
export async function verifyEmail(token: string, change: boolean, password: string): Promise<{ error?: string }> {
  const purpose = change ? "change_email" : "verify_email";
  const error = change ? null : passwordError(password);
  if (error) return fail(error);
  const link = await findToken(token, purpose);
  if (!link) return fail(invalidLink);
  const { ip, userAgent } = await requestDetails();
  const hash = change ? undefined : await hashPassword(password);
  try {
    const result = await db.transaction(async (tx) => {
      if (change) await lockAdminMembership(tx);
      const user = await lockAccount(tx, link.userId);
      if (!user || (!change && user.email_verified_at)) return;
      const email = change ? link.nextEmail : user.email;
      if (!email) return;
      const role = roleFor(email, change ? "user" : user.role);
      if (user.role === "admin" && role === "user" && !await countOtherActiveAdmins(tx, user.id)) {
        return fail("Assign another active administrator before changing your email.");
      }
      if (!await consumeToken(tx, token, purpose, user.id)) return;
      await tx.update(users).set({
        email, email_verified_at: sql`now()`, password_hash: hash, password_set_at: change ? undefined : sql`now()`, role,
        last_sign_in_at: change ? user.last_sign_in_at : sql`now()`,
      }).where(eq(users.id, user.id));
      if (change) {
        await invalidateLinks(tx, user.id, ["reset_password"]);
        return { removed: await removeSessions(tx, user.id) };
      }
      await invalidateLinks(tx, user.id, ["verify_email", "reset_password"]);
      return { session: await createSession(tx, user.id, ip, userAgent) };
    });
    if (!result) return fail(invalidLink);
    if ("error" in result) return result;
    if (result.session) {
      const previous = await sessionToken();
      if (previous) await revokeSession(previous);
      await writeSession(result.session);
    }
    if (result.removed) await clearSessionCache(result.removed);
    return {};
  } catch (error) {
    if (error instanceof Error && "cause" in error && (error.cause as { code?: string })?.code === "23505") {
      return fail("That email address is already in use.");
    }
    throw error;
  }
}

export async function forgotPassword(rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  if (!validEmail(email) || await rateLimit("reset", email, 3, HOUR)) return {};
  const user = await accountByEmail(email);
  if (user && !user.banned_at) {
    try {
      await sendAccountLink(user.id, "reset_password");
    } catch {
      logger.error("Could not queue password reset");
    }
  }
  return {};
}

export async function resetPassword(token: string, password: string): Promise<{ error?: string }> {
  const error = passwordError(password);
  if (error) return fail(error);
  const link = await findToken(token, "reset_password");
  if (!link) return fail(invalidLink);
  const hash = await hashPassword(password);
  const removed = await db.transaction(async (tx) => {
    const user = await lockAccount(tx, link.userId);
    if (!user || !await consumeToken(tx, token, "reset_password", user.id)) return;
    await tx.update(users).set({
      password_hash: hash, password_set_at: sql`now()`, role: roleFor(user.email, user.role),
      email_verified_at: sql`coalesce(${users.email_verified_at}, now())`,
    }).where(eq(users.id, user.id));
    await invalidateLinks(tx, user.id, ["verify_email", "reset_password", "change_email"]);
    return removeSessions(tx, user.id);
  });
  if (!removed) return fail(invalidLink);
  await clearSessionCache(removed);
  const current = await sessionToken();
  if (current && removed.includes(hashToken(current))) await clearSessionCookie();
  redirect("/sign-in?reset=1");
}

export async function changePassword(current: string, next: string, code: string): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) return fail("Sign in again to change your password.");
  const error = passwordError(next);
  if (error) return fail(error);
  if (await credentialLimit(user.id)) return fail("Too many attempts. Try again later.");
  const { ip, userAgent } = await requestDetails();
  const result = await db.transaction(async (tx) => {
    const row = await lockAccount(tx, user.id);
    if (!row || !await confirmCredentials(tx, row, current, code)) return;
    await tx.update(users).set({ password_hash: await hashPassword(next), password_set_at: sql`now()` }).where(eq(users.id, user.id));
    await invalidateLinks(tx, user.id, ["reset_password", "change_email"]);
    const removed = await removeSessions(tx, user.id);
    return { removed, session: await createSession(tx, user.id, ip, userAgent) };
  });
  if (!result) return fail("Check your password and authentication code.");
  await clearSessionCache(result.removed);
  await writeSession(result.session);
  return {};
}

export async function changeEmail(rawEmail: string, password: string, code: string): Promise<{ error?: string }> {
  const user = await currentUser();
  const email = normalizeEmail(rawEmail);
  if (!user) return fail("Sign in again to change your email.");
  if (!validEmail(email) || email === user.email) return fail("Enter a different, valid email address.");
  if (await credentialLimit(user.id)) return fail("Too many attempts. Try again later.");
  // Whether the address is taken is only revealed to its inbox, when the link is used.
  const sent = await sendAccountLink(user.id, "change_email", {
    recipient: email,
    authorize: (tx, account) => account.email !== email
      ? confirmCredentials(tx, account, password, code)
      : Promise.resolve(false),
  });
  if (!sent) return fail("Check your password and authentication code.");
  return {};
}

export async function beginTwoFactor(password: string): Promise<{ error?: string; secret?: string }> {
  const user = await currentUser();
  if (!user) return fail("Sign in again to continue.");
  if (await credentialLimit(user.id)) return fail("Too many attempts. Try again later.");
  return db.transaction(async (tx) => {
    const row = await lockAccount(tx, user.id);
    if (!row || row.totp_enabled_at || !await verifyPassword(password, row.password_hash)) return fail("Check your password.");
    const totp = authenticator(row.email);
    await tx.update(users).set({ totp_secret_ciphertext: protectTotp(totp) }).where(eq(users.id, user.id));
    return { secret: totp.secret.base32 };
  });
}

export async function enableTwoFactor(code: string): Promise<{ error?: string; codes?: string[] }> {
  const user = await currentUser();
  if (!user) return fail("Sign in again to continue.");
  if (await credentialLimit(user.id)) return fail("Too many attempts. Try again later.");
  return db.transaction(async (tx) => {
    const row = await lockAccount(tx, user.id);
    if (!row || row.totp_enabled_at || !/^\d{6}$/.test(code) ||
      !await checkSecondFactor(tx, user.id, row.email, row.totp_secret_ciphertext, code)) return fail("Check your authenticator code.");
    await tx.update(users).set({ totp_enabled_at: sql`now()` }).where(eq(users.id, user.id));
    return { codes: await replaceRecoveryCodes(tx, user.id) };
  });
}

export async function disableTwoFactor(password: string, code: string): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) return fail("Sign in again to continue.");
  if (await credentialLimit(user.id)) return fail("Too many attempts. Try again later.");
  return db.transaction(async (tx) => {
    const row = await lockAccount(tx, user.id);
    if (!row || !await confirmCredentials(tx, row, password, code)) return fail("Check your password and authentication code.");
    await disableTotp(tx, user.id);
    return {};
  });
}
