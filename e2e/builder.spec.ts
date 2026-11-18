import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { extractText, getDocumentProxy } from "unpdf";
import { signUp } from "./auth-helpers";

test("build a master from scratch, switch templates, download a PDF, and toggle career bullets", async ({ page }) => {
  await signUp(page);
  await page.getByLabel("API key").fill("AIzaTESTKEY0000wxyz");
  await page.getByRole("button", { name: "Connect key" }).click();
  await page.getByRole("link", { name: "Build a resume from scratch" }).click();

  const preview = page.getByRole("region", { name: "Live preview" });
  const next = page.getByRole("button", { name: "Next", exact: true });
  await page.getByLabel("Full name").fill("Ada Builder");
  await page.getByLabel("Email", { exact: true }).fill("ada-builder@example.com");
  await page.getByLabel("Location").fill("London");
  await expect(preview.getByText("Ada Builder")).toBeVisible();
  await next.click();
  await page.getByLabel("Target job title").fill("Platform Engineer");
  await next.click();
  await page.getByLabel("Professional summary").fill("I build dependable payment systems.");
  await next.click();
  await page.getByRole("button", { name: "Add role" }).click();
  await page.getByLabel("Job title").fill("Engineer");
  await page.getByLabel("Company").fill("Analytical Engines");
  await page.getByLabel("Describe what you did").fill("Built a Kafka pipeline that reduced invoice latency.");
  await page.getByRole("button", { name: "Suggest with Gemini" }).click();
  await expect(page.getByText("Built a Kafka pipeline that cut invoice latency by [X%]", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Use suggestion" }).click();
  await expect(page.getByText("Fill or remove [X%] in Engineer.")).toBeVisible();
  await next.click();

  await page.getByRole("button", { name: "Add education entry" }).click();
  await page.getByLabel("Degree").fill("BSc Mathematics");
  await page.getByLabel("School").fill("University of London");
  await next.click();
  await page.getByLabel("Skills list").fill("Go, PostgreSQL, Kafka");
  await next.click();
  await page.getByRole("button", { name: "Add project" }).click();
  await page.getByLabel("Project name").fill("Invoice Dashboard");
  await next.click();
  await page.getByRole("button", { name: "Add certification" }).click();
  await page.getByLabel("Certification name").fill("AWS Solutions Architect");

  await page.getByRole("button", { name: "Save master resume" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Replace or delete" })).toBeVisible();
  await page.getByRole("navigation", { name: "Resume steps" }).getByRole("button", { name: "Experience" }).click();
  const bullet = "Built a Kafka pipeline that cut invoice latency by 21%";
  await page.getByLabel("Bullet 1", { exact: true }).fill(bullet);
  await expect(preview.getByText(bullet)).toBeVisible();
  await page.getByRole("navigation", { name: "Resume steps" }).getByRole("button", { name: "Certifications" }).click();
  await page.getByRole("button", { name: "Save master resume" }).click();
  await expect(page).toHaveURL(/\/resumes\/[\da-f-]+$/);
  await expect(page.getByRole("heading", { name: "Ada Builder — Platform Engineer" })).toBeVisible();

  const doc = page.getByRole("textbox", { name: "Resume document" });
  await expect(doc).toContainText(bullet);
  const original = await doc.textContent();
  for (const label of ["Modern", "Standard", "Executive", "Compact", "Classic"]) {
    await page.getByRole("button", { name: /^Template:/ }).click();
    await expect(page.getByRole("radio")).toHaveCount(5);
    await page.getByRole("radio", { name: label }).click();
    await expect(page.getByRole("button", { name: `Template: ${label}` })).toBeVisible();
    expect(await doc.textContent()).toEqual(original);
  }

  await page.getByRole("button", { name: "Download" }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "PDF" }).click();
  const pdf = await downloaded;
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  const { text } = await extractText(await getDocumentProxy(new Uint8Array(await readFile(await pdf.path()))), { mergePages: true });
  for (const expected of ["Ada Builder", bullet, "BSc Mathematics", "Invoice Dashboard", "AWS Solutions Architect"]) {
    expect(text).toContain(expected);
  }

  await page.getByRole("tab", { name: "Career history" }).click();
  const toggle = page.getByRole("checkbox", { name: `Use in this resume: ${bullet}` });
  await expect(toggle).toBeChecked();
  const saved = page.waitForResponse((r) => r.request().method() === "PATCH" && /\/api\/resumes\//.test(r.url()) && r.request().postData()?.includes('"content"') === true);
  await toggle.uncheck();
  await expect(doc).not.toContainText(bullet);
  await expect(toggle).not.toBeChecked();
  expect((await saved).ok()).toBe(true);
  await page.reload();
  await page.getByRole("tab", { name: "Career history" }).click();
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await expect(doc).toContainText(bullet);
});
