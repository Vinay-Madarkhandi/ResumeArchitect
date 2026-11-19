import { expect, test } from "@playwright/test";
import { signUp } from "./auth-helpers";
import { goTo } from "./nav";
import { onboard } from "./onboard";

const JOB = `Senior Backend Engineer at Northwind Payments.
You'll own the payments platform end to end. Requirements: Go, PostgreSQL, Kafka, and experience with incident response.
Nice to have: Kubernetes and mentoring experience. We care about reliability and latency.`;

test("a new account sees the scanner first and is taught what to do next", async ({ page }) => {
  await signUp(page);
  await onboard(page);

  await expect(page.getByRole("heading", { level: 1, name: "Scan a resume against a job" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start a scan" })).toHaveAttribute("href", "/scan");

  const steps = page.getByRole("list").filter({ hasText: "Run your first scan" });
  await expect(steps.getByText("Gemini key connected")).toBeVisible();
  await expect(steps.getByText("Resume added")).toBeVisible();
  await expect(steps.getByRole("listitem").filter({ hasText: "Run your first scan" })).toHaveAttribute("aria-current", "step");

  await expect(page.getByRole("region", { name: "Recent scans" })).toContainText("Your match reports will collect here");
  await expect(page.getByRole("region", { name: /Active applications/ })).toContainText("Track the jobs you're going after");
  await expect(page.getByRole("region", { name: /^Resumes/ })).toContainText("Master resume");
  const tools = page.getByRole("region", { name: "Career tools" });
  for (const name of ["LinkedIn review", "Interview prep", "Cover letter scan", "Browser clipper"]) {
    await expect(tools.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  }
});

test("an account without a key is walked to Settings to connect one", async ({ page }) => {
  await signUp(page);
  await page.getByRole("link", { name: "Start with my resume instead" }).click();
  await expect(page).toHaveURL(/\/onboarding\/resume/);
  await page.getByRole("tab", { name: "Paste text" }).click();
  await page.getByLabel("Resume text").fill(`Ada Lovelace
ada@example.com · +44 20 7946 0958 · London
Experience
Senior Engineer, Analytical Engines Ltd
- Built a Kafka pipeline that cut invoice latency by 38%
Education
BSc Mathematics, University of London
Skills
Go, PostgreSQL, Kafka`);
  await page.getByRole("button", { name: "Import text" }).click();
  await expect(page).toHaveURL(/\/onboarding\/review\?resumeId=/);
  await page.getByRole("button", { name: "Save as my master resume" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  const steps = page.getByRole("list").filter({ hasText: "Connect your Gemini key" });
  await expect(steps.getByRole("listitem").filter({ hasText: "Connect your Gemini key" })).toHaveAttribute("aria-current", "step");
  await steps.getByRole("link", { name: "Connect a key" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByLabel("API key")).toBeVisible();
});

test("after a scan the dashboard shows it with its match rate and the tracked job", async ({ page }) => {
  await signUp(page);
  await onboard(page);

  await goTo(page, "Scan");
  await page.getByLabel("Job post").fill(JOB);
  await page.getByRole("button", { name: "Scan", exact: true }).click();
  await expect(page).toHaveURL(/\/scan\/[0-9a-f-]+$/);
  const report = page.url();
  await page.getByRole("button", { name: "Track this job" }).click();
  await expect(page.getByRole("link", { name: "In tracker" })).toBeVisible();

  await goTo(page, "Dashboard");
  await expect(page.getByText("Get ready to scan")).toHaveCount(0);
  const recent = page.getByRole("region", { name: "Recent scans" });
  await expect(recent.getByRole("link", { name: /Senior Backend Engineer/ })).toHaveAttribute("href", new URL(report).pathname);
  await expect(recent.getByLabel(/Match rate \d+ percent/)).toBeVisible();
  const active = page.getByRole("region", { name: /Active applications/ });
  await expect(active).toContainText("Senior Backend Engineer");
  await expect(active.getByText("Saved", { exact: true })).toBeVisible();
  await active.getByRole("link", { name: /Senior Backend Engineer/ }).click();
  await expect(page).toHaveURL(/\/tracker\?job=/);
});
