import { and, count, desc, eq, gt, gte, ilike, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiCalls, auditLog, resumes, scans, sessions, tailoringSessions, users } from "@/lib/db/schema";
import { fillDays, utcDays } from "./metrics";

export const PAGE_SIZE = 25;
type SearchParams = Record<string, string | string[] | undefined>;

export function filter(params: SearchParams, key: string, max = 254) {
  const input = params[key];
  return typeof input === "string" ? input.trim().slice(0, max) : "";
}

export function pageNumber(params: SearchParams) {
  const requested = Number(filter(params, "page", 8));
  return Number.isInteger(requested) && requested > 0 ? Math.min(100_000, requested) : 1;
}

const accountFields = {
  id: users.id,
  email: users.email,
  role: users.role,
  email_verified_at: users.email_verified_at,
  banned_at: users.banned_at,
  created_at: users.created_at,
  last_sign_in_at: users.last_sign_in_at,
};

export async function listUsers(email: string, page: number) {
  const needle = email.replace(/[\\%_]/g, "\\$&");
  const rows = await db.select(accountFields).from(users)
    .where(needle ? ilike(users.email, `%${needle}%`) : undefined)
    .orderBy(desc(users.created_at), desc(users.id))
    .limit(PAGE_SIZE + 1).offset((page - 1) * PAGE_SIZE);
  return { rows: rows.slice(0, PAGE_SIZE), hasNext: rows.length > PAGE_SIZE };
}

export async function getUserDetails(id: string) {
  const [user] = await db.select({ ...accountFields, ban_reason: users.ban_reason }).from(users).where(eq(users.id, id));
  if (!user) return;
  const [[resumeCount], activeSessions, [usage]] = await Promise.all([
    db.select({ count: count() }).from(resumes).where(eq(resumes.user_id, id)),
    db.select({
      createdAt: sessions.created_at, expiresAt: sessions.expires_at, agent: sessions.user_agent,
      total: sql<number>`count(*) over ()`.mapWith(Number),
    }).from(sessions).where(and(eq(sessions.user_id, id), gt(sessions.expires_at, sql`now()`)))
      .orderBy(desc(sessions.created_at), desc(sessions.id)).limit(25),
    db.select({
      calls: count(),
      failures: sql<number>`count(*) filter (where not ${aiCalls.ok})`.mapWith(Number),
      input: sql<number>`coalesce(sum(${aiCalls.tokens_in}), 0)`.mapWith(Number),
      output: sql<number>`coalesce(sum(${aiCalls.tokens_out}), 0)`.mapWith(Number),
    }).from(aiCalls).where(eq(aiCalls.user_id, id)),
  ]);
  return { user, resumeCount: resumeCount.count, activeSessions, usage, sessionCount: activeSessions[0]?.total ?? 0 };
}

const utcDay = (column: typeof users.created_at | typeof aiCalls.at) =>
  sql<string>`to_char(${column} at time zone 'UTC', 'YYYY-MM-DD')`;

export async function overview() {
  const days = utcDays(new Date());
  const start = `${days[0]}T00:00:00.000Z`;
  const userDay = utcDay(users.created_at);
  const scanDay = utcDay(scans.created_at);
  const tailoringDay = utcDay(tailoringSessions.created_at);
  const aiDay = utcDay(aiCalls.at);
  const [[usersSummary], signups, scanCounts, tailoringCounts, calls, failures] = await Promise.all([
    db.select({
      total: count(),
      verified: sql<number>`count(${users.email_verified_at})`.mapWith(Number),
    }).from(users),
    db.select({ day: userDay, count: count() }).from(users)
      .where(gte(users.created_at, start)).groupBy(userDay),
    db.select({ day: scanDay, count: count() }).from(scans)
      .where(gte(scans.created_at, start)).groupBy(scanDay),
    db.select({ day: tailoringDay, count: count() }).from(tailoringSessions)
      .where(gte(tailoringSessions.created_at, start)).groupBy(tailoringDay),
    db.select({ day: aiDay, count: count() }).from(aiCalls)
      .where(gte(aiCalls.at, start)).groupBy(aiDay),
    db.select({ code: aiCalls.error_code, count: count() }).from(aiCalls)
      .where(and(gte(aiCalls.at, start), eq(aiCalls.ok, false)))
      .groupBy(aiCalls.error_code).orderBy(desc(count()), aiCalls.error_code),
  ]);
  return {
    users: usersSummary, signups: fillDays(days, signups), scans: fillDays(days, scanCounts),
    tailorings: fillDays(days, tailoringCounts), calls: fillDays(days, calls), failures,
  };
}

export function recentAiFailures() {
  return db.select({
    id: aiCalls.id, at: aiCalls.at, kind: aiCalls.kind, error: aiCalls.error_code,
    model: aiCalls.model, latency: aiCalls.latency_ms,
  }).from(aiCalls).where(eq(aiCalls.ok, false)).orderBy(desc(aiCalls.at), desc(aiCalls.id)).limit(50);
}

export async function listAudit(params: SearchParams, page: number) {
  const action = filter(params, "action", 100);
  const actor = filter(params, "actor");
  const target = filter(params, "target");
  const [rows, actions] = await Promise.all([
    db.select({
      id: auditLog.id, at: auditLog.at, action: auditLog.action, target: auditLog.target,
      actorId: auditLog.actor_id, email: users.email, meta: auditLog.meta, ip: auditLog.ip,
    }).from(auditLog).leftJoin(users, eq(users.id, auditLog.actor_id))
      .where(and(
        action ? eq(auditLog.action, action) : undefined,
        actor ? eq(users.email, actor) : undefined,
        target ? eq(auditLog.target, target) : undefined,
      ))
      .orderBy(desc(auditLog.at), desc(auditLog.id)).limit(PAGE_SIZE + 1).offset((page - 1) * PAGE_SIZE),
    db.selectDistinct({ action: auditLog.action }).from(auditLog).orderBy(auditLog.action),
  ]);
  return { rows: rows.slice(0, PAGE_SIZE), hasNext: rows.length > PAGE_SIZE, actions };
}

