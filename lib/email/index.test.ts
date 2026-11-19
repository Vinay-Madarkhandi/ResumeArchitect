import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cache } from "@/lib/cache";
import { sealText } from "@/lib/crypto/keyCipher";
import type { EmailJob } from "@/lib/queue";
import { deliverEmail, processEmail, sealQueuedLinks, type LegacyEmailJob } from "./index";

vi.mock("@/lib/cache", async () => {
  const { default: Redis } = await import("ioredis-mock");
  const client = new Redis({ port: 16383 });
  return { cache: () => client };
});

const link = "https://example.com/verify-email?token=secret";
beforeEach(() => vi.stubEnv("KEY_ENCRYPTION_SECRET", Buffer.alloc(32, 9).toString("base64")));
afterEach(() => vi.unstubAllEnvs());

const verifyJob = (): EmailJob => ({ template: "verify", to: "owner@example.com", data: { sealedLink: sealText(link) } });

it("opens the sealed link only when the email is sent", async () => {
  vi.stubEnv("RESEND_API_KEY", "");
  const job = verifyJob();
  expect(JSON.stringify(job)).not.toContain("secret");
  await deliverEmail(job, "verify-1");
  const [entry] = (await cache().lrange("dev:mailbox", 0, 0)).map((item) => JSON.parse(item));
  expect(entry).toMatchObject({ template: "verify", to: "owner@example.com", data: { link } });
  expect(entry.html).toContain(link);
});

it("leaves only the sealed link behind when delivery fails", async () => {
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("EMAIL_FROM", "");
  const job = verifyJob();
  const stored = JSON.stringify(job);
  await expect(deliverEmail(job, "verify-2")).rejects.toThrow();
  expect(JSON.stringify(job)).toBe(stored);
  expect(stored).not.toContain("secret");
});

it("cannot be opened without the server key", async () => {
  const job = verifyJob();
  vi.stubEnv("KEY_ENCRYPTION_SECRET", Buffer.alloc(32, 1).toString("base64"));
  vi.stubEnv("RESEND_API_KEY", "");
  await expect(deliverEmail(job, "verify-3")).rejects.toThrow();
});

describe("jobs queued before links were sealed", () => {
  const legacyJob = (id: string) => {
    const job = {
      id, data: { template: "verify", to: "owner@example.com", data: { link } } as EmailJob | LegacyEmailJob,
      updateData: async (data: EmailJob) => { job.data = data; },
    };
    return job;
  };

  it("delivers the link and leaves only its sealed form in the job", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const job = legacyJob("legacy-1");
    await processEmail(job);
    const [entry] = (await cache().lrange("dev:mailbox", 0, 0)).map((item) => JSON.parse(item));
    expect(entry).toMatchObject({ template: "verify", to: "owner@example.com", data: { link } });
    expect(JSON.stringify(job.data)).not.toContain("secret");
  });

  it("drops the plaintext even when delivery fails", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "");
    const job = legacyJob("legacy-2");
    await expect(processEmail(job)).rejects.toThrow();
    expect(JSON.stringify(job.data)).not.toContain("secret");
  });

  it("are sealed at startup whether waiting, delayed or failed", async () => {
    const queued = { waiting: legacyJob("a"), delayed: legacyJob("b"), failed: legacyJob("c") };
    await sealQueuedLinks({
      getJobs: async (states: string[]) => Object.entries(queued).filter(([state]) => states.includes(state)).map(([, job]) => job),
    });
    expect(JSON.stringify(Object.values(queued).map((job) => job.data))).not.toContain("secret");
    vi.stubEnv("RESEND_API_KEY", "");
    await deliverEmail(queued.failed.data as EmailJob, "legacy-3");
    const [entry] = (await cache().lrange("dev:mailbox", 0, 0)).map((item) => JSON.parse(item));
    expect(entry.data).toEqual({ link });
  });
});
