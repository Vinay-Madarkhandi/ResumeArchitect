import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import Redis from "ioredis";

export const TEST_PASSWORD = "correct-horse-battery";

export async function mailboxLink(email: string, template: "verify" | "reset" | "changeEmail") {
  const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:16379");
  let link: string | undefined;
  try {
    await expect.poll(async () => {
      const entries = await redis.lrange("dev:mailbox", 0, 999);
      const message = entries.map((entry) => JSON.parse(entry)).find((entry) => entry.to === email && entry.template === template);
      link = message?.data?.link;
      return Boolean(link);
    }, { timeout: 20_000 }).toBe(true);
  } finally {
    await redis.quit();
  }
  if (!link) throw new Error("Verification or reset mail was missing");
  return link;
}

export async function submitSignUp(page: Page, requestedEmail?: string) {
  const unique = randomUUID();
  const email = requestedEmail ?? `e2e-${unique}@example.com`;
  // The loopback Next server receives synthetic client addresses so each
  // Playwright user has an independent production-sized sign-up limit.
  const address = `2001:db8:${unique.split("-").slice(1, 4).join(":")}::1`;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": address });
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  return email;
}

export async function verifySignUp(page: Page, link: string) {
  await page.goto(link);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}

export async function signUp(page: Page, requestedEmail?: string) {
  const email = await submitSignUp(page, requestedEmail);
  await verifySignUp(page, await mailboxLink(email, "verify"));
  return email;
}

export async function signIn(page: Page, email: string, password = TEST_PASSWORD) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
