import { expect, test } from "@playwright/test";
import { signUp } from "./auth-helpers";
import { onboard } from "./onboard";

test("publish a private-by-default link, hide contact, count views, require a password, and unpublish", async ({ page, browser, baseURL }) => {
  await signUp(page);
  await onboard(page, `Ada Lovelace
ada@example.com | +44 20 7946 0958 | London
Call at my home studio
Sorted product samples at 12 Baker Street and organized deliveries.
Wrote public docs; contact via linkedin.com/in/ada.`);
  await page.getByRole("link", { name: /Ada Lovelace/ }).first().click();
  await expect(page).toHaveURL(/\/resumes\//);
  await page.getByRole("button", { name: "Template: Classic" }).click();
  await page.getByRole("radio", { name: "Executive" }).click();

  await page.getByRole("button", { name: "Share resume" }).click();
  const dialog = page.getByRole("dialog", { name: "Share resume" });
  await dialog.getByRole("checkbox", { name: "Hide contact details" }).check();
  await dialog.getByRole("checkbox", { name: "Call at my home studio" }).check();
  const preview = dialog.getByRole("region", { name: "Public preview" });
  const previewBody = await preview.locator("[data-template]").innerText();
  await expect(preview).toContainText("organized deliveries");
  await expect(preview).not.toContainText(/ada@example.com|home studio|Baker Street|linkedin.com/);
  await dialog.getByRole("button", { name: "Publish resume" }).click();
  const link = dialog.getByRole("link", { name: "Open shared resume" });
  await expect(link).toHaveAttribute("href", /^\/r\/[\w-]{43}$/);
  const publicPath = (await link.getAttribute("href"))!;

  const guest = await browser.newPage({ baseURL });
  try {
    const response = await guest.goto(publicPath);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    expect(response?.headers()["cache-control"]).toContain("no-store");
    const paper = guest.getByRole("main", { name: "Shared resume" });
    await expect(paper.getByRole("heading", { name: "Ada Lovelace" })).toBeVisible();
    await expect(paper.locator("[data-template]")).toHaveAttribute("data-template", "executive");
    await expect(paper).not.toContainText("ada@example.com");
    await expect(paper).not.toContainText(/7946|Baker Street|linkedin.com|home studio/);
    expect(await paper.locator("[data-template]").innerText()).toBe(previewBody);
    await guest.reload();
    expect((await guest.context().cookies()).some((cookie) => cookie.name === "ra_session")).toBe(false);

    await dialog.getByRole("button", { name: "Close" }).click();
    await page.getByRole("button", { name: "Share resume" }).click();
    await expect(dialog.getByText("1 view · Anyone with the link")).toBeVisible();
    const anotherVisitor = await guest.request.get(publicPath, { headers: { "user-agent": "Independent share visitor" } });
    expect(anotherVisitor.ok()).toBe(true);
    await dialog.getByRole("button", { name: "Close" }).click();
    await page.getByRole("button", { name: "Share resume" }).click();
    await expect(dialog.getByText("2 views · Anyone with the link")).toBeVisible();
    await dialog.getByRole("button", { name: "Unpublish", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Publish resume" })).toBeVisible();
    expect((await guest.reload())?.status()).toBe(404);

    await dialog.getByRole("checkbox", { name: "Hide contact details" }).uncheck();
    await dialog.getByLabel("Link password").fill("read-my-resume-please");
    await dialog.getByRole("button", { name: "Publish resume" }).click();
    await expect(link).toBeVisible();
    const protectedPath = (await link.getAttribute("href"))!;
    expect(protectedPath).not.toBe(publicPath);
    const locked = await guest.goto(protectedPath);
    await expect(guest.getByRole("heading", { name: "Protected resume" })).toBeVisible();
    expect(await locked?.text()).not.toContain("Ada Lovelace");
    await guest.getByLabel("Password").fill("wrong-password");
    await guest.getByRole("button", { name: "View resume" }).click();
    await expect(guest.getByText("Incorrect password.")).toBeVisible();
    await guest.getByLabel("Password").fill("read-my-resume-please");
    await guest.getByRole("button", { name: "View resume" }).click();
    await expect(paper.getByText(/ada@example.com/)).toBeVisible();
    await guest.reload();
    await expect(paper.getByRole("heading", { name: "Ada Lovelace" })).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await page.getByRole("button", { name: "Share resume" }).click();
    await expect(dialog.getByText("1 view · Password protected")).toBeVisible();

    await dialog.getByRole("button", { name: "Unpublish", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Publish resume" })).toBeVisible();
    expect((await guest.reload())?.status()).toBe(404);
  } finally {
    await guest.close();
  }
});
