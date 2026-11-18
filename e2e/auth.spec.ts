import { expect, test } from "@playwright/test";
import { gotoForm, mailboxLink, queuedEmailsContaining, signIn, signUp, submitSignUp, TEST_PASSWORD, verifySignUp } from "./auth-helpers";
import { onboard } from "./onboard";

test("sign-up requires email verification and the link works once", async ({ page }) => {
  const email = await submitSignUp(page);
  await signIn(page, email);
  await expect(page.getByText(/verify your email before signing in/i)).toBeVisible();
  const link = await mailboxLink(email, "verify");
  await expect.poll(() => queuedEmailsContaining(new URL(link).searchParams.get("token")!)).toBe(0);
  await verifySignUp(page, link);
  await page.goto(link);
  await expect(page.getByRole("heading", { name: "This link isn't valid" })).toBeVisible();
});

test("an inbox owner reclaims an address someone else signed up with first", async ({ browser, page }) => {
  const email = await submitSignUp(page, undefined, "squatter-chosen-password");
  const owner = await browser.newPage();
  try {
    await submitSignUp(owner, email);
    await verifySignUp(owner, await mailboxLink(email, "verify"));

    await signIn(page, email, "squatter-chosen-password");
    await expect(page.getByText("That email and password don't match an account.")).toBeVisible();
    await signIn(page, email);
    await expect(page).toHaveURL(/\/onboarding$/);
  } finally {
    await owner.close();
  }
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

test("an owner whose account is backing off signs in with an emailed link", async ({ browser, page }) => {
  const email = await signUp(page);
  const owner = await browser.newPage();
  try {
    for (let attempt = 1; attempt <= 20; attempt++) {
      await owner.setExtraHTTPHeaders({ "x-forwarded-for": `198.51.100.${attempt}` });
      await signIn(owner, email, "someone-elses-guess");
      await expect(owner.getByText("That email and password don't match an account.")).toBeVisible();
    }
    await owner.setExtraHTTPHeaders({ "x-forwarded-for": "192.0.2.77" });
    await signIn(owner, email);
    await expect(owner.getByText("Too many sign-in attempts.")).toBeVisible();
    await owner.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(owner.getByRole("heading", { name: "Check your email" })).toBeVisible();

    const link = await mailboxLink(email, "signIn");
    await gotoForm(owner, link);
    await owner.getByRole("button", { name: "Sign in" }).click();
    await expect(owner).toHaveURL(/\/onboarding$/);
    await owner.goto(link);
    await expect(owner.getByRole("heading", { name: "This link isn't valid" })).toBeVisible();
  } finally {
    await owner.close();
  }
});

test("forgot and reset password revokes the old session and uses the link once", async ({ browser, page }) => {
  const email = await signUp(page);
  const reset = await browser.newPage();
  try {
    await gotoForm(reset, "/forgot-password");
    await reset.getByLabel("Email").fill(email);
    await reset.getByRole("button", { name: "Send reset link" }).click();
    await expect(reset.getByRole("heading", { name: "Check your email" })).toBeVisible();

    const link = await mailboxLink(email, "reset");
    const password = "new-correct-horse-battery";
    await gotoForm(reset, link);
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

test("settings verify a new email, export data, and delete the account", async ({ page }) => {
  const email = await signUp(page);
  await onboard(page);
  await page.getByRole("link", { name: "Settings" }).click();

  const newEmail = `changed-${email}`;
  const emailForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Change email" }) });
  await emailForm.getByLabel("New email").fill(newEmail);
  await emailForm.getByLabel("Current password").fill(TEST_PASSWORD);
  await emailForm.getByRole("button", { name: "Change email" }).click();
  await expect(page.getByText("Check your new inbox for a verification link.")).toBeVisible();
  await page.goto(await mailboxLink(newEmail, "changeEmail"));
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await signIn(page, newEmail);
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Settings" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download my data" }).click();
  const exportFile = await download;
  const { readFile } = await import("node:fs/promises");
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await readFile((await exportFile.path())!));
  const data = JSON.parse(await zip.file("resume-architect.json")!.async("string"));
  expect(data.account.email).toBe(newEmail);
  expect(data.resumes).toHaveLength(1);
  expect(data.profile).not.toHaveProperty("gemini_key_ciphertext");

  await page.getByRole("button", { name: "Delete my account" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Current password").fill(TEST_PASSWORD);
  await dialog.getByRole("button", { name: "Permanently delete account" }).click();
  await expect(page).toHaveURL(/\/$/);
  await signIn(page, newEmail);
  await expect(page.getByText("That email and password don't match an account.")).toBeVisible();
});
