import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { resumes, resumeShares } from "@/lib/db/schema";
import { isShareSlug, newShareSlug } from "@/lib/sharing/access";

const uuid = z.uuid();
const details = { slug: resumeShares.slug, views: resumeShares.views, passwordProtected: sql<boolean>`${resumeShares.password_hash} is not null` };
type Snapshot = Pick<typeof resumeShares.$inferInsert, "content" | "template" | "password_hash">;
const ownsResume = (userId: string, resumeId: string) => and(eq(resumes.user_id, userId), eq(resumes.id, resumeId));

export async function getOwnedShare(userId: string, resumeId: string) {
  if (!uuid.safeParse(resumeId).success) return undefined;
  const [share] = await db.select(details).from(resumeShares).innerJoin(resumes, eq(resumeShares.resume_id, resumes.id))
    .where(ownsResume(userId, resumeId));
  return share;
}

export async function publishOwnedShare(userId: string, resumeId: string, snapshot: Snapshot) {
  if (!uuid.safeParse(resumeId).success) return undefined;
  return db.transaction(async (tx) => {
    const [resume] = await tx.select({ id: resumes.id }).from(resumes).where(ownsResume(userId, resumeId)).for("update");
    if (!resume) return undefined;
    const [share] = await tx.insert(resumeShares).values({ ...snapshot, resume_id: resume.id, slug: newShareSlug() })
      .onConflictDoNothing({ target: resumeShares.resume_id }).returning(details);
    return share ?? (await tx.select(details).from(resumeShares).where(eq(resumeShares.resume_id, resume.id)))[0];
  });
}

export async function unpublishOwnedShare(userId: string, resumeId: string) {
  if (!uuid.safeParse(resumeId).success) return false;
  const removed = await db.delete(resumeShares).where(eq(resumeShares.resume_id,
    db.select({ id: resumes.id }).from(resumes).where(ownsResume(userId, resumeId)),
  )).returning({ slug: resumeShares.slug });
  return removed.length > 0;
}

export async function getShareAccess(slug: string) {
  if (!isShareSlug(slug)) return undefined;
  const [share] = await db.select({ passwordHash: resumeShares.password_hash }).from(resumeShares).where(eq(resumeShares.slug, slug));
  return share;
}

export async function recordShareView(slug: string, passwordHash: string | null) {
  if (!isShareSlug(slug)) return undefined;
  const [share] = await db.update(resumeShares).set({ views: sql`${resumeShares.views} + 1` }).where(and(
    eq(resumeShares.slug, slug),
    passwordHash === null ? isNull(resumeShares.password_hash) : eq(resumeShares.password_hash, passwordHash),
  )).returning({ content: resumeShares.content, template: resumeShares.template });
  return share;
}
