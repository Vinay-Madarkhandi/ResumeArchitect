import { mkdirSync } from "node:fs";
import { test, type Page } from "@playwright/test";
import { signUp } from "./auth-helpers";
import { goTo } from "./nav";
import { onboard } from "./onboard";

const DIR = process.env.SHELL_SCREENSHOT_DIR ?? "/tmp/ra-shell";
const WIDTHS = [1440, 1024, 768, 390];
const JOB = `Senior Backend Engineer at Northwind Payments.
You'll own the payments platform end to end. Requirements: Go, PostgreSQL, Kafka, and experience with incident response.
Nice to have: Kubernetes and mentoring experience. We care about reliability and latency.
Apply through Greenhouse at https://boards.greenhouse.io/northwind/jobs/123.`;

test.skip(!process.env.SHELL_SCREENSHOTS, "Set SHELL_SCREENSHOTS=1 to capture the product shell.");
test.setTimeout(240_000);

async function shoot(page: Page, name: string) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${DIR}/${name}-${width}.png`, fullPage: true });
  }
}

test("captures the landing page, dashboard, scanner and match report at four widths", async ({ page }) => {
  mkdirSync(DIR, { recursive: true });
  await page.goto("/");
  await shoot(page, "landing");

  await signUp(page);
  await page.screenshot({ path: `${DIR}/onboarding-connect-1440.png`, fullPage: true });
  await onboard(page);
  await shoot(page, "dashboard-empty");

  await goTo(page, "Scan");
  await shoot(page, "scan");
  await page.getByLabel("Job post").fill(JOB);
  await page.getByRole("button", { name: "Scan", exact: true }).click();
  await page.waitForURL(/\/scan\/[0-9a-f-]+$/);
  await page.getByRole("heading", { name: "Match report" }).waitFor();
  await shoot(page, "match-report");
  await page.getByRole("button", { name: "Track this job" }).click();
  await page.getByRole("link", { name: "In tracker" }).waitFor();

  await goTo(page, "Dashboard");
  await page.getByRole("region", { name: /Active applications/ }).getByRole("link").first().waitFor();
  await shoot(page, "dashboard");

  await page.goto("/resumes");
  await shoot(page, "resumes");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Career tools" }).click();
  await page.screenshot({ path: `${DIR}/nav-career-menu-1440.png`, clip: { x: 0, y: 0, width: 1440, height: 320 } });
  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Menu" }).click();
    await page.screenshot({ path: `${DIR}/nav-menu-open-${width}.png` });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
  await page.goto("/dashboard");
  await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
  await page.screenshot({ path: `${DIR}/dashboard-light-1440.png`, fullPage: true });
});
