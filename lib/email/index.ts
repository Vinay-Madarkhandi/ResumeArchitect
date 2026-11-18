import { Resend } from "resend";
import { cache } from "@/lib/cache";
import { logger } from "@/lib/logger";
import type { EmailJob } from "@/lib/queue";

const escape = (text: string) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

const subjects = {
  verify: "Verify your ResumeArchitect email",
  reset: "Reset your ResumeArchitect password",
  changeEmail: "Confirm your new ResumeArchitect email",
  alert: "ResumeArchitect account alert",
};

export async function deliverEmail(job: EmailJob, id: string) {
  const subject = subjects[job.template];
  const html = job.template === "alert"
    ? `<p>${escape(job.data.message)}</p>`
    : `<p><a href="${escape(job.data.link)}">${subject}</a></p><p>Ignore this email if you didn’t make this request.</p>`;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    await cache().eval(`
      if redis.call('SET', KEYS[2], '1', 'EX', 86400, 'NX') then
        redis.call('LPUSH', KEYS[1], ARGV[1])
        redis.call('LTRIM', KEYS[1], 0, 999)
        redis.call('EXPIRE', KEYS[1], 86400)
      end
    `, 2, "dev:mailbox", `dev:delivered:${id}`, JSON.stringify({ ...job, subject, html }));
    logger.info({ template: job.template, jobId: id }, "Email delivered to dev mailbox");
    return;
  }
  if (!process.env.EMAIL_FROM) throw new Error("EMAIL_FROM is required for Resend");
  const result = await new Resend(key).emails.send({ from: process.env.EMAIL_FROM, to: job.to, subject, html }, { idempotencyKey: id });
  if (result.error) throw new Error(`Resend delivery failed: ${result.error.name}`);
}
