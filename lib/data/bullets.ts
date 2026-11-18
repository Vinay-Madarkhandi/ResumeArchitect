import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { careerBullets, resumes } from "@/lib/db/schema";
import { resolveDocument } from "@/lib/documentConversion";
import { bulletKey, harvestBullets, type BankBullet } from "@/lib/resume/bulletBank";

export type SavedBullet = BankBullet & { id: string };

const uuid = z.uuid();
const MAX_LENGTH = 1_000;

export async function listBullets(userId: string): Promise<SavedBullet[]> {
  return db.select({
    id: careerBullets.id, key: careerBullets.key, markdown: careerBullets.markdown,
    section: careerBullets.section, role: careerBullets.role,
  }).from(careerBullets).where(eq(careerBullets.user_id, userId)).orderBy(asc(careerBullets.created_at), asc(careerBullets.id));
}

/** Adds bullets the bank doesn't have yet; existing ones keep their first-seen role and section. */
export async function rememberBullets(userId: string, bullets: BankBullet[], sourceResumeId?: string) {
  const rows = bullets
    .filter((b) => b.markdown.trim() && b.markdown.length <= MAX_LENGTH)
    .map((b) => ({
      user_id: userId,
      key: bulletKey(b.key),
      markdown: b.markdown.trim(),
      section: b.section?.slice(0, 200) ?? null,
      role: b.role?.slice(0, 200) ?? null,
      source_resume_id: sourceResumeId && uuid.safeParse(sourceResumeId).success ? sourceResumeId : null,
    }));
  if (!rows.length) return;
  await db.insert(careerBullets).values(rows).onConflictDoNothing({ target: [careerBullets.user_id, careerBullets.key] });
}

/** Collects the bullets of every resume the user has into the bank, then lists it. */
export async function syncBulletBank(userId: string): Promise<SavedBullet[]> {
  const rows = await db.select({ id: resumes.id, content: resumes.content }).from(resumes)
    .where(eq(resumes.user_id, userId)).orderBy(asc(resumes.created_at));
  for (const row of rows) {
    const doc = resolveDocument(row.content);
    if (doc) await rememberBullets(userId, harvestBullets(doc), row.id);
  }
  return listBullets(userId);
}

export async function forgetBullet(userId: string, bulletId: string) {
  if (!uuid.safeParse(bulletId).success) return false;
  const deleted = await db.delete(careerBullets)
    .where(and(eq(careerBullets.user_id, userId), eq(careerBullets.id, bulletId))).returning({ id: careerBullets.id });
  return deleted.length > 0;
}
