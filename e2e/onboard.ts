import { expect, type Page } from "@playwright/test";

const RESUME = `Ada Lovelace
ada@example.com · +44 20 7946 0958 · London
Summary
Backend engineer who builds dependable payment systems and enjoys teaching.
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

export async function onboard(page: Page, resumeText = RESUME) {
  await page.getByLabel("API key").fill("AIzaTESTKEY0000wxyz");
  await page.getByRole("button", { name: "Connect key" }).click();
  await expect(page).toHaveURL(/\/onboarding\/resume/);

  await page.getByRole("tab", { name: "Paste text" }).click();
  await page.getByLabel("Resume text").fill(resumeText);
  await page.getByRole("button", { name: "Import text" }).click();
  await expect(page).toHaveURL(/\/onboarding\/review\?resumeId=/);
  await expect(page.getByRole("textbox", { name: "Resume document" })).toContainText("Ada Lovelace");
  await expect(page.getByRole("toolbar", { name: "Formatting" }).getByRole("button", { name: "Bold" })).toBeVisible();
  await page.getByRole("button", { name: "Save as my master resume" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}
