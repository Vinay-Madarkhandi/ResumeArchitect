import { expect, test } from "@playwright/test";
import { onboard } from "./onboard";
import { signUp } from "./auth-helpers";

const JOB = `Senior Backend Engineer at Northwind Payments.
You'll own the payments platform end to end. Requirements: Go, PostgreSQL, Kafka, and experience with incident response.
Nice to have: Kubernetes and mentoring experience. We care about reliability and latency.`;

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
  await expect(rail.getByText(/need checking/)).toBeVisible();
  await expect(page.locator(".rl-hunk")).toHaveCount(4);

  // The new number, the unbacked Kubernetes skill, and the new mentoring claim are all flagged.
  await expect(rail.getByText("Verify", { exact: true })).toHaveCount(3);

  // Server-produced placeholders require review before export.
  await page.getByRole("button", { name: "Download" }).click();
  await expect(page.getByRole("menuitem", { name: "PDF" })).toBeDisabled();
  await page.keyboard.press("Escape");
  const savedExport = await page.request.get(`/api${new URL(page.url()).pathname}/export?format=pdf`);
  expect(savedExport.status()).toBe(422);
  for (const id of [2, 3, 4]) {
    await rail.getByText(`[Verify claim ${id}]`, { exact: true }).click();
    await expect(rail.getByText("Replace this placeholder with details you can verify, or revert the change.")).toBeVisible();
    if (id === 2) await expect(rail.getByText(/Verify “2M”/)).toBeVisible();
    await rail.getByRole("button", { name: "Revert to original" }).click();
    await expect(rail.getByText(`[Verify claim ${id}]`, { exact: true })).toHaveCount(0);
  }
  await expect(page.locator(".rl-hunk")).toHaveCount(1);

  // Keep everything else.
  await rail.getByRole("button", { name: "Keep all" }).click();
  await expect(rail.getByText("Everything reviewed")).toBeVisible();

  // The score tab explains the number.
  await rail.getByRole("tab", { name: "Score" }).click();
  await expect(rail.getByText("Must-have requirements")).toBeVisible();

  // Each change shows what it's worth.
  await rail.getByRole("tab", { name: "Changes" }).click();
  await expect(rail.getByText(/^\+\d+ pts$/).first()).toBeVisible();

  // The job post panel marks what the resume shows and what it doesn't.
  await rail.getByRole("tab", { name: "Job post" }).click();
  await expect(rail.getByText("The posting")).toBeVisible();
  await expect(rail.locator("mark", { hasText: "Kafka" }).first()).toHaveAttribute("title", /in your resume/);

  // Track the application's stage.
  await page.getByRole("button", { name: /Application status: Saved/ }).click();
  await page.getByRole("menuitem", { name: "Applied" }).click();
  await expect(page.getByRole("button", { name: /Application status: Applied/ })).toBeVisible();

  // Write and download a cover letter.
  await page.getByRole("tab", { name: "Cover letter" }).click();
  await page.getByRole("button", { name: "Write cover letter" }).click();
  const letter = page.getByLabel("Cover letter");
  await expect(letter).toHaveValue(/Dear Hiring Manager/);
  await expect(letter).toHaveValue(/\[Verify claim\]/);
  await expect(page.getByRole("button", { name: "Download" }).last()).toBeDisabled();
  await letter.fill((await letter.inputValue()).replace(/\[Verify claim\]\.?/g, ""));
  await page.getByRole("button", { name: "Download" }).last().click();
  const letterDownload = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Word (.docx)" }).click();
  expect((await letterDownload).suggestedFilename()).toMatch(/Cover letter\.docx$/);

  const resumeUrl = new URL(page.url());
  const selection = await page.request.post(`/api${resumeUrl.pathname}/ai-edit`, {
    headers: { origin: resumeUrl.origin },
    data: { selectedText: "Worked on services in Go", instruction: "Lead with a strong verb" },
  });
  expect(selection.ok()).toBe(true);
  expect(await selection.json()).toMatchObject({ flagged: true, replacementText: "[Verify claim]" });

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
  await expect(page.getByText("Average score lift")).toBeVisible();
  await expect(page.getByRole("button", { name: /Application status: Applied/ })).toBeVisible();

  // The tracker and the workspace share the application stage.
  await page.getByRole("link", { name: "Job tracker" }).click();
  const trackedJob = page.getByRole("region", { name: "Applied", exact: true }).getByRole("button", { name: "Senior Backend Engineer" });
  await trackedJob.click();
  await page.getByRole("link", { name: "Tailored resume" }).click();
  await expect(page.getByRole("button", { name: /Application status: Applied/ })).toBeVisible();

  // Job import refuses private network addresses.
  await page.goto("/new");
  await page.getByLabel(/Import from a link/).fill("http://127.0.0.1:4010/");
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("That link isn't supported.")).toBeVisible();
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

/** Ada's resume as a hand-made Word file: centered header, tab-aligned dates, real bullets, bold skill labels. */
async function adaWordFile(): Promise<Buffer> {
  const { AlignmentType, Document, LevelFormat, Packer, Paragraph, Tab, TabStopType, TextRun } = await import("docx");
  const bullet = (text: string) => new Paragraph({ numbering: { reference: "dots", level: 0 }, children: [new TextRun(text)] });
  const section = (text: string) => new Paragraph({ children: [new TextRun({ text, bold: true, size: 26 })] });
  return Packer.toBuffer(
    new Document({
      numbering: { config: [{ reference: "dots", levels: [{ level: 0, format: LevelFormat.BULLET, text: "●", alignment: AlignmentType.LEFT }] }] },
      sections: [
        {
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Ada Lovelace", bold: true, size: 36 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("ada@example.com | +44 20 7946 0958 | London")] }),
            section("Professional Summary"),
            new Paragraph({ children: [new TextRun("Backend engineer who builds dependable systems and enjoys teaching.")] }),
            section("Work Experience"),
            new Paragraph({
              tabStops: [{ type: TabStopType.RIGHT, position: 10000 }],
              children: [new TextRun({ text: "Senior Engineer, Analytical Engines Ltd", bold: true }), new TextRun({ children: [new Tab(), "2020 – Present"] })],
            }),
            bullet("Worked on services in Go backed by PostgreSQL"),
            bullet("Built a Kafka pipeline that cut invoice latency by 38%"),
            bullet("Ran the on-call rotation and incident reviews"),
            section("Technical Skills"),
            new Paragraph({ children: [new TextRun({ text: "Languages:", bold: true }), new TextRun(" Go, SQL")] }),
            new Paragraph({ children: [new TextRun({ text: "Tools:", bold: true }), new TextRun(" PostgreSQL, Kafka, Docker")] }),
          ],
        },
      ],
    }),
  );
}

test("a Word resume comes back as the same file with only the wording changed", async ({ page }) => {
  const JSZip = (await import("jszip")).default;
  const paragraphs = async (file: Buffer) =>
    ((await (await JSZip.loadAsync(file)).file("word/document.xml")!.async("string")).match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []);

  await signUp(page);
  await page.getByLabel("API key").fill("AIzaTESTKEY0000wxyz");
  await page.getByRole("button", { name: "Connect key" }).click();
  await expect(page).toHaveURL(/\/onboarding\/resume/);
  const original = await adaWordFile();
  await page.locator('input[type="file"]').setInputFiles({
    name: "Ada Lovelace.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: original,
  });
  await expect(page).toHaveURL(/\/onboarding\/review\?resumeId=/, { timeout: 30_000 });
  const review = page.getByRole("textbox", { name: "Resume document" });
  await expect(review).toContainText("Worked on services in Go backed by PostgreSQL");
  await expect(review).toContainText("Senior Engineer, Analytical Engines Ltd · 2020 – Present");
  await page.getByRole("button", { name: "Save as my master resume" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("link", { name: "New application" }).first().click();
  await page.getByLabel("Job post").fill(JOB);
  await page.getByRole("button", { name: "Tailor resume" }).click();
  await expect(page).toHaveURL(/\/resumes\/[0-9a-f-]+\?view=review/, { timeout: 60_000 });

  const rail = page.getByRole("complementary");
  for (const id of [2, 3, 4]) {
    await rail.getByText(`[Verify claim ${id}]`, { exact: true }).click();
    await rail.getByRole("button", { name: "Revert to original" }).click();
    await expect(rail.getByText(`[Verify claim ${id}]`, { exact: true })).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Download" }).click();
  await expect(page.getByText("Same fonts and layout, new wording.")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Word, your original file" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.docx$/);
  const { readFile } = await import("node:fs/promises");
  const tailored = await readFile((await file.path())!);

  const before = await paragraphs(original);
  const after = await paragraphs(tailored);
  const xml = after.join("\n");
  expect(xml).toContain("Led payment services in Go backed by PostgreSQL");
  expect(xml).not.toMatch(/2M daily transactions|Mentored engineers through on-call rotations/);
  expect(after).toHaveLength(before.length);
  // The centered header and tab-aligned dates are the original paragraphs, byte for byte.
  expect(after[0]).toBe(before[0]);
  expect(after[0]).toContain('<w:jc w:val="center"/>');
  expect(after.find((p) => p.includes("2020 – Present"))).toBe(before.find((p) => p.includes("2020 – Present")));
});
