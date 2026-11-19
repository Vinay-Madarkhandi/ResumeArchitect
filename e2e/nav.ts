import { expect, type Page } from "@playwright/test";

export type Area = "Dashboard" | "Scan" | "Resumes" | "Jobs" | "Settings" | "Admin";
export type Tool = "LinkedIn review" | "Interview prep" | "Cover letter scan";

/** The main navigation, opening the mobile menu first when the viewport uses it. */
async function mainNav(page: Page) {
  const menu = page.getByRole("button", { name: "Menu" });
  if (await menu.isVisible()) {
    if ((await menu.getAttribute("aria-expanded")) !== "true") await menu.click();
  }
  return page.getByRole("navigation", { name: "Main" });
}

export async function goTo(page: Page, area: Area) {
  await (await mainNav(page)).getByRole("link", { name: area, exact: true }).click();
}

export async function openTool(page: Page, tool: Tool) {
  const nav = await mainNav(page);
  const trigger = nav.getByRole("button", { name: "Career tools" });
  if (await trigger.isVisible()) await trigger.click();
  await nav.getByRole("link", { name: new RegExp(`^${tool}`) }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}
