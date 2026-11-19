import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { Document, HeadingLevel, Packer, Paragraph } from "docx";
import { signUp } from "./auth-helpers";
import { onboard } from "./onboard";

const JOB = `Senior Backend Engineer at Northwind Payments.
You'll own the payments platform end to end. Requirements: Go, PostgreSQL, Kafka, and experience with incident response.
Nice to have: Kubernetes and mentoring experience. We care about reliability and latency.
Apply through Greenhouse at https://boards.greenhouse.io/northwind/jobs/123.`;

async function resumeDocx() {
  return Packer.toBuffer(new Document({ sections: [{ children: [
    new Paragraph({ text: "Ada Lovelace", heading: HeadingLevel.HEADING_1 }),
    new Paragraph("ada@example.com · +44 20 7946 0958"),
    new Paragraph({ text: "Experience", heading: HeadingLevel.HEADING_2 }),
    new Paragraph("Built Go services on Postgres for a payments platform."),
    new Paragraph({ text: "Skills", heading: HeadingLevel.HEADING_2 }),
    new Paragraph("Go, Postgres"),
  ] }] }));
}

test("upload a resume, read and act on its match report, and re-open or delete scans", async ({ page }) => {
  await signUp(page);
  await onboard(page);
  await page.getByRole("link", { name: "Scanner" }).click();
  await page.getByRole("radio", { name: "Upload file" }).check();
  await page.getByLabel("Resume file").setInputFiles({
    name: "ada.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: await resumeDocx(),
  });
  await page.getByLabel("Job post").fill(JOB);
  await page.getByRole("button", { name: "Scan", exact: true }).click();
  await expect(page).toHaveURL(/\/scan\/[0-9a-f-]+$/);
  const originalScan = page.url();
  await expect(page.getByRole("heading", { name: "Match report" })).toBeVisible();
  await expect(page.getByText("Target 75%")).toBeVisible();

  for (const name of ["Score breakdown", "Hard skills", "Soft skills", "Other keywords", "Searchability", "Formatting", "Recruiter tips", "Predicted skills", "ATS tips"]) {
    await expect(page.getByRole("region", { name, exact: true })).toBeVisible();
  }
  const hard = page.getByRole("region", { name: "Hard skills" });
  await expect(hard.getByRole("row", { name: /PostgreSQL/ })).toContainText("Synonym");
  await expect(hard.getByRole("row", { name: /Kubernetes/ })).toContainText("Missing");
  await expect(page.getByRole("region", { name: "Searchability" })).toContainText(".docx");
  await expect(page.getByRole("region", { name: "Predicted skills" })).toContainText("Distributed tracing");
  if (process.env.E2E_SCANNER_SCREENSHOTS) await page.screenshot({ path: "/tmp/ra-f2-match-report.png", fullPage: true });

  const downloading = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("match-report.txt");
  expect(await readFile((await download.path())!, "utf8")).toContain("target 75%");

  await page.getByRole("button", { name: "Optimize with AI" }).click();
  await expect(page).toHaveURL(/\/new\?job=.+&resume=.+/);
  await expect(page.getByLabel("Start from").locator("option:checked")).toContainText("ada.docx");
  await page.goto(originalScan);

  await page.getByRole("button", { name: "Edit and re-scan" }).click();
  await expect(page).toHaveURL(/\/resumes\/[0-9a-f-]+\?view=edit&job=/);
  const editUrl = page.url();
  const panel = page.getByRole("region", { name: "Power Edit" });
  const rate = panel.getByTestId("match-rate");
  await expect(rate).toHaveText(/\d+%/);
  const before = Number.parseInt(await rate.innerText());
  const editor = page.getByRole("textbox", { name: "Resume document" });
  const navigations: string[] = [];
  page.on("framenavigated", (frame) => { if (frame === page.mainFrame()) navigations.push(frame.url()); });
  await editor.getByText("Go, Postgres", { exact: true }).click();
  await page.keyboard.press("End");
  await page.keyboard.type(", Kubernetes");
  await expect.poll(async () => Number.parseInt(await rate.innerText())).toBeGreaterThan(before);
  expect(navigations).toEqual([]);
  await expect(page).toHaveURL(editUrl);
  if (process.env.E2E_SCANNER_SCREENSHOTS) {
    await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
    await page.screenshot({ path: "/tmp/ra-f2-power-edit.png" });
  }

  await panel.getByRole("button", { name: "Add to skills: Kafka" }).click();
  await expect(editor.getByText(/Go, Postgres, Kubernetes, Kafka/)).toBeVisible();
  await panel.getByRole("button", { name: "Save a new scan" }).click();
  await expect(page).toHaveURL(/\/scan\/[0-9a-f-]+$/);
  const newerScan = page.url();
  expect(newerScan).not.toBe(originalScan);
  await expect(page.getByRole("region", { name: "Hard skills" }).getByRole("row", { name: /Kafka/ })).toContainText("Found");

  await page.getByRole("button", { name: "Track this job" }).click();
  await page.getByRole("link", { name: "In tracker" }).click();
  const job = page.getByRole("dialog", { name: "Senior Backend Engineer" });
  await expect(job.getByRole("link", { name: /Match report/ })).toBeVisible();
  await job.getByRole("link", { name: "Scan", exact: true }).click();
  await expect(page).toHaveURL(/\/scan\?job=/);
  await expect(page.getByLabel("Job", { exact: true }).locator("option:checked")).toHaveText(/Senior Backend Engineer/);

  await page.getByRole("link", { name: "Scan history" }).click();
  const filter = page.getByRole("searchbox");
  await filter.fill("irrelevant");
  await expect(page.getByText("No scans match that filter.")).toBeVisible();
  await filter.fill("ada.docx");
  const reports = page.getByRole("table").getByRole("link", { name: "Senior Backend Engineer" });
  await expect(reports).toHaveCount(2);
  await reports.first().click();
  await expect(page).toHaveURL(newerScan);
  await page.getByRole("link", { name: "Scan history" }).click();
  await page.getByRole("row").filter({ has: page.getByRole("link", { name: "Senior Backend Engineer" }) }).first().getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete scan" }).click();
  await expect(reports).toHaveCount(1);
  await reports.first().click();
  await expect(page).toHaveURL(originalScan);
});

test("explain a missing Gemini key and still scan a cached posting", async ({ page }) => {
  await signUp(page);
  await onboard(page);
  await page.goto("/scan");
  await page.getByLabel("Job post").fill(JOB);
  await page.getByRole("button", { name: "Scan", exact: true }).click();
  await expect(page).toHaveURL(/\/scan\/[0-9a-f-]+$/);
  const originalScan = page.url();

  await page.goto("/settings");
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText("Key removed.")).toBeVisible();
  await page.goto("/scan");
  await expect(page.getByText(/Reading a new job needs your Gemini key/)).toBeVisible();
  await page.getByLabel("Job post").fill(JOB + "\nThis updated posting also asks for Python.");
  await page.getByRole("button", { name: "Scan", exact: true }).click();
  await expect(page.getByRole("alert").getByRole("link", { name: "Open settings" })).toHaveAttribute("href", "/settings");

  await page.getByRole("link", { name: "Scan history" }).click();
  await page.getByRole("button", { name: "Re-scan" }).click();
  await expect(page).toHaveURL(/\/scan\/[0-9a-f-]+$/);
  expect(page.url()).not.toBe(originalScan);
  await expect(page.getByRole("heading", { name: "Match report" })).toBeVisible();
});

test("upload a real PDF resume through the UI and get a match report", async ({ page }) => {
  await signUp(page);
  await onboard(page);
  await page.getByRole("link", { name: "Scanner" }).click();
  await page.getByRole("radio", { name: "Upload file" }).check();
  const pdfBuffer = await readFile(join(process.cwd(), "lib/report/__fixtures__/valid_pdfs/pdf_photo_plus_real_text.pdf"));
  await page.getByLabel("Resume file").setInputFiles({
    name: "ada_resume.pdf",
    mimeType: "application/pdf",
    buffer: pdfBuffer,
  });
  await page.getByLabel("Job post").fill(JOB);
  await page.getByRole("button", { name: "Scan", exact: true }).click();
  await expect(page).toHaveURL(/\/scan\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Match report" })).toBeVisible();
  await expect(page.getByText("Target 75%")).toBeVisible();
  await expect(page.getByRole("region", { name: "Hard skills" })).toBeVisible();
});

test("import a real PDF as a master resume", async ({ page }) => {
  await signUp(page);
  await page.getByLabel("API key").fill("AIzaTESTKEY0000wxyz");
  await page.getByRole("button", { name: "Connect key" }).click();
  await expect(page).toHaveURL(/\/onboarding\/resume/);

  const pdfBuffer = await readFile(join(process.cwd(), "lib/report/__fixtures__/valid_pdfs/pdf_photo_plus_real_text.pdf"));
  await page.locator("input[type='file']").setInputFiles({
    name: "ada_master.pdf",
    mimeType: "application/pdf",
    buffer: pdfBuffer,
  });
  await expect(page).toHaveURL(/\/onboarding\/review\?resumeId=/, { timeout: 30_000 });
  await expect(page.getByRole("textbox", { name: "Resume document" })).toContainText("Ada Lovelace");
  await page.getByRole("button", { name: "Save as my master resume" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
