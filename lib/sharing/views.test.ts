import { randomUUID } from "node:crypto";
import { afterAll, expect, it, vi } from "vitest";
import { cache } from "@/lib/cache";
import { claimShareView, SHARE_VIEWS_PER_IP_PER_MINUTE } from "./views";

vi.mock("@/lib/cache", async () => {
  const { default: Redis } = await import("ioredis-mock");
  const redis = new Redis({ port: 16387 });
  return { cache: () => redis };
});

afterAll(() => cache().disconnect());

it("claims one concurrent view per visitor per share and UTC day", async () => {
  const slug = randomUUID();
  const visitor = { ip: "192.0.2.1", userAgent: "Desktop 1" };
  const day = Date.UTC(2026, 6, 1);
  const attempts = await Promise.all(Array.from({ length: 8 }, () => claimShareView(slug, visitor, day)));
  expect(attempts.filter(Boolean)).toHaveLength(1);
  expect(await claimShareView(slug, { ...visitor, userAgent: "Desktop 2" }, day)).toBe(true);
  expect(await claimShareView(randomUUID(), visitor, day)).toBe(true);
  expect(await claimShareView(slug, visitor, day + 86_400_000)).toBe(true);
  expect((await cache().keys("share-view:*")).join(" ")).not.toMatch(/192\.0\.2\.1|Desktop/);
});

it("limits attempts from one IP even as the agent or share changes", async () => {
  const attempts = await Promise.all(Array.from({ length: SHARE_VIEWS_PER_IP_PER_MINUTE + 3 }, (_, i) =>
    claimShareView(randomUUID(), { ip: "192.0.2.2", userAgent: `Client ${i}` }),
  ));
  expect(attempts.filter(Boolean)).toHaveLength(SHARE_VIEWS_PER_IP_PER_MINUTE);
});
