import { afterEach, expect, it, vi } from "vitest";
import type { EmailJob } from "@/lib/queue";
import { sendEmailJob } from "./index";

afterEach(() => vi.unstubAllEnvs());

function failingJob(attemptsMade: number) {
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("EMAIL_FROM", "");
  const job = {
    id: "verify-1", attemptsMade, opts: { attempts: 5 },
    data: { template: "verify", to: "owner@example.com", data: { link: "https://example.com/verify-email?token=secret" } } as EmailJob,
    updateData: async (data: EmailJob) => { job.data = data; },
  };
  return job;
}

it("keeps the link while a failed email will be retried", async () => {
  const job = failingJob(3);
  await expect(sendEmailJob(job)).rejects.toThrow();
  expect(JSON.stringify(job.data)).toContain("token=secret");
});

it("drops the link from an email that has run out of attempts", async () => {
  const job = failingJob(4);
  await expect(sendEmailJob(job)).rejects.toThrow();
  expect(JSON.stringify(job.data)).not.toContain("secret");
  expect(job.data).toMatchObject({ template: "verify", to: "owner@example.com" });
});
