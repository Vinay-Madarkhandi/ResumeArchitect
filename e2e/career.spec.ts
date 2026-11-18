import { expect, test } from "@playwright/test";
import { signUp } from "./auth-helpers";
import { onboard } from "./onboard";

const JOB = `Senior Backend Engineer at Northwind Payments.
Own the payments platform end to end. Requirements: Go, PostgreSQL, Kafka, and incident response.
Nice to have: Kubernetes and mentoring experience. We care about reliability and latency.`;

test.beforeEach(async ({ page }) => {
  await signUp(page);
  await onboard(page);
});

test("reviews LinkedIn keywords and saves resume-grounded suggestions", async ({ page }) => {
  await page.getByRole("link", { name: "LinkedIn review" }).click();
  await page.getByLabel("Headline").fill("Backend Engineer | Go and PostgreSQL");
  await page.getByLabel("About", { exact: true }).fill("I work on payments and reliability.");
  await page.getByLabel("Experience").fill("Built a Kafka pipeline that cut invoice latency by 38%.");
  await page.getByLabel("Skills", { exact: true }).fill("Go, PostgreSQL");
  await page.getByLabel("Profile URL").fill("linkedin.com/in/ada-lovelace");
  await page.getByRole("radio", { name: "Role title" }).check();
  await page.getByLabel("Role", { exact: true }).fill("Backend Engineer");
  await page.getByRole("button", { name: "Review profile" }).click();

  await expect(page).toHaveURL(/\/linkedin\/[0-9a-f-]+$/);
  await expect(page.getByRole("region", { name: "Profile checks" })).toContainText("Uses a clean, custom address.");
  const keywords = page.getByRole("region", { name: "Keyword match" });
  await expect(keywords.getByRole("listitem").filter({ hasText: "Kafka" })).toContainText("Found:");
  await expect(keywords.getByRole("listitem").filter({ hasText: "Kubernetes" })).toContainText("Missing:");
  await page.getByRole("button", { name: "Suggest headline and About" }).click();
  await expect(page.getByRole("heading", { name: "Headlines" })).toBeVisible();
  await expect(page.getByText(/I build dependable backend services/)).toContainText("cut invoice latency by 38%");

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "LinkedIn review" }).click();
  await page.getByRole("region", { name: /Past reviews/ }).getByRole("link", { name: /Backend Engineer/ }).click();
  await expect(page.getByRole("button", { name: "Write new drafts" })).toBeVisible();
});

test("practices all three interview question types and saves answer feedback", async ({ page }) => {
  await page.getByRole("link", { name: "Interview prep" }).click();
  await page.getByRole("textbox", { name: "Job post" }).fill(JOB);
  await page.getByRole("button", { name: "Write questions" }).click();

  await expect(page).toHaveURL(/\/interview\/[0-9a-f-]+$/);
  for (const category of ["Behavioral", "Technical", "Role-specific"]) {
    await expect(page.getByRole("region", { name: new RegExp(category) })).toBeVisible();
  }
  const question = page.getByRole("article", { name: /measure the effect of your Kafka pipeline/ });
  await expect(question).toContainText("Measurement and a fair baseline.");
  const answer = "When invoice processing slowed, I owned the fix. I built a Kafka pipeline and cut invoice latency by 38%.";
  await question.getByLabel("Your answer").fill(answer);
  await question.getByRole("button", { name: "Get feedback" }).click();
  await expect(question.getByText("Explain how you measured invoice latency.")).toBeVisible();
  const rubric = page.getByRole("complementary", { name: "How answers are scored" });
  for (const label of ["STAR structure", "Specificity", "Relevance"]) await expect(rubric).toContainText(label);

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Interview prep" }).click();
  const saved = page.getByRole("region", { name: /Practice sessions/ }).getByRole("link", { name: /Senior Backend Engineer/ });
  await expect(saved).toContainText("1 answer");
  await saved.click();
  await expect(question.getByLabel("Your answer")).toHaveValue(answer);
  await expect(question.getByText("Explain how you measured invoice latency.")).toBeVisible();
});

test("scans a pasted letter and scores the current draft from the generator", async ({ page }) => {
  await page.getByRole("link", { name: "Cover letter scan" }).click();
  await page.getByLabel("Cover letter").fill(
    "Dear Hiring Manager,\n\nI am applying for Senior Backend Engineer at Northwind Payments. I am a team player who built a Kafka pipeline that cut latency by 38%.",
  );
  await page.getByRole("textbox", { name: "Job post" }).fill(JOB);
  await page.getByRole("button", { name: "Scan letter" }).click();
  await expect(page).toHaveURL(/\/cover-letter\/[0-9a-f-]+$/);
  const checks = page.getByRole("region", { name: "Letter checks" });
  await expect(checks).toContainText("Mentions Northwind Payments.");
  await expect(checks).toContainText("Backs at least one claim with a number.");
  await expect(checks).toContainText(/Aim for 250–400/);
  await expect(page.locator("del", { hasText: "team player" })).toBeVisible();
  const keywords = page.getByRole("region", { name: "Keyword match" });
  await expect(keywords.getByRole("listitem").filter({ hasText: "Kafka" })).toContainText("Found:");
  await expect(keywords.getByRole("listitem").filter({ hasText: "Kubernetes" })).toContainText("Missing:");

  await page.getByRole("link", { name: "New application" }).click();
  await page.getByRole("textbox", { name: "Job post" }).fill(JOB);
  await page.getByRole("button", { name: "Tailor resume" }).click();
  await expect(page).toHaveURL(/\/resumes\/[0-9a-f-]+\?view=review/, { timeout: 60_000 });
  await page.getByRole("tab", { name: "Cover letter" }).click();
  await page.getByRole("button", { name: "Write cover letter" }).click();
  const letter = page.getByLabel("Cover letter");
  await expect(letter).toHaveValue(/Dear Hiring Manager/);
  await letter.fill((await letter.inputValue()) + "\n\nHere is a fresh edit.");
  await page.getByRole("button", { name: "Scan letter" }).click();
  await expect(page.getByRole("region", { name: /The letter/ })).toContainText("Here is a fresh edit.");
  await expect(page.getByRole("link", { name: "Edit the letter" })).toHaveAttribute("href", /\/resumes\/.+\?view=letter$/);

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Cover letter scan" }).click();
  const application = page.getByLabel("Application", { exact: true });
  await expect(application).toBeVisible();
  await page.getByRole("button", { name: "Use the letter saved with this application" }).click();
  await expect(page.getByLabel("Cover letter")).toHaveValue(/Dear Hiring Manager/);
  await expect(page.getByRole("region", { name: /Past scans/ }).getByRole("link")).toHaveCount(2);
});

test("explains which career tools need a Gemini key", async ({ page }) => {
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText("Key removed.")).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("link", { name: "LinkedIn review" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Connect a Gemini key" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Role title" })).toBeDisabled();
  await page.getByLabel("Headline").fill("Backend Engineer");
  await page.getByRole("button", { name: "Review profile" }).click();
  await expect(page.getByRole("heading", { name: "Profile review" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Suggest headline and About" })).toBeDisabled();

  await nav.getByRole("link", { name: "Interview prep" }).click();
  await expect(page.getByRole("link", { name: "Open settings" })).toHaveAttribute("href", "/settings");
  await expect(page.getByRole("button", { name: "Write questions" })).toBeDisabled();

  await nav.getByRole("link", { name: "Cover letter scan" }).click();
  await expect(page.getByRole("status").filter({ hasText: "scan against a pasted job post" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Paste a job post" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Scan letter" })).toBeDisabled();
});
