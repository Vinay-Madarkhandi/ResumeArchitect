import { expect, test, type Page } from "@playwright/test";
import { signUp } from "./auth-helpers";
import { goTo, openTool } from "./nav";
import { onboard } from "./onboard";

async function noHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
}

/** The visible top-level nav items must share one row. */
async function oneRow(page: Page) {
  const nav = page.getByRole("navigation", { name: "Main" });
  const tops = await nav.locator(":scope > a, :scope > div > button").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
  expect(tops.length).toBeGreaterThanOrEqual(6);
  expect(new Set(tops).size).toBe(1);
  const header = await page.locator("header").first().boundingBox();
  expect(header?.height).toBeLessThanOrEqual(57);
}

test.describe("desktop navigation", () => {
  test("stays on one row, marks the current area, and groups the career tools", async ({ page }) => {
    await signUp(page);
    await onboard(page);
    const nav = page.getByRole("navigation", { name: "Main" });

    for (const width of [1440, 1280, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(nav).toBeVisible();
      await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
      await oneRow(page);
      await noHorizontalScroll(page);
    }
    await page.setViewportSize({ width: 1440, height: 900 });

    await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Admin" })).toHaveCount(0);

    const areas: Array<[Parameters<typeof goTo>[1], RegExp]> = [
      ["Scan", /\/scan$/], ["Resumes", /\/resumes$/], ["Jobs", /\/tracker$/], ["Settings", /\/settings$/], ["Dashboard", /\/dashboard$/],
    ];
    for (const [area, url] of areas) {
      await goTo(page, area);
      await expect(page).toHaveURL(url);
      await expect(nav.getByRole("link", { name: area, exact: true })).toHaveAttribute("aria-current", "page");
      await expect(nav.locator("[aria-current=page]")).toHaveCount(1);
    }

    // Scan history belongs to Scan, and tailoring belongs to Resumes.
    await page.goto("/scans");
    await expect(nav.getByRole("link", { name: "Scan", exact: true })).toHaveAttribute("aria-current", "page");
    await page.goto("/new");
    await expect(nav.getByRole("link", { name: "Resumes", exact: true })).toHaveAttribute("aria-current", "page");
  });

  test("opens the career tools from the keyboard and closes them with Escape", async ({ page }) => {
    await signUp(page);
    await onboard(page);
    const nav = page.getByRole("navigation", { name: "Main" });
    const trigger = nav.getByRole("button", { name: "Career tools" });

    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(nav.getByRole("link", { name: "LinkedIn review" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();

    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await expect(nav.getByRole("link", { name: "LinkedIn review" })).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/interview$/);
    await expect(trigger).toHaveAttribute("data-current", "true");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    await openTool(page, "Cover letter scan");
    await expect(page).toHaveURL(/\/cover-letter$/);
  });
});

for (const [name, width, height] of [["mobile", 390, 844], ["tablet", 768, 1024]] as const) {
  test.describe(`${name} navigation`, () => {
    test.use({ viewport: { width, height } });

    test(`uses a menu at ${width}px`, async ({ page }) => {
      await signUp(page);
      await onboard(page);
      const menu = page.getByRole("button", { name: "Menu" });
      await expect(menu).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
      await noHorizontalScroll(page);

      await menu.click();
      await expect(menu).toHaveAttribute("aria-expanded", "true");
      const nav = page.getByRole("navigation", { name: "Main" });
      for (const label of ["Dashboard", "Scan", "Resumes", "Jobs", "LinkedIn review", "Interview prep", "Cover letter scan", "Settings"]) {
        await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
      }
      await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");

      await page.keyboard.press("Escape");
      await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
      await expect(menu).toBeFocused();

      await goTo(page, "Jobs");
      await expect(page).toHaveURL(/\/tracker$/);
      await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
      await openTool(page, "LinkedIn review");
      await expect(page).toHaveURL(/\/linkedin$/);
      await noHorizontalScroll(page);
    });
  });
}
