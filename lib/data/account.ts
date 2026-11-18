import { eq, isNotNull } from "drizzle-orm";
import { db, type Transaction } from "@/lib/db";
import { clearSessionCache, removeSessions } from "@/lib/auth/sessions";
import { deleteUserObjects } from "@/lib/storage";
import { logger } from "@/lib/logger";
import { maintenanceQueue } from "@/lib/queue";
import {
  aiCalls, authTokens, careerBullets, coverLetterScans, interviewAnswers, interviewSessions, jobDescriptions, linkedinReviews, personalTokens,
  profiles, recoveryCodes, resumes, resumeShares, scans, sessions, tailoringSessions, users,
} from "@/lib/db/schema";

/**
 * Every table that holds an account's rows, by the export key it appears under.
 * account.test.ts derives the owned tables from the schema and fails when one
 * is missing here, so a new feature cannot leave its data out of the export.
 */
export const exportedTables = {
  account: users, profile: profiles, resumes, resumeShares, personalTokens, jobDescriptions, tailoringSessions, scans,
  linkedinReviews, coverLetterScans, interviewSessions, interviewAnswers, aiCalls, careerBullets,
};
/** Owned tables left out of the export because they only hold credentials. */
export const credentialTables = [sessions, authTokens, recoveryCodes];

// The share password's hash stays out; the export only says whether one is set.
const shareColumns = {
  resume_id: resumeShares.resume_id, slug: resumeShares.slug, content: resumeShares.content, template: resumeShares.template,
  views: resumeShares.views, created_at: resumeShares.created_at,
};

export async function clearAccountData(userId: string) {
  await db.transaction(async (tx) => {
    await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, userId)).for("update");
    await tx.delete(scans).where(eq(scans.user_id, userId));
    await tx.delete(linkedinReviews).where(eq(linkedinReviews.user_id, userId));
    await tx.delete(coverLetterScans).where(eq(coverLetterScans.user_id, userId));
    await tx.delete(interviewSessions).where(eq(interviewSessions.user_id, userId));
    await tx.delete(resumes).where(eq(resumes.user_id, userId));
    await tx.delete(tailoringSessions).where(eq(tailoringSessions.user_id, userId));
    await tx.delete(jobDescriptions).where(eq(jobDescriptions.user_id, userId));
    await tx.delete(personalTokens).where(eq(personalTokens.user_id, userId));
    await tx.delete(aiCalls).where(eq(aiCalls.user_id, userId));
    await tx.delete(careerBullets).where(eq(careerBullets.user_id, userId));
    await tx.update(profiles).set({
      full_name: null, headline: null, avatar_url: null, phone: null, location: null, links: [],
      default_resume_id: null, onboarding_completed_at: null,
      gemini_key_ciphertext: null, gemini_key_last4: null, gemini_key_status: "not_configured",
      gemini_key_updated_at: null, gemini_key_validated_at: null, tracker_reminders: false, preferences: {},
    }).where(eq(profiles.id, userId));
  });
}

export async function exportAccountData(userId: string) {
  return db.transaction(async (tx) => {
    const [account] = await tx.select({
      id: users.id, email: users.email, role: users.role, email_verified_at: users.email_verified_at,
      created_at: users.created_at, last_sign_in_at: users.last_sign_in_at, totp_enabled_at: users.totp_enabled_at,
    }).from(users).where(eq(users.id, userId));
    const [profile] = await tx.select({
      id: profiles.id, full_name: profiles.full_name, headline: profiles.headline, avatar_url: profiles.avatar_url,
      phone: profiles.phone, location: profiles.location, links: profiles.links, default_resume_id: profiles.default_resume_id,
      onboarding_completed_at: profiles.onboarding_completed_at, gemini_key_status: profiles.gemini_key_status,
      tracker_reminders: profiles.tracker_reminders, preferences: profiles.preferences, created_at: profiles.created_at, updated_at: profiles.updated_at,
    }).from(profiles).where(eq(profiles.id, userId));
    return {
      account, profile,
      resumes: await tx.select().from(resumes).where(eq(resumes.user_id, userId)),
      resumeShares: await tx.select({ ...shareColumns, password_protected: isNotNull(resumeShares.password_hash) })
        .from(resumeShares).innerJoin(resumes, eq(resumes.id, resumeShares.resume_id)).where(eq(resumes.user_id, userId)),
      personalTokens: await tx.select({
        id: personalTokens.id, name: personalTokens.name, createdAt: personalTokens.created_at, lastUsedAt: personalTokens.last_used_at,
      }).from(personalTokens).where(eq(personalTokens.user_id, userId)),
      jobDescriptions: await tx.select().from(jobDescriptions).where(eq(jobDescriptions.user_id, userId)),
      tailoringSessions: await tx.select().from(tailoringSessions).where(eq(tailoringSessions.user_id, userId)),
      scans: await tx.select().from(scans).where(eq(scans.user_id, userId)),
      linkedinReviews: await tx.select().from(linkedinReviews).where(eq(linkedinReviews.user_id, userId)),
      coverLetterScans: await tx.select().from(coverLetterScans).where(eq(coverLetterScans.user_id, userId)),
      interviewSessions: await tx.select().from(interviewSessions).where(eq(interviewSessions.user_id, userId)),
      interviewAnswers: await tx.select().from(interviewAnswers).where(eq(interviewAnswers.user_id, userId)),
      aiCalls: await tx.select().from(aiCalls).where(eq(aiCalls.user_id, userId)),
      careerBullets: await tx.select().from(careerBullets).where(eq(careerBullets.user_id, userId)),
    };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}

export async function deleteAccountRows(tx: Transaction, userId: string) {
  const ids = await removeSessions(tx, userId);
  await tx.delete(users).where(eq(users.id, userId));
  return ids;
}

export async function finishAccountDeletion(userId: string, sessionIds: string[]) {
  await clearSessionCache(sessionIds);
  try {
    await deleteUserObjects(userId);
  } catch {
    logger.warn({ userId }, "Retrying removal of account objects");
    await maintenanceQueue().add("delete-user-objects", { userId }, {
      jobId: `delete-user-objects-${userId}`, attempts: 5, backoff: { type: "exponential", delay: 15_000 },
    }).catch(() => logger.error({ userId }, "Could not schedule account object removal"));
    // The daily orphan cleanup also removes any keys left by stalled uploads.
  }
}
