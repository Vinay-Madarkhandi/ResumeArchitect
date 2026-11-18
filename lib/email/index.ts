import { Resend } from "resend";
import { cache } from "@/lib/cache";
import { logger } from "@/lib/logger";
import { appUrl } from "@/lib/auth/config";
import { openText, sealText } from "@/lib/crypto/keyCipher";
import { getTrackerDigest } from "@/lib/data/tracker-reminders";
import type { JobType } from "bullmq";
import type { EmailJob } from "@/lib/queue";

const escape = (text: string) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

const subjects = {
  verify: "Verify your ResumeArchitect email",
  reset: "Reset your ResumeArchitect password",
  changeEmail: "Confirm your new ResumeArchitect email",
  signIn: "Your ResumeArchitect sign-in link",
  alert: "ResumeArchitect account alert",
  trackerDigest: "Your job tracker reminders",
};

export async function deliverEmail(job: EmailJob, id: string) {
  const subject = subjects[job.template];
  let to: string;
  let html: string;
  let link: string | undefined;
  if (job.template === "trackerDigest") {
    const { userId, day } = job.data;
    if (day !== new Date().toISOString().slice(0, 10)) return;
    const digest = await getTrackerDigest(userId, day);
    if (!digest) return;
    to = digest.to;
    const items = digest.items.map(({ id, title, company, due }) => {
      const url = new URL(`/tracker?job=${id}`, appUrl()).href;
      const name = escape(company ? `${title} · ${company}` : title);
      return `<li><a href="${escape(url)}">${name}</a> — ${due}</li>`;
    }).join("");
    const settings = escape(new URL("/settings", appUrl()).href);
    html = `<p>Due on ${escape(day)} (UTC)</p><ul>${items}</ul><p><a href="${settings}">Manage reminder emails</a></p>`;
  } else if (job.template === "alert") {
    to = job.to;
    html = `<p>${escape(job.data.message)}</p>`;
  } else {
    to = job.to;
    link = openText(job.data.sealedLink);
    html = `<p><a href="${escape(link)}">${subject}</a></p><p>Ignore this email if you didn’t make this request.</p>`;
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    await cache().eval(`
      if redis.call('SET', KEYS[2], '1', 'EX', 86400, 'NX') then
        redis.call('LPUSH', KEYS[1], ARGV[1])
        redis.call('LTRIM', KEYS[1], 0, 999)
        redis.call('EXPIRE', KEYS[1], 86400)
      end
    `, 2, "dev:mailbox", `dev:delivered:${id}`, JSON.stringify({ template: job.template, to, subject, html, data: link ? { link } : job.data }));
    logger.info({ template: job.template, jobId: id }, "Email delivered to dev mailbox");
    return;
  }
  if (!process.env.EMAIL_FROM) throw new Error("EMAIL_FROM is required for Resend");
  const result = await new Resend(key).emails.send({ from: process.env.EMAIL_FROM, to, subject, html }, { idempotencyKey: id });
  if (result.error) throw new Error(`Resend delivery failed: ${result.error.name}`);
}

// Jobs queued before links were sealed carry them in plaintext.
export type LegacyEmailJob = { template: "verify" | "reset" | "changeEmail" | "signIn"; to: string; data: { link: string } };
type QueuedEmail = { id?: string; data: EmailJob | LegacyEmailJob; updateData(data: EmailJob): Promise<void> };

async function sealLink(job: QueuedEmail) {
  const { data } = job;
  if (!("link" in data.data)) return data as EmailJob;
  const sealed = { ...data, data: { sealedLink: sealText(data.data.link) } } as EmailJob;
  await job.updateData(sealed);
  return sealed;
}

export async function processEmail(job: QueuedEmail) {
  await deliverEmail(await sealLink(job), job.id!);
}

const pending: JobType[] = ["waiting", "prioritized", "delayed", "waiting-children", "failed"];

/** Run at worker startup so no queued job keeps a plaintext link, even one never retried. */
export async function sealQueuedLinks(queue: { getJobs(states: JobType[]): Promise<QueuedEmail[]> }) {
  for (const job of await queue.getJobs(pending)) {
    // Another worker may finish the job first, taking its link with it.
    await sealLink(job).catch(() => logger.warn({ jobId: job.id }, "Could not seal a queued link"));
  }
}
