import { randomUUID } from "node:crypto";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import { cache } from "./index";
import { rateLimit } from "./rateLimit";

vi.mock("./index", async () => {
  const { default: Redis } = await import("ioredis-mock");
  const client = new Redis({ port: 16381 });
  return { cache: () => client };
});

afterEach(() => vi.useRealTimers());
afterAll(() => cache().disconnect());

it("bounds concurrent attempts and isolates subjects and scopes", async () => {
  const subject = randomUUID();
  const attempts = await Promise.all(
    Array.from({ length: 6 }, () => rateLimit("sign-in", subject, 5, 900_000)),
  );
  expect(attempts.filter((delay) => delay === 0)).toHaveLength(5);
  expect(attempts.filter((delay) => delay > 0)).toHaveLength(1);
  await expect(rateLimit("sign-in", `${subject}-other`, 5, 900_000)).resolves.toBe(0);
  await expect(rateLimit("reset", subject, 5, 900_000)).resolves.toBe(0);
});

it("frees an attempt at the rolling boundary", async () => {
  // The Redis mock calculates the subsecond part of TIME with hrtime.
  vi.useFakeTimers({ toFake: ["Date", "hrtime"] });
  const start = Date.now();
  const subject = randomUUID();
  await expect(rateLimit("reset", subject, 2, 60_000)).resolves.toBe(0);
  vi.setSystemTime(start + 30_000);
  await expect(rateLimit("reset", subject, 2, 60_000)).resolves.toBe(0);
  await expect(rateLimit("reset", subject, 2, 60_000)).resolves.toBe(30);
  vi.setSystemTime(start + 60_000);
  await expect(rateLimit("reset", subject, 2, 60_000)).resolves.toBe(0);
  await expect(rateLimit("reset", subject, 2, 60_000)).resolves.toBe(30);
});
