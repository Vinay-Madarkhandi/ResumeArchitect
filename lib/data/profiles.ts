import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export async function getProfileStatus(userId: string) {
  const [profile] = await db.select({
    gemini_key_status: profiles.gemini_key_status,
    gemini_key_last4: profiles.gemini_key_last4,
    onboarding_completed_at: profiles.onboarding_completed_at,
  }).from(profiles).where(eq(profiles.id, userId));
  return profile;
}

export async function getKeyMaterial(userId: string) {
  const [profile] = await db.select({
    gemini_key_ciphertext: profiles.gemini_key_ciphertext,
    gemini_key_status: profiles.gemini_key_status,
  }).from(profiles).where(eq(profiles.id, userId));
  return profile;
}

type KeyPatch = Pick<typeof profiles.$inferInsert,
  "gemini_key_ciphertext" | "gemini_key_status" | "gemini_key_last4" | "gemini_key_updated_at" | "gemini_key_validated_at">;

export async function updateKey(userId: string, patch: KeyPatch, expectedCiphertext?: Buffer) {
  const [row] = await db.update(profiles).set(patch).where(and(eq(profiles.id, userId),
    expectedCiphertext ? eq(profiles.gemini_key_ciphertext, expectedCiphertext) : undefined)).returning({ id: profiles.id });
  return Boolean(row);
}
