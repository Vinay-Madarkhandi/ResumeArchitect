import { expect, test } from "@playwright/test";
import { mailboxLink, signIn, signUp, submitSignUp, verifySignUp } from "./auth-helpers";
import { onboard } from "./onboard";

test("sign-up requires email verification and the link works once", async ({ page }) => {
  const email = await submitSignUp(page);
  await signIn(page, email);
  await expect(page.getByText(/verify your email before signing in/i)).toBeVisible();
  const link = await mailboxLink(email, "verify");
  await verifySignUp(page, link);
  await page.goto(link);
  await expect(page.getByRole("heading", { name: "This link isn't valid" })).toBeVisible();
});

test("sign in and out with a password", async ({ page, context }) => {
  const email = await signUp(page);
  await onboard(page);
  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect((await context.cookies()).some(({ name }) => name === "ra_session")).toBe(false);
  await signIn(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);
  expect((await context.cookies()).find(({ name }) => name === "ra_session")).toMatchObject({
    httpOnly: true, secure: true, sameSite: "Lax", path: "/",
  });
});

test("forgot and reset password revokes the old session and uses the link once", async ({ browser, page }) => {
  const email = await signUp(page);
  const reset = await browser.newPage();
  try {
    await reset.goto("/forgot-password");
    await reset.getByLabel("Email").fill(email);
    await reset.getByRole("button", { name: "Send reset link" }).click();
    await expect(reset.getByRole("heading", { name: "Check your email" })).toBeVisible();

    const link = await mailboxLink(email, "reset");
    const password = "new-correct-horse-battery";
    await reset.goto(link);
    await reset.getByLabel("New password").fill(password);
    await reset.getByRole("button", { name: "Update password" }).click();
    await expect(reset.getByRole("status").filter({ hasText: "Password updated" })).toBeVisible();
    await reset.goto(link);
    await expect(reset.getByRole("heading", { name: "This link has expired" })).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/\/sign-in/);
    await signIn(reset, email, password);
    await expect(reset).toHaveURL(/\/onboarding$/);
  } finally {
    await reset.close();
  }
});

test("sign out everywhere revokes a second active browser session", async ({ browser, page }) => {
  const email = await signUp(page);
  await onboard(page);
  const second = await browser.newPage();
  try {
    await signIn(second, email);
    await expect(second).toHaveURL(/\/dashboard$/);
    await page.getByRole("link", { name: "Settings" }).click();
    await page.getByRole("button", { name: "Sign out everywhere" }).click();
    await expect(page).toHaveURL(/\/$/);
    await second.reload();
    await expect(second).toHaveURL(/\/sign-in/);
  } finally {
    await second.close();
  }
});
