import { expect, test, type Page } from "@playwright/test";

const RESUME = `Ada Lovelace
ada@example.com · +44 20 7946 0958 · London
Summary
Backend engineer who builds dependable systems and enjoys teaching.
Experience
Senior Engineer — Analytical Engines Ltd
2020 – Present
- Worked on services in Go backed by PostgreSQL
- Built a Kafka pipeline that cut invoice latency by 38%
- Ran the on-call rotation and incident reviews
Education
BSc Mathematics, University of London
Skills
Go, PostgreSQL, Kafka, Docker`;

const JOB = `Senior Backend Engineer at Northwind Payments.
You'll own the payments platform end to end. Requirements: Go, PostgreSQL, Kafka, and experience with incident response.
Nice to have: Kubernetes and mentoring experience. We care about reliability and latency.`;

async function signUp(page: Page) {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  return email;
}

async function onboard(page: Page) {
  await page.getByLabel("API key").fill("AIzaTESTKEY0000wxyz");
  await page.getByRole("button", { name: "Connect key" }).click();
  await expect(page).toHaveURL(/\/onboarding\/resume/);

  await page.getByRole("tab", { name: "Paste text" }).click();
  await page.getByLabel("Resume text").fill(RESUME);
  await page.getByRole("button", { name: "Import text" }).click();
  await expect(page).toHaveURL(/\/onboarding\/review\?resumeId=/);
  await expect(page.getByRole("textbox", { name: "Resume document" })).toContainText("Ada Lovelace");
  await expect(page.getByRole("toolbar", { name: "Formatting" }).getByRole("button", { name: "Bold" })).toBeVisible();
  await page.getByRole("button", { name: "Save as my master resume" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("sign up, tailor a resume, review every change, edit, and download", async ({ page }) => {
  await signUp(page);
  await onboard(page);

  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  await expect(page.getByText("Tailor your first application")).toBeVisible();

  await page.getByRole("link", { name: "New application" }).first().click();
  await page.getByLabel("Job post").fill(JOB);
  await page.getByRole("button", { name: "Tailor resume" }).click();
  await expect(page.getByRole("heading", { name: "Tailoring your resume" })).toBeVisible();

  // Lands in the review once all five stages finish.
  await expect(page).toHaveURL(/\/resumes\/[0-9a-f-]+\?view=review/, { timeout: 60_000 });
  const rail = page.getByRole("complementary");
  await expect(rail.getByText(/to review/)).toBeVisible();
  await expect(page.locator(".rl-hunk")).toHaveCount(4);

  // The new number, the unbacked Kubernetes skill, and the new mentoring claim are all flagged.
  await expect(rail.getByText("Verify")).toHaveCount(3);

  // Focus a flagged change, read its reason and flag, then revert it.
  await rail.getByText(/2M daily transactions/).click();
  await expect(rail.getByText("Ties the work to reliability, a stated priority.")).toBeVisible();
  await expect(rail.getByText(/"2M"|2M/).first()).toBeVisible();
  await rail.getByRole("button", { name: "Revert to original" }).click();
  await expect(page.locator(".rl-hunk")).toHaveCount(3);

  // Keep everything else.
  await rail.getByRole("button", { name: "Keep all" }).click();
  await expect(rail.getByText("Everything reviewed")).toBeVisible();

  // The score tab explains the number.
  await rail.getByRole("tab", { name: /How it/ }).click();
  await expect(rail.getByText("Must-have requirements")).toBeVisible();

  // Edit in place; the change autosaves.
  await page.getByRole("tab", { name: "Edit" }).click();
  const editor = page.getByRole("textbox", { name: "Resume document" });
  await editor.getByText("BSc Mathematics, University of London").click();
  await page.keyboard.press("End");
  await page.keyboard.type(" (First Class)");
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible({ timeout: 15_000 });

  // Compare shows the original next to the tailored version.
  await page.getByRole("tab", { name: "Compare" }).click();
  await expect(page.getByRole("region", { name: "Original resume" })).toContainText("Worked on services in Go");
  await expect(page.getByRole("region", { name: "Tailored resume" })).toContainText("(First Class)");

  // Downloads contain exactly what's on screen.
  for (const [label, ext] of [
    ["PDF", "pdf"],
    ["Word (.docx)", "docx"],
  ] as const) {
    await page.getByRole("button", { name: "Download" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: label }).click();
    expect((await download).suggestedFilename()).toMatch(new RegExp(`\\.${ext}$`));
  }

  // The application shows up on the dashboard with its score change.
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "Senior Backend Engineer" })).toBeVisible();
  await expect(page.getByLabel(/Match score \d+ to \d+/)).toBeVisible();
});

test("a rejected key is explained and nothing is saved", async ({ page }) => {
  await signUp(page);
  await page.getByLabel("API key").fill("AIzaBADKEY");
  await page.getByRole("button", { name: "Connect key" }).click();
  await expect(page.getByText(/Google rejected that key/)).toBeVisible();
  await expect(page).toHaveURL(/\/onboarding$/);
});

test("signed-out visitors are sent to sign in, and unsafe redirects are ignored", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fdashboard/);
  await page.goto("/sign-in?redirect=//evil.example");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
