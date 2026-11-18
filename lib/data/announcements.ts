import { and, desc, gt, isNull, lte, or, sql } from "drizzle-orm";
import { announcementStatus } from "@/lib/admin/announcement-date";
import { db } from "@/lib/db";
import { announcements } from "@/lib/db/schema";
import { isEnabled } from "@/lib/feature-flags";

export const announcementLevels = ["info", "warning", "maintenance"] as const;
export const dismissalCookie = (userId: string) => `ra_announcements_${userId}`;

export async function activeAnnouncement() {
  if (!await isEnabled("announcements")) return null;

  const [row] = await db.select({
    id: announcements.id, body: announcements.body, level: announcements.level,
  }).from(announcements)
    .where(and(
      lte(announcements.starts_at, sql`now()`),
      or(isNull(announcements.ends_at), gt(announcements.ends_at, sql`now()`)),
    )).orderBy(desc(announcements.starts_at), desc(announcements.id)).limit(1);
  return row ?? null;
}

export async function listAnnouncements(limit: number, offset: number) {
  const rows = await db.select().from(announcements).orderBy(desc(announcements.starts_at), desc(announcements.id))
    .limit(limit).offset(offset);
  const now = Date.now();
  return rows.map((row) => ({ ...row, status: announcementStatus(row, now) }));
}
