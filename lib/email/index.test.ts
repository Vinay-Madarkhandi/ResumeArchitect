import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cache } from "@/lib/cache";
import { sealText } from "@/lib/crypto/keyCipher";
import type { EmailJob } from "@/lib/queue";
import { deliverEmail } from "./index";

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
