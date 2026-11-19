import { randomBytes } from "node:crypto";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { Secret, TOTP } from "otpauth";
import { encryptApiKey, decryptApiKey } from "@/lib/crypto/keyCipher";
import { recoveryCodes, users } from "@/lib/db/schema";
import type { Transaction } from "@/lib/db";
import { hashToken } from "./secrets";

export function authenticator(email: string, encoded?: string) {
  return new TOTP({
    issuer: "ResumeArchitect", label: email, algorithm: "SHA1", digits: 6, period: 30,
    secret: encoded ? Secret.fromBase32(encoded) : new Secret({ size: 20 }),
  });
}

export function protectTotp(totp: TOTP) {
  return encryptApiKey(totp.secret.base32);
}

export async function checkSecondFactor(tx: Transaction, userId: string, email: string, secret: Buffer | null, code: string) {
  if (!secret) return false;
  const cleaned = code.trim();
  if (/^\d{6}$/.test(cleaned)) {
    const timestamp = Date.now();
    const delta = authenticator(email, decryptApiKey(secret)).validate({ token: cleaned, window: 1, timestamp });
    if (delta === null) return false;
    // Each time step is accepted once, so an observed code cannot be replayed.
    const step = Math.floor(timestamp / 30_000) + delta;
    const [accepted] = await tx.update(users).set({ totp_last_step: step })
      .where(and(eq(users.id, userId), or(isNull(users.totp_last_step), lt(users.totp_last_step, step))))
      .returning({ id: users.id });
    return Boolean(accepted);
  }
  const [used] = await tx.update(recoveryCodes).set({ used_at: sql`now()` })
    .where(and(eq(recoveryCodes.user_id, userId), eq(recoveryCodes.code_hash, hashToken(cleaned.toLowerCase())), isNull(recoveryCodes.used_at)))
    .returning({ hash: recoveryCodes.code_hash });
  return Boolean(used);
}

export async function replaceRecoveryCodes(tx: Transaction, userId: string) {
  const codes = Array.from({ length: 10 }, () => randomBytes(10).toString("hex"));
  await tx.delete(recoveryCodes).where(eq(recoveryCodes.user_id, userId));
  await tx.insert(recoveryCodes).values(codes.map((code) => ({ user_id: userId, code_hash: hashToken(code) })));
  return codes;
}
