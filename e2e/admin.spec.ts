import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { signIn, signUp } from "./auth-helpers";

test("admin publishes announcements, suspends users, and sees audited actions", async ({ page: user, browser }) => {
  const email = await signUp(user);
  for (const path of ["/admin", "/admin/users", "/admin/ai-calls", "/admin/queues", "/admin/audit", "/admin/announcements", "/admin/feature-flags"]) {
    expect((await user.goto(path))?.status()).toBe(404);
  }
  const admin = await browser.newPage();
  try {
    expect((await admin.goto("/admin"))?.status()).toBe(404);
    const adminEmail = process.env.E2E_ADMIN_EMAIL;
    if (!adminEmail) throw new Error("E2E_ADMIN_EMAIL is required");
    await signUp(admin, adminEmail);
    await admin.goto("/admin");
    await expect(admin.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(admin.getByRole("heading", { name: "Queue health" })).toBeVisible();

    await admin.getByRole("link", { name: "Announcements" }).click();
    const message = `Service update ${randomUUID()}`;
    await admin.getByLabel("Message").fill(message);
    await admin.getByRole("button", { name: "Save announcement" }).click();
    const announcementRow = admin.getByRole("row").filter({ hasText: message });
    await expect(announcementRow.getByText("Active", { exact: true })).toBeVisible();

    await user.goto("/onboarding");
    const banner = user.getByRole("complementary", { name: "Service announcement" });
    await expect(banner).toContainText(message);
    await banner.getByRole("button", { name: "Dismiss announcement" }).click();
    await expect(banner).toHaveCount(0);
    await user.reload();
    await expect(banner).toHaveCount(0);

    await admin.getByRole("link", { name: "Feature flags" }).click();
    await admin.getByRole("button", { name: "Disable", exact: true }).click();
    await expect(admin.getByRole("cell", { name: "Disabled", exact: true })).toBeVisible();
    await expect(admin.getByRole("complementary", { name: "Service announcement" })).toHaveCount(0);
    await admin.getByRole("button", { name: "Enable", exact: true }).click();
    await expect(admin.getByRole("complementary", { name: "Service announcement" })).toContainText(message);

    await admin.getByRole("link", { name: "Announcements" }).click();
    await announcementRow.getByRole("button", { name: "End announcement" }).click();
    await admin.getByRole("dialog").getByRole("button", { name: "End announcement" }).click();
    await expect(announcementRow.getByText("Ended", { exact: true })).toBeVisible();

    await admin.getByRole("link", { name: "Users", exact: true }).click();
    await admin.getByLabel("Search by email").fill(email);
    await admin.getByRole("button", { name: "Search" }).click();
    await admin.getByRole("link", { name: email, exact: true }).click();
    await expect(admin.getByRole("heading", { name: email })).toBeVisible();
    const userDetailsUrl = admin.url();
    expect((await user.goto(userDetailsUrl))?.status()).toBe(404);

    await admin.getByRole("button", { name: "Ban user" }).click();
    const ban = admin.getByRole("dialog", { name: "Ban user" });
    await ban.getByLabel("Reason").fill("Abusive activity confirmed");
    await ban.getByRole("button", { name: "Ban user" }).click();
    await expect(admin.getByText("Suspended", { exact: true })).toBeVisible();
    await expect(admin.getByText("No active sessions.")).toBeVisible();

    await user.goto("/onboarding");
    await expect(user).toHaveURL(/\/sign-in/);
    await signIn(user, email);
    await expect(user.getByText("This account is suspended.")).toBeVisible();

    await admin.getByRole("link", { name: "Audit log" }).click();
    const audit = admin.getByRole("table", { name: "Audit log" });
    const adminEntries = audit.getByRole("row").filter({ hasText: adminEmail });
    await expect(adminEntries.getByText("announcement.create", { exact: true })).toBeVisible();
    await expect(adminEntries.getByText("announcement.end", { exact: true })).toBeVisible();
    await expect(adminEntries.getByText("feature_flag.toggle", { exact: true })).toHaveCount(2);
    await expect(adminEntries.getByText("user.ban", { exact: true })).toBeVisible();
    await admin.getByLabel("Action", { exact: true }).selectOption("user.ban");
    await admin.getByLabel("Actor email").fill(adminEmail);
    await admin.getByRole("button", { name: "Filter" }).click();
    await expect(audit.getByRole("row").filter({ hasText: "Abusive activity confirmed" })).toHaveCount(1);
    await expect(adminEntries.getByText("announcement.create", { exact: true })).toHaveCount(0);
  } finally {
    await admin.close();
  }
});
