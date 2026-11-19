import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("leads with the scanner and sends every call to action to sign-up or sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Scan your resume");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("free, on your own key");

    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/sign-up");
    await expect(header.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");

    const main = page.getByRole("main");
    for (const link of await main.getByRole("link", { name: "Scan a resume" }).all()) {
      await expect(link).toHaveAttribute("href", "/sign-up");
    }
    expect(await main.getByRole("link", { name: "Scan a resume" }).count()).toBeGreaterThanOrEqual(2);
    await expect(main.getByRole("link", { name: "Already have one? Sign in" })).toHaveAttribute("href", "/sign-in");

    await page.getByRole("link", { name: "See what the report covers" }).click();
    await expect(page).toHaveURL(/#report$/);
    await expect(page.getByRole("heading", { name: "What a match report tells you." })).toBeInViewport();

    await header.getByRole("link", { name: "Get started" }).click();
    await expect(page).toHaveURL(/\/sign-up$/);
  });

  test("covers each real feature once and states the positioning honestly", async ({ page }) => {
    await page.goto("/");
    for (const [id, title] of [
      ["ats", "ATS identification"], ["power-edit", "Power Edit"], ["builder", "Resume builder, templates and sharing"],
      ["tracker", "Job tracker"], ["clipper", "Browser clipper"], ["linkedin", "LinkedIn review"],
      ["interview", "Interview prep"], ["cover-letter", "Cover letter scanner"],
    ] as const) {
      await expect(page.locator(`section#${id}`).getByRole("heading", { name: title })).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Tailoring that shows its work." })).toBeVisible();

    const text = await page.locator("body").innerText();
    expect(text).toMatch(/no pricing tiers/i);
    expect(text).not.toMatch(/\$\s?\d|per month|\/mo\b|upgrade|premium plan/i);

    const faq = page.locator("#faq");
    await faq.getByText("Where is my data stored?").click();
    await expect(faq).toContainText("Postgres database");
    await faq.getByText("How is my Gemini key stored?").click();
    await expect(faq).toContainText("AES-256-GCM");
  });

  for (const width of [1440, 1024, 768, 390]) {
    test(`fits at ${width}px without sideways scrolling`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      // The page root clips sideways overflow, so look for content that sticks out instead of for a scrollbar.
      const sticksOut = await page.evaluate(() => {
        const contained = (el: Element) => {
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            if (/auto|scroll|hidden/.test(getComputedStyle(p).overflowX)) return true;
          }
          return false;
        };
        return [...document.querySelectorAll("main *, footer *, header *")]
          .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && !contained(el))
          .map((el) => `${el.tagName.toLowerCase()}: ${(el.textContent ?? "").trim().slice(0, 40)}`);
      });
      expect(sticksOut).toEqual([]);
      await expect(page.getByRole("banner").getByRole("link", { name: "Get started" })).toBeVisible();
    });
  }
});
