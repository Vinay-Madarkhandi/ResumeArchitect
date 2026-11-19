"use server";

import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { notFound, redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { adminActor, lockAdminSession } from "@/lib/admin/authorization";
import { audit, auditExternal } from "@/lib/admin/audit";
import { accountActionError } from "@/lib/admin/policy";
import { operatorQueue, queueNames } from "@/lib/admin/queues";
import { parseUtcTime } from "@/lib/admin/announcement-date";
import { countOtherActiveAdmins, lockAdminMembership } from "@/lib/auth/admin-membership";
import { invalidateLinks, sendAccountLink } from "@/lib/auth/accounts";
import { clearSessionCookie } from "@/lib/auth/current-user";
import { banUser, clearSessionCache, removeSessions } from "@/lib/auth/sessions";
import { deleteAccountRows, finishAccountDeletion } from "@/lib/data/account";
import { announcementLevels } from "@/lib/data/announcements";
import { db } from "@/lib/db";
import { announcements, featureFlags, users } from "@/lib/db/schema";
import { featureDefinitions, type FeatureKey } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";

export type AdminResult = { error?: string; success?: string };

const userCommand = z.object({
  id: z.uuid(),
  command: z.enum(["resend", "ban", "unban", "revoke", "delete", "promote", "demote"]),
  reason: z.string().trim().max(500),
});

const userMessages = {
  ban: "Account suspended and sessions revoked.",
  unban: "Account suspension lifted.",
  revoke: "All sessions revoked.",
  promote: "Administrator role granted.",
  demote: "Administrator role removed.",
};

export async function updateUser(_previous: AdminResult, form: FormData): Promise<AdminResult> {
  const actor = await adminActor();
  const input = userCommand.safeParse({
    id: form.get("id"), command: form.get("command"), reason: form.get("reason") ?? "",
  });
  if (!input.success) return { error: "Invalid account action." };
  const { id, command, reason } = input.data;

  if ((command === "ban" || command === "unban") && !reason) return { error: "Enter a reason." };

  if (command === "resend") {
    try {
      const sent = await auditExternal(actor, "user.resend_verification", id, () => sendAccountLink(id, "verify_email"));
      return sent ? { success: "Verification email queued." } : { error: "Only active, unverified accounts can receive verification links." };
    } catch (error) {
      // Propagate authorization errors from the audit transaction to Next.
      return handleExternalError(error, "Could not queue the verification email.");
    }
  }

  const result = await db.transaction(async (tx) => {
    await lockAdminMembership(tx);
    await lockAdminSession(tx, actor);
    const [target] = await tx.select({
      id: users.id, role: users.role, banned_at: users.banned_at, email_verified_at: users.email_verified_at,
    }).from(users).where(eq(users.id, id)).for("update");
    if (!target) notFound();

    const removingAdmin = target.role === "admin" && ["ban", "delete", "demote"].includes(command);
    const error = accountActionError(command, actor.id, target, removingAdmin ? await countOtherActiveAdmins(tx, id) : 0);
    if (error) return { error };

    let sessions: string[] = [];
    switch (command) {
      case "ban":
        if (target.banned_at) return { error: "This account is already suspended." };
        sessions = await banUser(tx, id, reason);
        await invalidateLinks(tx, id, ["reset_password", "change_email", "sign_in"]);
        break;
      case "unban":
        if (!target.banned_at) return { error: "This account is already active." };
        await tx.update(users).set({ banned_at: null, ban_reason: null }).where(eq(users.id, id));
        break;
      case "revoke":
        sessions = await removeSessions(tx, id);
        break;
      case "delete":
        sessions = await deleteAccountRows(tx, id);
        break;
      case "promote":
      case "demote": {
        const role = command === "promote" ? "admin" : "user";
        if (target.role === role) return { error: `This account already has the ${role} role.` };
        await tx.update(users).set({ role }).where(eq(users.id, id));
        break;
      }
    }
    await audit(tx, actor, `user.${command}`, id, reason ? { reason } : {});
    return { sessions };
  });

  if (result.error) return { error: result.error };
  if (command === "delete") {
    await finishAccountDeletion(id, result.sessions ?? []);
    redirect("/admin/users");
  }
  await clearSessionCache(result.sessions ?? []);
  if (id === actor.id && command === "revoke") {
    await clearSessionCookie();
    redirect("/sign-in");
  }
  refresh();
  return { success: userMessages[command] };
}

const queueCommand = z.object({
  queue: z.enum(queueNames), id: z.string().min(1).max(240), command: z.enum(["retry", "remove"]),
});

export async function updateJob(_previous: AdminResult, form: FormData): Promise<AdminResult> {
  const actor = await adminActor();
  const input = queueCommand.safeParse({ queue: form.get("queue"), id: form.get("id"), command: form.get("command") });
  if (!input.success) return { error: "Invalid job action." };
  const { queue, id, command } = input.data;
  const target = `${queue}/${id}`;
  try {
    const changed = await auditExternal(actor, `queue.${command}`, target, () => db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`resume-architect:job:${target}`}, 0))`);
      await lockAdminSession(tx, actor);
      const job = await operatorQueue(queue).getJob(id);
      if (!job || !await job.isFailed()) return false;
      if (command === "retry") await job.retry("failed", { resetAttemptsMade: true, resetAttemptsStarted: true });
      if (command === "remove") await job.remove({ removeChildren: false });
      return true;
    }));
    refresh();
    return changed ? { success: command === "retry" ? "Job queued for retry." : "Failed job removed." }
      : { error: "This job is no longer failed." };
  } catch (error) {
    return handleExternalError(error, "Could not update the job.");
  }
}

const announcementInput = z.object({
  body: z.string().trim().min(1).max(1000),
  level: z.enum(announcementLevels),
  starts: z.string(),
  ends: z.string(),
});

export async function createAnnouncement(_previous: AdminResult, form: FormData): Promise<AdminResult> {
  const actor = await adminActor();
  const parsed = announcementInput.safeParse({
    body: form.get("body"), level: form.get("level"), starts: form.get("starts"), ends: form.get("ends"),
  });
  if (!parsed.success) return { error: "Enter an announcement and a valid level." };
  const { body, level, starts, ends } = parsed.data;
  const start = starts ? parseUtcTime(starts) : new Date().toISOString();
  const end = ends ? parseUtcTime(ends) : null;
  if (!start || (ends && (!end || end <= start || Date.parse(end) <= Date.now()))) {
    return { error: "Use valid UTC dates and an end time after both the start and the current time." };
  }
  await db.transaction(async (tx) => {
    await lockAdminSession(tx, actor);
    const [row] = await tx.insert(announcements).values({
      body, level, starts_at: start, ends_at: end,
    }).returning({ id: announcements.id });
    await audit(tx, actor, "announcement.create", row.id, { level, startsAt: start, ...(end ? { endsAt: end } : {}) });
  });
  refresh();
  return { success: "Announcement saved." };
}

export async function endAnnouncement(_previous: AdminResult, form: FormData): Promise<AdminResult> {
  const actor = await adminActor();
  const parsed = z.uuid().safeParse(form.get("id"));
  if (!parsed.success) return { error: "Invalid announcement." };
  const ended = await db.transaction(async (tx) => {
    await lockAdminSession(tx, actor);
    const [row] = await tx.update(announcements).set({ ends_at: sql`now()` })
      .where(and(eq(announcements.id, parsed.data), or(isNull(announcements.ends_at), gt(announcements.ends_at, sql`now()`))))
      .returning({ id: announcements.id });
    if (!row) return false;
    await audit(tx, actor, "announcement.end", row.id);
    return true;
  });
  refresh();
  return ended ? { success: "Announcement ended." } : { error: "This announcement has already ended." };
}

export async function toggleFlag(_previous: AdminResult, form: FormData): Promise<AdminResult> {
  const actor = await adminActor();
  const key = z.string().min(1).max(254).refine((value) => !value.includes("\0")).safeParse(form.get("key"));
  const enabled = form.get("enabled");
  if (!key.success || (enabled !== "true" && enabled !== "false")) return { error: "Invalid feature flag." };

  const value = enabled === "true";
  const changed = await db.transaction(async (tx) => {
    await lockAdminSession(tx, actor);
    if (Object.hasOwn(featureDefinitions, key.data)) {
      const note = featureDefinitions[key.data as FeatureKey].note;
      await tx.insert(featureFlags).values({ key: key.data, enabled: value, note }).onConflictDoUpdate({
        target: featureFlags.key, set: { enabled: value },
      });
    } else {
      const [flag] = await tx.update(featureFlags).set({ enabled: value }).where(eq(featureFlags.key, key.data))
        .returning({ key: featureFlags.key });
      if (!flag) return false;
    }
    await audit(tx, actor, "feature_flag.toggle", key.data, { enabled: value });
    return true;
  });
  if (!changed) return { error: "Feature flag not found." };
  refresh();
  return { success: value ? "Feature enabled." : "Feature disabled." };
}

function handleExternalError(error: unknown, message: string): AdminResult {
  unstable_rethrow(error);
  logger.warn(message);
  return { error: message };
}
